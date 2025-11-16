import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;

    if (!experienceId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Experience ID is required' },
        },
        { status: 400 }
      );
    }

    console.log('Fetching experience:', experienceId);

    // Fetch experience details from Whop
    const experienceResponse = await fetch(
      `https://api.whop.com/api/v1/experiences/${experienceId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!experienceResponse.ok) {
      const error = await experienceResponse.text();
      console.error('Failed to fetch experience:', experienceResponse.status, error);
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Experience not found' },
        },
        { status: 404 }
      );
    }

    const experienceData = await experienceResponse.json();
    console.log('Experience data:', experienceData);

    // Get course IDs from database
    const { db } = await import('@/lib/db');
    const { courseGenerations, courseModules, courseChapters, courseLessons } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    // Find generation by experience ID
    const [generation] = await db
      .select()
      .from(courseGenerations)
      .where(eq(courseGenerations.whopExperienceId, experienceId));

    if (!generation) {
      console.warn('No generation found for experience:', experienceId);
      return NextResponse.json({
        success: true,
        data: {
          id: experienceData.id,
          name: experienceData.name,
          courses: [],
        },
      });
    }

    // Get modules with Whop course IDs
    const modules = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.generationId, generation.id))
      .orderBy(courseModules.orderIndex);

    const courses = modules
      .filter((m) => m.whopCourseId)
      .map((m) => ({ id: m.whopCourseId! }));

    // For each course, fetch full details including chapters and lessons
    const coursesWithDetails = await Promise.all(
      courses.map(async (course: any) => {
        try {
          const courseDetailResponse = await fetch(
            `https://api.whop.com/api/v1/courses/${course.id}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (courseDetailResponse.ok) {
            const courseDetail = await courseDetailResponse.json();

            // Fetch full lesson content for each lesson
            const chaptersWithLessons = await Promise.all(
              (courseDetail.chapters || []).map(async (chapter: any) => {
                const lessonsWithContent = await Promise.all(
                  (chapter.lessons || []).map(async (lesson: any) => {
                    try {
                      const lessonResponse = await fetch(
                        `https://api.whop.com/api/v1/course_lessons/${lesson.id}`,
                        {
                          headers: {
                            'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                            'Content-Type': 'application/json',
                          },
                        }
                      );

                      if (lessonResponse.ok) {
                        return await lessonResponse.json();
                      }
                      return lesson;
                    } catch (err) {
                      console.error('Error fetching lesson:', err);
                      return lesson;
                    }
                  })
                );

                return {
                  ...chapter,
                  lessons: lessonsWithContent,
                };
              })
            );

            return {
              ...courseDetail,
              chapters: chaptersWithLessons,
            };
          }
          return course;
        } catch (err) {
          console.error('Error fetching course details:', err);
          return course;
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        id: experienceData.id,
        name: experienceData.name,
        courses: coursesWithDetails,
      },
    });
  } catch (error) {
    console.error('Error fetching experience:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch experience',
        },
      },
      { status: 500 }
    );
  }
}
