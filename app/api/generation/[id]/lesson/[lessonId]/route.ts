import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { courseLessons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const { title, content, lessonType } = await request.json();

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (lessonType !== undefined) updates.lessonType = lessonType;

    const [updated] = await db
      .update(courseLessons)
      .set(updates)
      .where(eq(courseLessons.id, lessonId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { lessonId } = await params;

    await db.delete(courseLessons).where(eq(courseLessons.id, lessonId));

    return NextResponse.json({
      success: true,
      message: 'Lesson deleted',
    });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}
