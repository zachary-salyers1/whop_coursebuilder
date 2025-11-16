import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { courseId } = await request.json();

    console.log('Creating test chapter with:', { courseId });

    const response = await fetch('https://api.whop.com/api/v1/course_chapters', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course_id: courseId,
        title: 'Test Chapter ' + Date.now(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Chapter creation failed:', response.status, error);
      return NextResponse.json(
        {
          success: false,
          error: { message: `API Error: ${response.status} - ${error}` },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Chapter created:', data);

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Chapter creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      },
      { status: 500 }
    );
  }
}
