import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { experienceId } = await request.json();

    console.log('Creating test course with:', { experienceId });

    const response = await fetch('https://api.whop.com/api/v1/courses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        experience_id: experienceId,
        title: 'Test Course ' + Date.now(),
        tagline: 'This is a test course tagline',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Course creation failed:', response.status, error);
      return NextResponse.json(
        {
          success: false,
          error: { message: `API Error: ${response.status} - ${error}` },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Course created:', data);

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Course creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      },
      { status: 500 }
    );
  }
}
