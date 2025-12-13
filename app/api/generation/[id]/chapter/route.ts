import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { courseChapters, courseModules } from '@/lib/db/schema';
import { eq, max } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { moduleId, title } = await request.json();

    if (!moduleId || !title) {
      return NextResponse.json(
        { success: false, error: 'moduleId and title are required' },
        { status: 400 }
      );
    }

    // Get the next order index
    const [maxOrder] = await db
      .select({ maxOrder: max(courseChapters.orderIndex) })
      .from(courseChapters)
      .where(eq(courseChapters.moduleId, moduleId));

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    const [created] = await db
      .insert(courseChapters)
      .values({
        moduleId,
        title,
        description: '',
        orderIndex: nextOrder,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create chapter' },
      { status: 500 }
    );
  }
}
