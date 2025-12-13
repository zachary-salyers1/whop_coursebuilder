import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-utils';
import { WhopAPIService } from '@/lib/services/whop-api-service';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chapterId, title, content, lessonType } = await request.json();

    if (!chapterId || !title) {
      return NextResponse.json(
        { error: 'chapterId and title are required' },
        { status: 400 }
      );
    }

    const lessonId = await WhopAPIService.createLesson(
      chapterId,
      title,
      content || '',
      0
    );

    return NextResponse.json({
      success: true,
      data: { id: lessonId },
    });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
