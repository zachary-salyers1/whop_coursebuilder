import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { chapterId } = await request.json();

    console.log('Creating test lesson with:', { chapterId });

    const response = await fetch('https://api.whop.com/api/v1/course_lessons', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chapter_id: chapterId,
        lesson_type: 'text',
        title: 'Test Lesson ' + Date.now(),
        content: '# Test Lesson\n\nThis is a test lesson with some content.\n\n## Section 1\n\nSome information here.\n\n## Section 2\n\nMore details about the topic.',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Lesson creation failed:', response.status, error);
      return NextResponse.json(
        {
          success: false,
          error: { message: `API Error: ${response.status} - ${error}` },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Lesson created:', data);

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Lesson creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      },
      { status: 500 }
    );
  }
}
