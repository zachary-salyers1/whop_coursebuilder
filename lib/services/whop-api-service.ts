import { whopSdk } from '../whop-sdk';
import type { CourseStructure } from '../types/domain';
import { marked } from 'marked';

// Configure marked for better output
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

/**
 * Convert markdown content to HTML for Whop
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  return marked.parse(markdown) as string;
}

interface WhopCourse {
  id: string;
  title: string;
  description?: string;
}

interface WhopSection {
  id: string;
  title: string;
  description?: string;
}

interface WhopLesson {
  id: string;
  title: string;
  content?: string;
}

export class WhopAPIService {
  /**
   * Get course details by ID
   */
  static async getCourse(courseId: string): Promise<any> {
    try {
      console.log('Fetching course:', courseId);

      const response = await fetch(`https://api.whop.com/api/v1/courses/${courseId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Get course failed:', response.status, error);
        throw new Error(`Failed to get course: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Course retrieved:', data);
      return data;
    } catch (error) {
      console.error('Get Course Error:', error);
      throw error;
    }
  }

  /**
   * List all courses for a company
   */
  static async listCourses(companyId: string): Promise<any[]> {
    try {
      console.log('Listing courses for company:', companyId);

      const response = await fetch(`https://api.whop.com/api/v1/courses?company_id=${companyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('List courses failed:', response.status, error);
        throw new Error(`Failed to list courses: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Courses retrieved:', data);
      return data.data || [];
    } catch (error) {
      console.error('List Courses Error:', error);
      throw error;
    }
  }

  /**
   * Create experience (course container) in Whop
   */
  static async createExperience(
    companyId: string,
    title: string,
    description: string
  ): Promise<string> {
    try {
      const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
      if (!appId) {
        throw new Error('WHOP_APP_ID environment variable is not set');
      }

      console.log('Creating experience with:', { companyId, title, appId });

      const response = await fetch('https://api.whop.com/api/v1/experiences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: appId,
          company_id: companyId,
          name: title,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Experience creation failed:', response.status, error);
        throw new Error(`Failed to create experience: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Experience created:', data);
      return data.id;
    } catch (error) {
      console.error('Create Experience Error:', error);
      throw error;
    }
  }

  /**
   * Create a course (module) within an experience
   */
  static async createCourse(
    experienceId: string,
    title: string,
    description: string,
    orderIndex: number
  ): Promise<string> {
    try {
      console.log('Creating course with:', { experienceId, title });

      const response = await fetch('https://api.whop.com/api/v1/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experience_id: experienceId,
          title: title,
          tagline: description.substring(0, 100),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Course creation failed:', response.status, error);
        throw new Error(`Failed to create course: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Course created:', data);
      return data.id;
    } catch (error) {
      console.error('Create Course Error:', error);
      throw error;
    }
  }

  /**
   * Create a chapter within a course
   */
  static async createChapter(
    courseId: string,
    title: string,
    description: string,
    orderIndex: number
  ): Promise<string> {
    try {
      console.log('Creating chapter with:', { courseId, title });

      const response = await fetch('https://api.whop.com/api/v1/course_chapters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: courseId,
          title: title,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Chapter creation failed:', response.status, error);
        throw new Error(`Failed to create chapter: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Chapter created:', data);
      return data.id;
    } catch (error) {
      console.error('Create Chapter Error:', error);
      throw error;
    }
  }

  /**
   * Create a lesson within a chapter
   */
  static async createLesson(
    chapterId: string,
    title: string,
    content: string,
    orderIndex: number
  ): Promise<string> {
    try {
      console.log('Creating lesson with:', { chapterId, title });

      // Convert markdown to HTML for proper rendering in Whop
      const htmlContent = markdownToHtml(content);

      const response = await fetch('https://api.whop.com/api/v1/course_lessons', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapter_id: chapterId,
          lesson_type: 'text',
          title: title,
          content: htmlContent,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Lesson creation failed:', response.status, error);
        throw new Error(`Failed to create lesson: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Lesson created:', data);
      return data.id;
    } catch (error) {
      console.error('Create Lesson Error:', error);
      throw error;
    }
  }

  /**
   * Add chapters and lessons to an existing course
   */
  static async addContentToExistingCourse(
    courseId: string,
    structure: CourseStructure
  ): Promise<{
    courseId: string;
    chaptersCreated: number;
    lessonsCreated: number;
    chapterMappings: Array<{
      chapterIndex: number;
      whopChapterId: string;
      lessonMappings: Array<{
        lessonIndex: number;
        whopLessonId: string;
      }>;
    }>;
  }> {
    try {
      console.log('Adding content to existing course:', courseId);

      let totalChapters = 0;
      let totalLessons = 0;
      const chapterMappings = [];

      // For each module in the structure, add chapters and lessons to the existing course
      for (const module of structure.modules) {
        for (let chapterIndex = 0; chapterIndex < module.chapters.length; chapterIndex++) {
          const chapter = module.chapters[chapterIndex];

          // Create chapter
          const chapterId = await this.createChapter(
            courseId,
            chapter.title,
            chapter.description,
            chapter.order
          );
          console.log(`  Created chapter: ${chapter.title}`);
          totalChapters++;

          const lessonMappings = [];

          // Create lessons within the chapter
          for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
            const lesson = chapter.lessons[lessonIndex];
            const lessonId = await this.createLesson(
              chapterId,
              lesson.title,
              lesson.content,
              lesson.order
            );
            console.log(`    Created lesson: ${lesson.title}`);
            totalLessons++;

            lessonMappings.push({
              lessonIndex,
              whopLessonId: lessonId,
            });
          }

          chapterMappings.push({
            chapterIndex,
            whopChapterId: chapterId,
            lessonMappings,
          });
        }
      }

      return {
        courseId,
        chaptersCreated: totalChapters,
        lessonsCreated: totalLessons,
        chapterMappings,
      };
    } catch (error) {
      console.error('Add Content to Course Error:', error);
      throw new Error(
        `Failed to add content to course: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Publish complete course structure to Whop
   */
  static async publishCourse(
    companyId: string,
    structure: CourseStructure
  ): Promise<{
    experienceId: string;
    courseUrl: string;
    modulesCreated: number;
    chaptersCreated: number;
    lessonsCreated: number;
    moduleIdMappings: Array<{
      moduleIndex: number;
      whopCourseId: string;
      chapterMappings: Array<{
        chapterIndex: number;
        whopChapterId: string;
        lessonMappings: Array<{
          lessonIndex: number;
          whopLessonId: string;
        }>;
      }>;
    }>;
  }> {
    try {
      console.log('Publishing course to Whop for company:', companyId);

      // 1. Create Experience (course container)
      const experienceId = await this.createExperience(
        companyId,
        structure.title,
        structure.description
      );
      console.log('Created experience:', experienceId);

      let totalModules = 0;
      let totalChapters = 0;
      let totalLessons = 0;
      const moduleIdMappings = [];

      // 2. Create Modules (courses in Whop)
      for (let moduleIndex = 0; moduleIndex < structure.modules.length; moduleIndex++) {
        const module = structure.modules[moduleIndex];
        const courseId = await this.createCourse(
          experienceId,
          module.title,
          module.description,
          module.order
        );
        console.log(`Created course (module): ${module.title}`);
        totalModules++;

        const chapterMappings = [];

        // 3. Create Chapters
        for (let chapterIndex = 0; chapterIndex < module.chapters.length; chapterIndex++) {
          const chapter = module.chapters[chapterIndex];
          const chapterId = await this.createChapter(
            courseId,
            chapter.title,
            chapter.description,
            chapter.order
          );
          console.log(`  Created chapter: ${chapter.title}`);
          totalChapters++;

          const lessonMappings = [];

          // 4. Create Lessons
          for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
            const lesson = chapter.lessons[lessonIndex];
            const lessonId = await this.createLesson(
              chapterId,
              lesson.title,
              lesson.content,
              lesson.order
            );
            console.log(`    Created lesson: ${lesson.title}`);
            totalLessons++;

            lessonMappings.push({
              lessonIndex,
              whopLessonId: lessonId,
            });
          }

          chapterMappings.push({
            chapterIndex,
            whopChapterId: chapterId,
            lessonMappings,
          });
        }

        moduleIdMappings.push({
          moduleIndex,
          whopCourseId: courseId,
          chapterMappings,
        });
      }

      const courseUrl = `https://whop.com/hub/${companyId}/experiences/${experienceId}`;

      return {
        experienceId,
        courseUrl,
        modulesCreated: totalModules,
        chaptersCreated: totalChapters,
        lessonsCreated: totalLessons,
        moduleIdMappings,
      };
    } catch (error) {
      console.error('Publish Course Error:', error);
      throw new Error(
        `Failed to publish course to Whop: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update a lesson
   */
  static async updateLesson(
    lessonId: string,
    updates: {
      title?: string;
      content?: string;
      lesson_type?: string;
    }
  ): Promise<any> {
    try {
      console.log('Updating lesson:', lessonId, updates);

      // Convert markdown to HTML if content is being updated
      const processedUpdates = { ...updates };
      if (processedUpdates.content) {
        processedUpdates.content = markdownToHtml(processedUpdates.content);
      }

      const response = await fetch(`https://api.whop.com/api/v1/course_lessons/${lessonId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedUpdates),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Lesson update failed:', response.status, error);
        throw new Error(`Failed to update lesson: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Lesson updated:', data);
      return data;
    } catch (error) {
      console.error('Update Lesson Error:', error);
      throw error;
    }
  }

  /**
   * Delete a lesson
   */
  static async deleteLesson(lessonId: string): Promise<void> {
    try {
      console.log('Deleting lesson:', lessonId);

      const response = await fetch(`https://api.whop.com/api/v1/course_lessons/${lessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Lesson deletion failed:', response.status, error);
        throw new Error(`Failed to delete lesson: ${response.status} ${error}`);
      }

      console.log('Lesson deleted successfully');
    } catch (error) {
      console.error('Delete Lesson Error:', error);
      throw error;
    }
  }

  /**
   * Update a chapter
   */
  static async updateChapter(
    chapterId: string,
    updates: {
      title?: string;
    }
  ): Promise<any> {
    try {
      console.log('Updating chapter:', chapterId, updates);

      const response = await fetch(`https://api.whop.com/api/v1/course_chapters/${chapterId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Chapter update failed:', response.status, error);
        throw new Error(`Failed to update chapter: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Chapter updated:', data);
      return data;
    } catch (error) {
      console.error('Update Chapter Error:', error);
      throw error;
    }
  }

  /**
   * Delete a chapter
   */
  static async deleteChapter(chapterId: string): Promise<void> {
    try {
      console.log('Deleting chapter:', chapterId);

      const response = await fetch(`https://api.whop.com/api/v1/course_chapters/${chapterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Chapter deletion failed:', response.status, error);
        throw new Error(`Failed to delete chapter: ${response.status} ${error}`);
      }

      console.log('Chapter deleted successfully');
    } catch (error) {
      console.error('Delete Chapter Error:', error);
      throw error;
    }
  }

  /**
   * Update a course
   */
  static async updateCourse(
    courseId: string,
    updates: {
      title?: string;
      tagline?: string;
      description?: string;
    }
  ): Promise<any> {
    try {
      console.log('Updating course:', courseId, updates);

      const response = await fetch(`https://api.whop.com/api/v1/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Course update failed:', response.status, error);
        throw new Error(`Failed to update course: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Course updated:', data);
      return data;
    } catch (error) {
      console.error('Update Course Error:', error);
      throw error;
    }
  }

  /**
   * Attach an Experience to a Product
   */
  static async attachExperienceToProduct(
    experienceId: string,
    productId: string
  ): Promise<any> {
    try {
      console.log('Attaching experience to product:', { experienceId, productId });

      const response = await fetch(`https://api.whop.com/api/v1/experiences/${experienceId}/attach`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Experience attachment failed:', response.status, error);
        throw new Error(`Failed to attach experience: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Experience attached to product:', data);
      return data;
    } catch (error) {
      console.error('Attach Experience Error:', error);
      throw error;
    }
  }

  /**
   * List products for a company
   */
  static async listProducts(companyId: string): Promise<any[]> {
    try {
      console.log('Listing products for company:', companyId);

      const response = await fetch(`https://api.whop.com/api/v1/products?company_id=${companyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('List products failed:', response.status, error);
        throw new Error(`Failed to list products: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Products retrieved:', data);
      return data.data || [];
    } catch (error) {
      console.error('List Products Error:', error);
      throw error;
    }
  }

  /**
   * Create a new Product
   */
  static async createProduct(
    companyId: string,
    title: string
  ): Promise<string> {
    try {
      console.log('Creating product:', { companyId, title });

      const appApiKey = process.env.WHOP_API_KEY;
      const agentUserId = process.env.WHOP_AGENT_USER_ID;

      console.log('Environment check:', {
        hasApiKey: !!appApiKey,
        apiKeyLength: appApiKey?.length,
        hasAgentUserId: !!agentUserId,
        agentUserIdValue: agentUserId,
      });

      if (!appApiKey) {
        throw new Error('WHOP_API_KEY is not configured');
      }

      if (!agentUserId) {
        throw new Error('WHOP_AGENT_USER_ID is not configured');
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${appApiKey}`,
        'Content-Type': 'application/json',
        'x-on-behalf-of': agentUserId,
      };

      console.log('Request headers:', {
        ...headers,
        'Authorization': 'Bearer [REDACTED]',
      });

      const response = await fetch('https://api.whop.com/api/v1/products', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          company_id: companyId,
          title,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Product creation failed:', response.status, error);
        throw new Error(`Failed to create product: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Product created:', data);
      return data.id;
    } catch (error) {
      console.error('Create Product Error:', error);
      throw error;
    }
  }
}
