import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers;

    // Get user from Whop token
    const tokenResult = await whopSdk.verifyUserToken(headers);
    const user = await whopSdk.users.getUser({ userId: tokenResult.userId });

    return NextResponse.json({
      success: true,
      data: {
        id: tokenResult.userId,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        data: {
          id: 'user_5x9k4ZJpf1ZK2',
          name: 'Development User',
          username: 'dev_user',
          email: 'dev@example.com',
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
