import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers;

    // Get user from Whop token
    const tokenResult = await whopSdk.verifyUserToken(headers);

    // Get company ID from header
    const companyId = headers.get('x-whop-company-id') || headers.get('whop-company-id');

    return NextResponse.json({
      success: true,
      data: {
        id: tokenResult.userId,
        companyId: companyId,
      },
    });
  } catch (error) {
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        data: {
          id: 'user_5x9k4ZJpf1ZK2',
          companyId: 'biz_1Io4EO2Twj9wo7',
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
