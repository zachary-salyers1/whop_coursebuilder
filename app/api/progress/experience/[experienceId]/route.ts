import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessonProgress } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth-utils';

// Get all progress for an experience
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { experienceId } = await params;

    const progress = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.whopExperienceId, experienceId)
        )
      );

    // Create a map of lesson ID to completion status
    const progressMap: Record<string, boolean> = {};
    progress.forEach((p) => {
      progressMap[p.whopLessonId] = p.completed;
    });

    return NextResponse.json({ progress: progressMap });
  } catch (error) {
    console.error('Error fetching experience progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
