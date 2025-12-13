import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { courseChapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const { title, description } = await request.json();

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    const [updated] = await db
      .update(courseChapters)
      .set(updates)
      .where(eq(courseChapters.id, chapterId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update chapter' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { chapterId } = await params;

    await db.delete(courseChapters).where(eq(courseChapters.id, chapterId));

    return NextResponse.json({
      success: true,
      message: 'Chapter deleted',
    });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete chapter' },
      { status: 500 }
    );
  }
}
