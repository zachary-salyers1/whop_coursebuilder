import { NextRequest, NextResponse } from 'next/server';
import { CourseGenerationService } from '@/lib/services/course-generation-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: generationId } = await params;

    const generation = await CourseGenerationService.getGeneration(generationId);

    if (!generation) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'not_found', message: 'Generation not found' },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: generation,
    });
  } catch (error) {
    console.error('Get Generation API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'fetch_failed',
          message: error instanceof Error ? error.message : 'Failed to fetch generation',
        },
      },
      { status: 500 }
    );
  }
}
