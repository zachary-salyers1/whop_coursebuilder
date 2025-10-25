import { whopSdk } from '../whop-sdk';
import type { CourseStructure } from '../types/domain';

interface WhopExperience {
  id: string;
  name: string;
}

interface WhopModule {
  id: string;
  title: string;
}

interface WhopChapter {
  id: string;
  title: string;
}

interface WhopLesson {
  id: string;
  title: string;
}

export class WhopAPIService {
  /**
   * Create a new Experience (course container) in Whop
   */
  static async createExperience(
    companyId: string,
    title: string,
    description: string
  ): Promise<string> {
    try {
      const response = await whopSdk
        .withCompany(companyId)
        .POST('/experiences', {
          body: {
            name: title,
            description: description,
            visibility: 'unlisted', // Start as unlisted until user publishes
          },
        });

      if (!response.data) {
        throw new Error('Failed to create experience');
      }

      return response.data.id;
    } catch (error) {
      console.error('Create Experience Error:', error);
      throw new Error(
        `Failed to create Whop experience: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a module (course) in an experience
   */
  static async createModule(
    experienceId: string,
    title: string,
    description: string,
    order: number
  ): Promise<string> {
    try {
      const response = await whopSdk.POST('/courses', {
        body: {
          experience_id: experienceId,
          title: title,
          description: description || '',
          order: order,
          visibility: 'visible',
        },
      });

      if (!response.data) {
        throw new Error('Failed to create module');
      }

      return response.data.id;
    } catch (error) {
      console.error('Create Module Error:', error);
      throw new Error(
        `Failed to create module: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a chapter in a module
   */
  static async createChapter(
    courseId: string,
    title: string,
    description: string,
    order: number
  ): Promise<string> {
    try {
      const response = await whopSdk.POST('/course_chapters', {
        body: {
          course_id: courseId,
          title: title,
          description: description || '',
          order: order,
        },
      });

      if (!response.data) {
        throw new Error('Failed to create chapter');
      }

      return response.data.id;
    } catch (error) {
      console.error('Create Chapter Error:', error);
      throw new Error(
        `Failed to create chapter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a lesson in a chapter
   */
  static async createLesson(
    chapterId: string,
    title: string,
    content: string,
    order: number
  ): Promise<string> {
    try {
      const response = await whopSdk.POST('/course_lessons', {
        body: {
          chapter_id: chapterId,
          title: title,
          content: content,
          lesson_type: 'text',
          order: order,
        },
      });

      if (!response.data) {
        throw new Error('Failed to create lesson');
      }

      return response.data.id;
    } catch (error) {
      console.error('Create Lesson Error:', error);
      throw new Error(
        `Failed to create lesson: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Publish full course structure to Whop
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
  }> {
    let modulesCreated = 0;
    let chaptersCreated = 0;
    let lessonsCreated = 0;

    try {
      // 1. Create Experience
      const experienceId = await this.createExperience(
        companyId,
        structure.title,
        structure.description
      );

      // 2. Create Modules, Chapters, and Lessons
      for (const module of structure.modules) {
        const moduleId = await this.createModule(
          experienceId,
          module.title,
          module.description,
          module.order
        );
        modulesCreated++;

        for (const chapter of module.chapters) {
          const chapterId = await this.createChapter(
            moduleId,
            chapter.title,
            chapter.description,
            chapter.order
          );
          chaptersCreated++;

          for (const lesson of chapter.lessons) {
            await this.createLesson(
              chapterId,
              lesson.title,
              lesson.content,
              lesson.order
            );
            lessonsCreated++;
          }
        }
      }

      // Construct course URL
      const courseUrl = `https://whop.com/hub/${companyId}/experiences/${experienceId}`;

      return {
        experienceId,
        courseUrl,
        modulesCreated,
        chaptersCreated,
        lessonsCreated,
      };
    } catch (error) {
      console.error('Publish Course Error:', error);
      throw new Error(
        `Failed to publish course to Whop (${modulesCreated} modules, ${chaptersCreated} chapters, ${lessonsCreated} lessons created before error): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update experience visibility
   */
  static async updateExperienceVisibility(
    experienceId: string,
    visibility: 'visible' | 'unlisted' | 'hidden'
  ): Promise<void> {
    try {
      await whopSdk.PATCH(`/experiences/${experienceId}`, {
        body: {
          visibility,
        },
      });
    } catch (error) {
      console.error('Update Visibility Error:', error);
      throw new Error(
        `Failed to update experience visibility: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete an experience
   */
  static async deleteExperience(experienceId: string): Promise<void> {
    try {
      await whopSdk.DELETE(`/experiences/${experienceId}`);
    } catch (error) {
      console.error('Delete Experience Error:', error);
      throw new Error(
        `Failed to delete experience: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
