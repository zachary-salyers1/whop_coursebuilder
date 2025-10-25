import { NextRequest, NextResponse } from 'next/server';
import { CourseGenerationService } from '@/lib/services/course-generation-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generationId, companyId } = body;

    if (!generationId || !companyId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'missing_params', message: 'Missing required parameters' },
        },
        { status: 400 }
      );
    }

    // Publish to Whop
    const result = await CourseGenerationService.publishToWhop(
      generationId,
      companyId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Publish API Error:', error);
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
