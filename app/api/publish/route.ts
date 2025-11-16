import { NextRequest, NextResponse } from 'next/server';
import { CourseGenerationService } from '@/lib/services/course-generation-service';

export async function POST(request: NextRequest) {
  console.log('📤 Publish API called');

  try {
    const body = await request.json();
    const { generationId, courseId } = body;

    console.log('📋 Publish request:', { generationId, courseId });

    if (!generationId || !courseId) {
      console.log('❌ Missing required parameters');
      return NextResponse.json(
        {
          success: false,
          error: { code: 'missing_params', message: 'Missing generationId or courseId' },
        },
        { status: 400 }
      );
    }

    console.log('🚀 Starting course content publish to Whop...');

    // Add content to existing Whop course
    const result = await CourseGenerationService.addToExistingCourse(
      generationId,
      courseId
    );

    console.log('✅ Publish successful:', result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Publish API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'publish_failed',
          message: error instanceof Error ? error.message : 'Publish failed',
        },
      },
      { status: 500 }
    );
  }
}
