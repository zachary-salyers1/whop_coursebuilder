import { NextRequest, NextResponse } from 'next/server';
import { CourseGenerationService } from '@/lib/services/course-generation-service';
import { whopSdk } from '@/lib/whop-sdk';

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

    // Get the Whop user ID from auth headers for on-behalf-of (required for B2B apps)
    let whopUserId: string | undefined;
    try {
      const tokenResult = await whopSdk.verifyUserToken(request.headers);
      whopUserId = tokenResult.userId;
      console.log('📤 Publish - authenticated Whop user:', whopUserId);
    } catch (authError) {
      console.log('📤 Publish - no auth token, using app-level access');
    }

    console.log('🚀 Starting course content publish to Whop...');

    // Add content to existing Whop course (passing whopUserId for B2B on-behalf-of)
    const result = await CourseGenerationService.addToExistingCourse(
      generationId,
      courseId,
      whopUserId
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
