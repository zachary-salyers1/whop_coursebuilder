import { NextRequest, NextResponse } from 'next/server';
import { WhopAPIService } from '@/lib/services/whop-api-service';
import { whopSdk } from '@/lib/whop-sdk';

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

    // Get the user ID from auth headers for on-behalf-of
    let userId: string | undefined;
    try {
      const tokenResult = await whopSdk.verifyUserToken(request.headers);
      userId = tokenResult.userId;
      console.log('List courses - authenticated user:', userId);
    } catch (authError) {
      console.log('List courses - no auth token, using app-level access');
    }

    const courses = await WhopAPIService.listCourses(companyId, userId);

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
