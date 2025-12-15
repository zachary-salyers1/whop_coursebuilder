import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

// Plan configurations with Whop product/plan IDs
const PLAN_CONFIGS: Record<string, {
  planId: string;
  productName: string;
  price: number;
  generationsIncluded: number;
}> = {
  growth: {
    planId: process.env.NEXT_PUBLIC_GROWTH_PLAN_ID || 'prod_Xzp5AulxnOvJz',
    productName: 'AI Course Builder - Growth Plan',
    price: 29,
    generationsIncluded: 10,
  },
  additional: {
    planId: process.env.NEXT_PUBLIC_ADDITIONAL_GENERATION_PLAN_ID || 'prod_9XZrPyejB03C8',
    productName: 'AI Course Builder - Additional Generation',
    price: 5,
    generationsIncluded: 1,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, userId, companyId, metadata } = body;

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

    // Create checkout session using Whop SDK
    const checkoutSession = await whopSdk.payments.createCheckoutSession({
      planId: planConfig.planId,
      metadata: {
        userId,
        companyId,
        purchaseType: plan,
        generationsIncluded: planConfig.generationsIncluded.toString(),
        ...metadata,
      },
    });

    if (!checkoutSession?.id) {
      throw new Error('Failed to create checkout session');
    }

    return NextResponse.json({
      success: true,
      data: {
        planId: planConfig.planId,
        id: checkoutSession.id,
        plan,
        price: planConfig.price,
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
          message: error instanceof Error ? error.message : 'Failed to create checkout session',
        },
      },
      { status: 500 }
    );
  }
}
