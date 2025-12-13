import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-utils';
import { WhopAPIService } from '@/lib/services/whop-api-service';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, title } = await request.json();

    if (!courseId || !title) {
      return NextResponse.json(
        { error: 'courseId and title are required' },
        { status: 400 }
      );
    }

    const chapterId = await WhopAPIService.createChapter(courseId, title, '', 0);

    return NextResponse.json({
      success: true,
      data: { id: chapterId },
    });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { error: 'Failed to create chapter' },
      { status: 500 }
    );
  }
}
