import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-utils';
import { WhopAPIService } from '@/lib/services/whop-api-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await params;
    const { title, tagline, description } = await request.json();

    const updates: { title?: string; tagline?: string; description?: string } = {};
    if (title) updates.title = title;
    if (tagline) updates.tagline = tagline;
    if (description) updates.description = description;

    const updatedCourse = await WhopAPIService.updateCourse(courseId, updates);

    return NextResponse.json({
      success: true,
      data: updatedCourse,
    });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}
