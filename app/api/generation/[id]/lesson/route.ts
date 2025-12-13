import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { courseLessons } from '@/lib/db/schema';
import { eq, max } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { chapterId, title, content, lessonType } = await request.json();

    if (!chapterId || !title) {
      return NextResponse.json(
        { success: false, error: 'chapterId and title are required' },
        { status: 400 }
      );
    }

    // Get the next order index
    const [maxOrder] = await db
      .select({ maxOrder: max(courseLessons.orderIndex) })
      .from(courseLessons)
      .where(eq(courseLessons.chapterId, chapterId));

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    const [created] = await db
      .insert(courseLessons)
      .values({
        chapterId,
        title,
        content: content || '',
        lessonType: lessonType || 'text',
        orderIndex: nextOrder,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
