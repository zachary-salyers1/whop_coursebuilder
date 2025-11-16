import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers;

    // Try to get user from Whop token
    const tokenResult = await whopSdk.verifyUserToken(headers);

    // Get company ID from header or environment
    let companyId = headers.get('x-whop-company-id') || headers.get('whop-company-id');

    // Fallback to environment variable in development
    if (!companyId && process.env.NODE_ENV === 'development') {
      companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_1Io4EO2Twj9wo7';
    }

    // Check for experience ID in headers
    const experienceId = headers.get('x-whop-experience-id') || headers.get('whop-experience-id');

    console.log('Auth headers:', {
      companyId,
      experienceId,
      allHeaders: Object.fromEntries(headers.entries())
    });

    return NextResponse.json({
      success: true,
      data: {
        id: tokenResult.userId,
        companyId: companyId,
        experienceId: experienceId,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);

    // Development fallback - use env variables
    if (process.env.NODE_ENV === 'development') {
      const devCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_1Io4EO2Twj9wo7';
      const devUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_5x9k4ZJpf1ZK2';

      console.log('Using development fallback:', { userId: devUserId, companyId: devCompanyId });

      return NextResponse.json({
        success: true,
        data: {
          id: devUserId,
          companyId: devCompanyId,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: 'auth_failed', message: 'Authentication failed' },
      },
      { status: 401 }
    );
  }
}
