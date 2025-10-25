import { NextRequest, NextResponse } from 'next/server';
import { CourseGenerationService } from '@/lib/services/course-generation-service';
import { UserService } from '@/lib/services/user-service';
import { SubscriptionService } from '@/lib/services/subscription-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfUploadId, userId: whopUserId, customTitle } = body;

    if (!pdfUploadId || !whopUserId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'missing_params', message: 'Missing required parameters' },
        },
        { status: 400 }
      );
    }

    // Get or create user
    const user = await UserService.getOrCreateUser({
      id: whopUserId,
    });

    // Check usage limits
    const usageCheck = await SubscriptionService.checkUsageLimit(user.id);

    // Generate course
    const result = await CourseGenerationService.generateCourse({
      userId: user.id,
      pdfUploadId,
      customTitle,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        usageInfo: {
          isOverage: usageCheck.isOverage,
          overageCost: usageCheck.overageCost,
          remainingGenerations: usageCheck.remainingGenerations,
        },
      },
    });
  } catch (error) {
    console.error('Generate API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'generation_failed',
          message: error instanceof Error ? error.message : 'Generation failed',
        },
      },
      { status: 500 }
    );
  }
}
