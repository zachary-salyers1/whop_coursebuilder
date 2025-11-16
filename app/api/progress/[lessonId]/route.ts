import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessonProgress } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth-utils';

// Mark a lesson as completed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { experienceId } = await request.json();
    const { lessonId } = await params;

    // Check if progress record exists
    const existing = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.whopLessonId, lessonId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(lessonProgress)
        .set({
          completed: true,
          completedAt: new Date(),
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(lessonProgress.id, existing[0].id));
    } else {
      // Create new record
      await db.insert(lessonProgress).values({
        userId: user.id,
        whopLessonId: lessonId,
        whopExperienceId: experienceId,
        completed: true,
        completedAt: new Date(),
        lastAccessedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking lesson as complete:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

// Get progress for a lesson
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId } = await params;

    const progress = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.whopLessonId, lessonId)
        )
      )
      .limit(1);

    return NextResponse.json({
      completed: progress.length > 0 ? progress[0].completed : false,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
