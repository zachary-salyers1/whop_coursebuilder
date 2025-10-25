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
   * Main orchestration function: Generate course from PDF
   */
  static async generateCourse(
    request: GenerateCourseRequest
  ): Promise<GenerateCourseResponse> {
    const startTime = Date.now();

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

      // 6. Start async processing (don't await)
      this.processGeneration(generation.id, request.pdfUploadId).catch((error) => {
        console.error('Background generation error:', error);
      });

      return {
        generationId: generation.id,
        status: 'processing',
        estimatedTimeSeconds: 120, // ~2 minutes estimate
        message: 'Course generation started',
      };
    } catch (error) {
      console.error('Generate Course Error:', error);
      throw new Error(
        `Failed to start course generation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process course generation in the background
   */
  private static async processGeneration(
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

      // Update generation with Whop IDs
      await db
        .update(courseGenerations)
        .set({
          whopExperienceId: result.experienceId,
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(courseGenerations.id, generationId));

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
        overageCharge: Number(generation.overageCharge),
      };
    } catch (error) {
      console.error('Publish to Whop Error:', error);
      throw new Error(
        `Failed to publish course to Whop: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
