import { NextRequest, NextResponse } from 'next/server';
import { WhopAPIService } from '@/lib/services/whop-api-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      );
    }

    const courses = await WhopAPIService.listCourses(companyId);

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error('List courses error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list courses',
      },
      { status: 500 }
    );
  }
}
