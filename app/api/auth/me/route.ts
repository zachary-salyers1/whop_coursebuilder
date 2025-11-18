import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers;

    // Try to get user from Whop token
    const tokenResult = await whopSdk.verifyUserToken(headers);

    // Try to get company ID from various sources
    let companyId = headers.get('x-whop-company-id') || headers.get('whop-company-id');

    // If no company ID in headers, try to get it from the referrer URL
    if (!companyId) {
      const referer = headers.get('referer');
      if (referer) {
        // Extract company slug from URL like: whop.com/joined/{company-slug}/...
        const match = referer.match(/whop\.com\/joined\/([^\/]+)/);
        if (match) {
          const companySlug = match[1];
          console.log('📍 Extracted company slug from referer:', companySlug);

          // TODO: We have the slug but need the ID. For now, store slug as metadata
          // The slug-to-ID mapping should be handled by querying user memberships
        }
      }
    }

    // Fallback to environment variable only in development mode
    if (!companyId && process.env.NODE_ENV === 'development') {
      companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_1Io4EO2Twj9wo7';
    }

    // Check for experience ID in headers
    const experienceId = headers.get('x-whop-experience-id') || headers.get('whop-experience-id');

    console.log('🔍 Auth debug:', {
      companyId,
      experienceId,
      userId: tokenResult.userId,
      referer: headers.get('referer'),
      nodeEnv: process.env.NODE_ENV,
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
