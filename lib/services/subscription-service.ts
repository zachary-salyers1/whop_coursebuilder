import { db } from '../db/client';
import { subscriptions, usageEvents, courseGenerations, purchasedCredits } from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import type { UsageLimitCheck, UsageSummary } from '../types/domain';

// Plan configurations
const PLAN_CONFIGS = {
  free: {
    name: 'Free Plan',
    price: 0,
    generationsIncluded: 2,
    overagePrice: 5.0,
  },
  growth: {
    name: 'Growth Plan',
    price: 29.0,
    generationsIncluded: 10,
    overagePrice: 5.0,
  },
} as const;

export class SubscriptionService {
  private static readonly DEFAULT_PLAN = 'free';
  private static readonly OVERAGE_PRICE = 5.0;

  /**
   * Get plan configuration by plan type
   */
  static getPlanConfig(planType: string) {
    return PLAN_CONFIGS[planType as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS.free;
  }

  /**
   * Get or create active subscription for user
   */
  static async getOrCreateSubscription(userId: string, companyId?: string) {
    const targetCompanyId = companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID!;

    // Check for existing active subscription for this user and company
    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.whopCompanyId, targetCompanyId),
        eq(subscriptions.status, 'active')
      ))
      .limit(1);

    if (existing) {
      // Check if billing cycle needs reset
      if (existing.billingCycleEnd && new Date() > existing.billingCycleEnd) {
        // Reset usage for new billing cycle
        const newCycleStart = new Date();
        const newCycleEnd = new Date();
        newCycleEnd.setMonth(newCycleEnd.getMonth() + 1);

        await db
          .update(subscriptions)
          .set({
            currentUsage: 0,
            billingCycleStart: newCycleStart,
            billingCycleEnd: newCycleEnd,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existing.id));

        return { ...existing, currentUsage: 0, billingCycleStart: newCycleStart, billingCycleEnd: newCycleEnd };
      }

      return existing;
    }

    // Create new subscription with FREE plan by default
    const planConfig = this.getPlanConfig(this.DEFAULT_PLAN);
    const billingCycleStart = new Date();
    const billingCycleEnd = new Date();
    billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        whopCompanyId: targetCompanyId,
        planType: this.DEFAULT_PLAN,
        status: 'active',
        monthlyLimit: planConfig.generationsIncluded,
        currentUsage: 0,
        billingCycleStart,
        billingCycleEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newSubscription;
  }

  /**
   * Get available purchased credits for user
   */
  static async getAvailablePurchasedCredits(userId: string): Promise<number> {
    const credits = await db
      .select()
      .from(purchasedCredits)
      .where(and(
        eq(purchasedCredits.userId, userId),
        eq(purchasedCredits.status, 'available')
      ));

    return credits.reduce((sum, credit) => sum + credit.creditsRemaining, 0);
  }

  /**
   * Use a purchased credit (deduct from available credits)
   */
  static async usePurchasedCredit(userId: string): Promise<boolean> {
    // Find an available credit to use
    const [availableCredit] = await db
      .select()
      .from(purchasedCredits)
      .where(and(
        eq(purchasedCredits.userId, userId),
        eq(purchasedCredits.status, 'available')
      ))
      .orderBy(purchasedCredits.purchasedAt)
      .limit(1);

    if (!availableCredit) {
      return false;
    }

    const newRemaining = availableCredit.creditsRemaining - 1;

    if (newRemaining <= 0) {
      // Mark as fully used
      await db
        .update(purchasedCredits)
        .set({
          creditsRemaining: 0,
          status: 'used',
          usedAt: new Date(),
        })
        .where(eq(purchasedCredits.id, availableCredit.id));
    } else {
      // Decrement remaining
      await db
        .update(purchasedCredits)
        .set({
          creditsRemaining: newRemaining,
        })
        .where(eq(purchasedCredits.id, availableCredit.id));
    }

    return true;
  }

  /**
   * Upgrade user's subscription to a new plan
   */
  static async upgradePlan(userId: string, newPlanType: 'growth'): Promise<void> {
    const subscription = await this.getOrCreateSubscription(userId);
    const planConfig = this.getPlanConfig(newPlanType);

    await db
      .update(subscriptions)
      .set({
        planType: newPlanType,
        monthlyLimit: planConfig.generationsIncluded,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  }

  /**
   * Check if user can generate a course (has available generations)
   */
  static async checkUsageLimit(userId: string): Promise<UsageLimitCheck> {
    const subscription = await this.getOrCreateSubscription(userId);
    const purchasedCreditsCount = await this.getAvailablePurchasedCredits(userId);

    const remainingIncluded = subscription.monthlyLimit - subscription.currentUsage;
    const totalRemaining = Math.max(0, remainingIncluded) + purchasedCreditsCount;
    const isOverage = remainingIncluded <= 0 && purchasedCreditsCount <= 0;

    return {
      hasAvailableGenerations: totalRemaining > 0 || true, // Always allow with overage option
      currentUsage: subscription.currentUsage,
      monthlyLimit: subscription.monthlyLimit,
      remainingGenerations: Math.max(0, remainingIncluded),
      purchasedCreditsAvailable: purchasedCreditsCount,
      isOverage,
      overageCost: isOverage ? this.OVERAGE_PRICE : 0,
    };
  }

  /**
   * Increment usage count for user
   * Uses purchased credits if over monthly limit
   */
  static async incrementUsage(
    userId: string,
    generationId: string
  ): Promise<{ isOverage: boolean; overageCharge: number; usedPurchasedCredit: boolean }> {
    const subscription = await this.getOrCreateSubscription(userId);

    const newUsage = subscription.currentUsage + 1;
    const wouldBeOverage = newUsage > subscription.monthlyLimit;

    let usedPurchasedCredit = false;
    let isOverage = false;
    let overageCharge = 0;

    // Update subscription usage
    await db
      .update(subscriptions)
      .set({
        currentUsage: newUsage,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    // If over monthly limit, try to use a purchased credit
    if (wouldBeOverage) {
      usedPurchasedCredit = await this.usePurchasedCredit(userId);

      if (!usedPurchasedCredit) {
        // No purchased credits available, this is an overage
        isOverage = true;
        overageCharge = this.OVERAGE_PRICE;
      }
    }

    // Log usage event
    await db.insert(usageEvents).values({
      userId,
      generationId,
      eventType: isOverage ? 'overage_charged' : 'generation_started',
      metadata: {
        usageCount: newUsage,
        isOverage,
        overageCharge,
        usedPurchasedCredit,
      },
      createdAt: new Date(),
    });

    return { isOverage, overageCharge, usedPurchasedCredit };
  }

  /**
   * Get usage summary for dashboard
   */
  static async getUsageSummary(userId: string): Promise<UsageSummary> {
    const subscription = await this.getOrCreateSubscription(userId);
    const planConfig = this.getPlanConfig(subscription.planType);
    const purchasedCreditsCount = await this.getAvailablePurchasedCredits(userId);

    // Calculate overage stats
    const overageCount = Math.max(0, subscription.currentUsage - subscription.monthlyLimit);
    const overageAmount = overageCount * this.OVERAGE_PRICE;

    return {
      currentMonth: {
        generationsUsed: subscription.currentUsage,
        generationsIncluded: subscription.monthlyLimit,
        overageCount,
        overageAmount,
        purchasedCreditsAvailable: purchasedCreditsCount,
      },
      plan: {
        name: planConfig.name,
        price: planConfig.price,
        generationsIncluded: subscription.monthlyLimit,
        overagePrice: planConfig.overagePrice,
      },
    };
  }

  /**
   * Get user's generation history count this month
   */
  static async getMonthlyGenerationCount(userId: string): Promise<number> {
    const subscription = await this.getOrCreateSubscription(userId);

    if (!subscription.billingCycleStart) {
      return 0;
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(courseGenerations)
      .where(
        and(
          eq(courseGenerations.userId, userId),
          gte(courseGenerations.createdAt, subscription.billingCycleStart)
        )
      );

    return Number(result?.count || 0);
  }

  /**
   * Reset user's monthly usage (for testing or admin purposes)
   */
  static async resetMonthlyUsage(userId: string): Promise<void> {
    const subscription = await this.getOrCreateSubscription(userId);

    await db
      .update(subscriptions)
      .set({
        currentUsage: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  }
}
