import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { courseModules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    const { title, description } = await request.json();

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    const [updated] = await db
      .update(courseModules)
      .set(updates)
      .where(eq(courseModules.id, moduleId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update module' },
      { status: 500 }
    );
  }
}
