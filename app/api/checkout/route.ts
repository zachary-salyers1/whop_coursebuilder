import { NextRequest, NextResponse } from 'next/server';

// Plan configurations - pricing in cents
const PLAN_CONFIGS: Record<string, {
  price: number;
  planType: 'one_time' | 'renewal';
  billingPeriod?: number;
  productName: string;
  generationsIncluded: number;
}> = {
  growth: {
    price: 29, // $29.00
    planType: 'renewal',
    billingPeriod: 30, // Monthly
    productName: 'Course Builder - Growth',
    generationsIncluded: 10,
  },
  additional: {
    price: 5, // $5.00
    planType: 'one_time',
    productName: 'Extra Generation Credit',
    generationsIncluded: 1,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, userId, companyId } = body;

    if (!plan || !PLAN_CONFIGS[plan]) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'invalid_plan', message: 'Invalid plan specified. Use "growth" or "additional".' },
        },
        { status: 400 }
      );
    }

    const planConfig = PLAN_CONFIGS[plan];
    const targetCompanyId = companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

    if (!targetCompanyId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'missing_company', message: 'Company ID is required' },
        },
        { status: 400 }
      );
    }

    // Build the plan object for dynamic checkout configuration
    const planPayload: Record<string, unknown> = {
      company_id: targetCompanyId,
      initial_price: planConfig.price,
      plan_type: planConfig.planType,
      currency: 'usd',
    };

    // Add renewal-specific fields
    if (planConfig.planType === 'renewal') {
      planPayload.renewal_price = planConfig.price;
      planPayload.billing_period = planConfig.billingPeriod;
      planPayload.product = {
        external_identifier: `course-builder-${plan}-${targetCompanyId}`,
        title: planConfig.productName,
      };
    } else {
      // One-time purchase
      planPayload.product = {
        external_identifier: `course-builder-${plan}-${userId}-${Date.now()}`,
        title: planConfig.productName,
      };
    }

    // Create checkout configuration via Whop API v1
    const response = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      },
      body: JSON.stringify({
        plan: planPayload,
        metadata: {
          userId,
          companyId: targetCompanyId,
          purchaseType: plan,
          generationsIncluded: planConfig.generationsIncluded.toString(),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Whop API Error:', response.status, errorData);
      throw new Error(errorData.message || `Whop API error: ${response.status}`);
    }

    const checkoutConfig = await response.json();
    console.log('Whop API Response:', JSON.stringify(checkoutConfig, null, 2));

    // The response might have different field names
    const planId = checkoutConfig.plan_id || checkoutConfig.planId || checkoutConfig.plan?.id;
    const configId = checkoutConfig.id || checkoutConfig.checkout_configuration_id;

    if (!planId || !configId) {
      console.error('Missing fields in response:', { planId, configId, checkoutConfig });
      throw new Error('Invalid response from Whop API - missing plan_id or id');
    }

    return NextResponse.json({
      success: true,
      data: {
        planId: planId,
        id: configId,
        plan,
        price: planConfig.price / 100, // Convert back to dollars for display
        productName: planConfig.productName,
      },
    });
  } catch (error) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'checkout_failed',
          message: error instanceof Error ? error.message : 'Failed to create checkout configuration',
        },
      },
      { status: 500 }
    );
  }
}
