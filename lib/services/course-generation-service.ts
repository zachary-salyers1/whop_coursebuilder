import { db } from '../db/client';
import {
  courseGenerations,
  courseModules,
  courseChapters,
  courseLessons,
  pdfUploads,
  usageEvents,
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { AIService } from './ai-service';
import { PDFService } from './pdf-service';
import { WhopAPIService } from './whop-api-service';
import { SubscriptionService } from './subscription-service';
import type {
  GenerateCourseRequest,
  GenerateCourseResponse,
  CourseGenerationResult,
  CourseStructure,
} from '../types/domain';

export class CourseGenerationService {
  /**
   * Start generation - creates record and returns immediately
   * Use processGenerationBackground() separately with after() for actual processing
   */
  static async startGeneration(
    request: GenerateCourseRequest
  ): Promise<GenerateCourseResponse> {
    try {
      // 1. Check usage limits
      const usageCheck = await SubscriptionService.checkUsageLimit(
        request.userId
      );

      // 2. Get user's subscription
      const subscription = await SubscriptionService.getOrCreateSubscription(
        request.userId
      );

      // 3. Create generation record
      const [generation] = await db
        .insert(courseGenerations)
        .values({
          userId: request.userId,
          subscriptionId: subscription.id,
          pdfUploadId: request.pdfUploadId,
          courseTitle: request.customTitle || 'Untitled Course',
          status: 'processing',
          generationType: usageCheck.isOverage ? 'overage' : 'included',
          overageCharge: usageCheck.isOverage ? String(usageCheck.overageCost) : '0.00',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // 4. Increment usage
      await SubscriptionService.incrementUsage(request.userId, generation.id);

      // 5. Log start event
      await db.insert(usageEvents).values({
        userId: request.userId,
        generationId: generation.id,
        eventType: 'generation_started',
        metadata: {
          pdfUploadId: request.pdfUploadId,
          isOverage: usageCheck.isOverage,
        },
        createdAt: new Date(),
      });

      return {
        generationId: generation.id,
        status: 'processing',
        estimatedTimeSeconds: 120, // ~2 minutes estimate
        message: 'Course generation started',
      };
    } catch (error) {
      console.error('Start Generation Error:', error);
      throw new Error(
        `Failed to start course generation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Legacy method for backwards compatibility
   */
  static async generateCourse(
    request: GenerateCourseRequest
  ): Promise<GenerateCourseResponse> {
    const result = await this.startGeneration(request);
    // Start background processing (fire and forget for legacy callers)
    this.processGenerationBackground(result.generationId, request.pdfUploadId).catch((error) => {
      console.error('Background generation error:', error);
    });
    return result;
  }

  /**
   * Process course generation - call this with after() for serverless background execution
   */
  static async processGenerationBackground(
    generationId: string,
    pdfUploadId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Get PDF upload record
      const [pdfUpload] = await db
        .select()
        .from(pdfUploads)
        .where(eq(pdfUploads.id, pdfUploadId));

      if (!pdfUpload) {
        throw new Error('PDF upload not found');
      }

      // 2. Ensure PDF text is extracted
      let pdfText = pdfUpload.rawText;

      if (!pdfText) {
        console.log('PDF text not found, extracting from URL:', pdfUpload.fileUrl);
        try {
          pdfText = await PDFService.processPDF(pdfUploadId);
          console.log('PDF text extracted, length:', pdfText?.length || 0);
        } catch (extractError) {
          console.error('PDF extraction failed:', extractError);
          throw extractError;
        }
      }

      if (!pdfText) {
        throw new Error('Failed to extract text from PDF');
      }

      // 3. Analyze PDF structure with AI
      const analysis = await AIService.analyzePDF({
        pdfText,
        filename: pdfUpload.filename,
      });

      // 4. Generate full content with AI
      const content = await AIService.generateContent({
        structure: analysis,
        pdfText,
        tone: 'professional',
      });

      // 5. Save course structure to database
      const courseStructure: CourseStructure = {
        title: content.courseTitle,
        description: content.courseDescription,
        modules: content.modules.map((module, mIdx) => ({
          title: module.title,
          description: module.description,
          order: mIdx,
          chapters: module.chapters.map((chapter, cIdx) => ({
            title: chapter.title,
            description: chapter.description,
            learningObjectives: chapter.learningObjectives,
            order: cIdx,
            lessons: chapter.lessons.map((lesson, lIdx) => ({
              title: lesson.title,
              content: lesson.content,
              lessonType: 'text' as const,
              order: lIdx,
              estimatedMinutes: lesson.estimatedMinutes,
            })),
          })),
        })),
      };

      // 6. Save to database
      await this.saveCourseStructure(generationId, courseStructure);

      // 7. Update generation record
      const generationTime = Date.now() - startTime;

      await db
        .update(courseGenerations)
        .set({
          status: 'completed',
          structureJson: courseStructure as any,
          aiTokensUsed: AIService.estimateTokens(pdfText),
          generationTimeMs: generationTime,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(courseGenerations.id, generationId));

      // 8. Log completion event
      await db.insert(usageEvents).values({
        userId: pdfUpload.userId,
        generationId,
        eventType: 'generation_completed',
        metadata: {
          generationTimeMs: generationTime,
          moduleCount: courseStructure.modules.length,
        },
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Process Generation Error:', error);

      // Update generation status to failed
      await db
        .update(courseGenerations)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(courseGenerations.id, generationId));

      // Log failure event
      const [generation] = await db
        .select()
        .from(courseGenerations)
        .where(eq(courseGenerations.id, generationId));

      if (generation) {
        await db.insert(usageEvents).values({
          userId: generation.userId,
          generationId,
          eventType: 'generation_failed',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          createdAt: new Date(),
        });
      }

      throw error;
    }
  }

  /**
   * Save generated course structure to database
   */
  private static async saveCourseStructure(
    generationId: string,
    structure: CourseStructure
  ): Promise<void> {
    for (const moduleData of structure.modules) {
      // Create module
      const [module] = await db
        .insert(courseModules)
        .values({
          generationId,
          title: moduleData.title,
          description: moduleData.description,
          orderIndex: moduleData.order,
          createdAt: new Date(),
        })
        .returning();

      for (const chapterData of moduleData.chapters) {
        // Create chapter
        const [chapter] = await db
          .insert(courseChapters)
          .values({
            moduleId: module.id,
            title: chapterData.title,
            description: chapterData.description,
            learningObjectives: chapterData.learningObjectives,
            orderIndex: chapterData.order,
            createdAt: new Date(),
          })
          .returning();

        for (const lessonData of chapterData.lessons) {
          // Create lesson
          await db.insert(courseLessons).values({
            chapterId: chapter.id,
            title: lessonData.title,
            content: lessonData.content,
            lessonType: lessonData.lessonType,
            orderIndex: lessonData.order,
            estimatedMinutes: lessonData.estimatedMinutes,
            createdAt: new Date(),
          });
        }
      }
    }
  }

  /**
   * Get course generation by ID with full structure
   */
  static async getGeneration(generationId: string) {
    const [generation] = await db
      .select()
      .from(courseGenerations)
      .where(eq(courseGenerations.id, generationId));

    if (!generation) {
      return null;
    }

    // Get modules with chapters and lessons
    const modules = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.generationId, generationId))
      .orderBy(courseModules.orderIndex);

    const fullModules = await Promise.all(
      modules.map(async (module) => {
        const chapters = await db
          .select()
          .from(courseChapters)
          .where(eq(courseChapters.moduleId, module.id))
          .orderBy(courseChapters.orderIndex);

        const fullChapters = await Promise.all(
          chapters.map(async (chapter) => {
            const lessons = await db
              .select()
              .from(courseLessons)
              .where(eq(courseLessons.chapterId, chapter.id))
              .orderBy(courseLessons.orderIndex);

            return { ...chapter, lessons };
          })
        );

        return { ...module, chapters: fullChapters };
      })
    );

    return {
      ...generation,
      modules: fullModules,
    };
  }

  /**
   * Publish generated course to Whop
   */
  static async publishToWhop(
    generationId: string,
    companyId: string
  ): Promise<CourseGenerationResult> {
    try {
      const generation = await this.getGeneration(generationId);

      if (!generation) {
        throw new Error('Generation not found');
      }

      if (generation.status !== 'completed') {
        throw new Error('Generation is not completed yet');
      }

      if (!generation.structureJson) {
        throw new Error('No course structure available');
      }

      const structure = generation.structureJson as unknown as CourseStructure;

      // Publish to Whop
      const result = await WhopAPIService.publishCourse(companyId, structure);

      // Get or create a product for this course
      console.log('Listing existing products...');
      const products = await WhopAPIService.listProducts(companyId);

      let productId: string;

      if (products.length > 0) {
        // Use the first existing product
        productId = products[0].id;
        console.log('Using existing product:', productId);
      } else {
        // Create a new product if none exist
        // Product title has a 30 character limit, so truncate if necessary
        const productTitle = structure.title.length > 30
          ? structure.title.substring(0, 27) + '...'
          : structure.title;
        console.log('No existing products found. Creating product:', productTitle);
        productId = await WhopAPIService.createProduct(
          companyId,
          productTitle
        );
      }

      // Attach the experience to the product
      console.log('Attaching experience to product:', { experienceId: result.experienceId, productId });
      await WhopAPIService.attachExperienceToProduct(result.experienceId, productId);

      // Update generation record with Whop IDs
      await db
        .update(courseGenerations)
        .set({
          status: 'published',
          whopExperienceId: result.experienceId,
          updatedAt: new Date(),
        })
        .where(eq(courseGenerations.id, generationId));

      // Update modules, chapters, and lessons with Whop IDs
      const modules = await db
        .select()
        .from(courseModules)
        .where(eq(courseModules.generationId, generationId))
        .orderBy(courseModules.orderIndex);

      for (const mapping of result.moduleIdMappings) {
        const module = modules[mapping.moduleIndex];
        if (!module) continue;

        // Update module with Whop course ID
        await db
          .update(courseModules)
          .set({ whopCourseId: mapping.whopCourseId })
          .where(eq(courseModules.id, module.id));

        // Get chapters for this module
        const chapters = await db
          .select()
          .from(courseChapters)
          .where(eq(courseChapters.moduleId, module.id))
          .orderBy(courseChapters.orderIndex);

        for (const chapterMapping of mapping.chapterMappings) {
          const chapter = chapters[chapterMapping.chapterIndex];
          if (!chapter) continue;

          // Update chapter with Whop chapter ID
          await db
            .update(courseChapters)
            .set({ whopChapterId: chapterMapping.whopChapterId })
            .where(eq(courseChapters.id, chapter.id));

          // Get lessons for this chapter
          const lessons = await db
            .select()
            .from(courseLessons)
            .where(eq(courseLessons.chapterId, chapter.id))
            .orderBy(courseLessons.orderIndex);

          for (const lessonMapping of chapterMapping.lessonMappings) {
            const lesson = lessons[lessonMapping.lessonIndex];
            if (!lesson) continue;

            // Update lesson with Whop lesson ID
            await db
              .update(courseLessons)
              .set({ whopLessonId: lessonMapping.whopLessonId })
              .where(eq(courseLessons.id, lesson.id));
          }
        }
      }

      // Log publish event
      await db.insert(usageEvents).values({
        userId: generation.userId,
        generationId,
        eventType: 'course_published',
        metadata: {
          experienceId: result.experienceId,
          modulesCreated: result.modulesCreated,
          chaptersCreated: result.chaptersCreated,
          lessonsCreated: result.lessonsCreated,
        },
        createdAt: new Date(),
      });

      return {
        success: true,
        generationId,
        whopExperienceId: result.experienceId,
        whopCourseUrl: result.courseUrl,
        structure,
        wasOverage: generation.generationType === 'overage',
        overageCharge: generation.generationType === 'overage' ? Number(generation.overageCharge) : undefined,
      };
    } catch (error) {
      console.error('Publish to Whop Error:', error);
      throw new Error(
        `Failed to publish course to Whop: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add generated content to an existing Whop course
   */
  static async addToExistingCourse(
    generationId: string,
    courseId: string
  ): Promise<CourseGenerationResult> {
    try {
      const generation = await this.getGeneration(generationId);

      if (!generation) {
        throw new Error('Generation not found');
      }

      if (generation.status !== 'completed') {
        throw new Error('Generation is not completed yet');
      }

      if (!generation.structureJson) {
        throw new Error('No course structure available');
      }

      const structure = generation.structureJson as unknown as CourseStructure;

      // Get course details to find the experience ID
      const courseDetails = await WhopAPIService.getCourse(courseId);
      const experienceId = courseDetails.experience_id || courseId;
      console.log('Course details:', { courseId, experienceId, hasExperience: !!courseDetails.experience_id });

      // Add content to existing course
      const result = await WhopAPIService.addContentToExistingCourse(courseId, structure);

      // Update generation record with the experience ID (or course ID as fallback)
      await db
        .update(courseGenerations)
        .set({
          status: 'published',
          whopExperienceId: experienceId,
          updatedAt: new Date(),
        })
        .where(eq(courseGenerations.id, generationId));

      // Get all modules for this generation
      const modules = await db
        .select()
        .from(courseModules)
        .where(eq(courseModules.generationId, generationId))
        .orderBy(courseModules.orderIndex);

      // Track overall chapter index across all modules
      let globalChapterIndex = 0;

      // Update chapters and lessons with Whop IDs
      for (const module of modules) {
        // Get chapters for this module
        const chapters = await db
          .select()
          .from(courseChapters)
          .where(eq(courseChapters.moduleId, module.id))
          .orderBy(courseChapters.orderIndex);

        for (const chapter of chapters) {
          // Find the corresponding mapping by global index
          const chapterMapping = result.chapterMappings.find(
            m => m.chapterIndex === globalChapterIndex
          );

          if (chapterMapping) {
            // Update chapter with Whop ID
            await db
              .update(courseChapters)
              .set({ whopChapterId: chapterMapping.whopChapterId })
              .where(eq(courseChapters.id, chapter.id));

            // Update lessons with Whop IDs
            const lessons = await db
              .select()
              .from(courseLessons)
              .where(eq(courseLessons.chapterId, chapter.id))
              .orderBy(courseLessons.orderIndex);

            for (let i = 0; i < lessons.length; i++) {
              const lessonMapping = chapterMapping.lessonMappings.find(
                m => m.lessonIndex === i
              );

              if (lessonMapping) {
                await db
                  .update(courseLessons)
                  .set({ whopLessonId: lessonMapping.whopLessonId })
                  .where(eq(courseLessons.id, lessons[i].id));
              }
            }
          }

          globalChapterIndex++;
        }
      }

      // Log usage event
      await db.insert(usageEvents).values({
        userId: generation.userId,
        generationId: generation.id,
        eventType: 'course_published',
        metadata: { courseId, experienceId },
        createdAt: new Date(),
      });

      return {
        success: true,
        generationId,
        whopExperienceId: experienceId,
        whopCourseUrl: `https://whop.com/courses/${courseId}`,
        structure,
        wasOverage: generation.generationType === 'overage',
        overageCharge: generation.generationType === 'overage' ? Number(generation.overageCharge) : undefined,
      };
    } catch (error) {
      console.error('Add to Existing Course Error:', error);
      throw new Error(
        `Failed to add content to course: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
