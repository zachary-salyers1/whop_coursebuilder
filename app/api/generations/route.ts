import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { courseGenerations, courseModules, courseLessons } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { UserService } from '@/lib/services/user-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const whopUserId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!whopUserId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'missing_user_id', message: 'User ID required' },
        },
        { status: 400 }
      );
    }

    // Get user
    const user = await UserService.getUserByWhopId(whopUserId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'user_not_found', message: 'User not found' },
        },
        { status: 404 }
      );
    }

    // Get generations with module and lesson counts
    const generations = await db
      .select({
        id: courseGenerations.id,
        courseTitle: courseGenerations.courseTitle,
        status: courseGenerations.status,
        generationType: courseGenerations.generationType,
        overageCharge: courseGenerations.overageCharge,
        whopExperienceId: courseGenerations.whopExperienceId,
        createdAt: courseGenerations.createdAt,
        completedAt: courseGenerations.completedAt,
        errorMessage: courseGenerations.errorMessage,
      })
      .from(courseGenerations)
      .where(eq(courseGenerations.userId, user.id))
      .orderBy(desc(courseGenerations.createdAt))
      .limit(limit);

    // Get module counts for each generation
    const generationsWithCounts = await Promise.all(
      generations.map(async (gen) => {
        const [moduleCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(courseModules)
          .where(eq(courseModules.generationId, gen.id));

        // Get lesson count
        const [lessonCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(courseLessons)
          .innerJoin(courseModules, eq(courseLessons.chapterId, courseModules.id))
          .where(eq(courseModules.generationId, gen.id));

        return {
          ...gen,
          moduleCount: Number(moduleCount?.count || 0),
          lessonCount: Number(lessonCount?.count || 0),
          whopCourseUrl: gen.whopExperienceId
            ? `https://whop.com/hub/${user.whopCompanyId}/experiences/${gen.whopExperienceId}`
            : undefined,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        generations: generationsWithCounts,
        total: generationsWithCounts.length,
      },
    });
  } catch (error) {
    console.error('Generations API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'fetch_failed',
          message: error instanceof Error ? error.message : 'Failed to fetch generations',
        },
      },
      { status: 500 }
    );
  }
}
