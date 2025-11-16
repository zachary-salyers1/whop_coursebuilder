import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json({ error: 'course_id required' }, { status: 400 });
    }

    // Fetch the course with all its chapters and lessons from Whop API
    const response = await fetch(`https://api.whop.com/api/v1/courses/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error, status: response.status }, { status: response.status });
    }

    const courseData = await response.json();

    return NextResponse.json({
      success: true,
      courseData,
      chaptersCount: courseData.chapters?.length || 0,
      lessonsCount: courseData.chapters?.reduce((total: number, ch: any) => total + (ch.lessons?.length || 0), 0) || 0,
    });
  } catch (error) {
    console.error('Debug course error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
