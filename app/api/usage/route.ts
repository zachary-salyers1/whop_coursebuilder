import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { UserService } from '@/lib/services/user-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const whopUserId = searchParams.get('userId');

    if (!whopUserId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'missing_user_id', message: 'User ID required' },
        },
        { status: 400 }
      );
    }

    // Get or create user
    const user = await UserService.getOrCreateUser({
      id: whopUserId,
    });

    // Get usage summary
    const usageSummary = await SubscriptionService.getUsageSummary(user.id);

    return NextResponse.json({
      success: true,
      data: usageSummary,
    });
  } catch (error) {
    console.error('Usage API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'fetch_failed',
          message: error instanceof Error ? error.message : 'Failed to fetch usage',
        },
      },
      { status: 500 }
    );
  }
}
