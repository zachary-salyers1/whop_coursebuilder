import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
    if (!appId) {
      throw new Error('WHOP_APP_ID not set');
    }

    console.log('Creating test experience with:', { companyId, appId });

    const response = await fetch('https://api.whop.com/api/v1/experiences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        company_id: companyId,
        name: 'Test Experience ' + Date.now(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Experience creation failed:', response.status, error);
      return NextResponse.json(
        {
          success: false,
          error: { message: `API Error: ${response.status} - ${error}` },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Experience created:', data);

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Experience creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      },
      { status: 500 }
    );
  }
}
