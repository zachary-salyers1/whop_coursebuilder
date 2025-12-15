import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { CourseGenerationService } from '@/lib/services/course-generation-service';
import { UserService } from '@/lib/services/user-service';
import { SubscriptionService } from '@/lib/services/subscription-service';

export const maxDuration = 300; // 5 minutes max (requires Pro plan, otherwise 60s)

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

    // Get company ID from headers
    const companyId = request.headers.get('x-whop-company-id') || request.headers.get('whop-company-id');

    // Get or create user
    const user = await UserService.getOrCreateUser({
      id: whopUserId,
      companyId: companyId || undefined,
    });

    // Check usage limits
    const usageCheck = await SubscriptionService.checkUsageLimit(user.id);

    // Start course generation (returns immediately with generation ID)
    const result = await CourseGenerationService.startGeneration({
      userId: user.id,
      pdfUploadId,
      customTitle,
    });

    // Use after() to run the actual generation in background after response
    after(async () => {
      try {
        console.log('Starting background generation for:', result.generationId);
        await CourseGenerationService.processGenerationBackground(
          result.generationId,
          pdfUploadId
        );
        console.log('Background generation completed for:', result.generationId);
      } catch (error) {
        console.error('Background generation error:', error);
      }
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
