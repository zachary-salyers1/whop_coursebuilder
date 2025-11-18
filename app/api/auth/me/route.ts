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

    // If we have experience ID but no company ID, fetch company from experience
    if (experienceId && !companyId) {
      try {
        console.log('🔍 Fetching company ID from experience:', experienceId);
        const expResponse = await fetch(`https://api.whop.com/api/v5/app/experiences/${experienceId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          },
        });

        if (expResponse.ok) {
          const expData = await expResponse.json();
          companyId = expData.company_id;
          console.log('✅ Got company ID from experience:', companyId);
        }
      } catch (error) {
        console.error('❌ Failed to fetch company from experience:', error);
      }
    }

    // Last resort: Query user's memberships to find which companies they have access to
    // This is needed when accessing the app dashboard directly (not via experience)
    if (!companyId) {
      try {
        console.log('🔍 Fetching user memberships for user:', tokenResult.userId);
        const membershipsResponse = await fetch(
          `https://api.whop.com/api/v5/memberships?user_id=${tokenResult.userId}&valid=true`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
            },
          }
        );

        console.log('📊 Memberships response status:', membershipsResponse.status);

        if (membershipsResponse.ok) {
          const memberships = await membershipsResponse.json();
          console.log('📊 Memberships data:', JSON.stringify(memberships, null, 2));

          // Get the first valid membership's company ID
          // TODO: In the future, we might need to handle users with multiple memberships
          if (memberships.data && memberships.data.length > 0) {
            companyId = memberships.data[0].company_id;
            console.log('✅ Got company ID from membership:', companyId, `(${memberships.data.length} total memberships)`);
          } else {
            console.log('⚠️  No memberships found for user');
          }
        } else {
          const errorText = await membershipsResponse.text();
          console.error('❌ Memberships API error:', membershipsResponse.status, errorText);
        }
      } catch (error) {
        console.error('❌ Failed to fetch user memberships:', error);
      }
    }

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
