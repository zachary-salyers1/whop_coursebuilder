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
    price: 2900, // $29.00 in cents
    planType: 'renewal',
    billingPeriod: 30, // Monthly
    productName: 'AI Course Builder - Growth Plan',
    generationsIncluded: 10,
  },
  additional: {
    price: 500, // $5.00 in cents
    planType: 'one_time',
    productName: 'AI Course Builder - Additional Generation',
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

    // Create checkout configuration via Whop API
    const response = await fetch('https://api.whop.com/api/v5/checkout_configurations', {
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

    if (!checkoutConfig.plan_id || !checkoutConfig.id) {
      throw new Error('Invalid response from Whop API');
    }

    return NextResponse.json({
      success: true,
      data: {
        planId: checkoutConfig.plan_id,
        id: checkoutConfig.id,
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
