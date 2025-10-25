import { db } from '../db/client';
import { subscriptions, users, usageEvents, courseGenerations } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { UsageLimitCheck, UsageSummary } from '../types/domain';

export class SubscriptionService {
  private static readonly MONTHLY_LIMIT = 10;
  private static readonly OVERAGE_PRICE = 5.0;

  /**
   * Get or create active subscription for user
   */
  static async getOrCreateSubscription(userId: string) {
    // Check for existing active subscription
    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
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

    // Create new subscription
    const billingCycleStart = new Date();
    const billingCycleEnd = new Date();
    billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        planType: 'growth',
        status: 'active',
        monthlyLimit: this.MONTHLY_LIMIT,
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
   * Check if user can generate a course (has available generations)
   */
  static async checkUsageLimit(userId: string): Promise<UsageLimitCheck> {
    const subscription = await this.getOrCreateSubscription(userId);

    const remainingGenerations =
      subscription.monthlyLimit - subscription.currentUsage;
    const isOverage = remainingGenerations <= 0;

    return {
      hasAvailableGenerations: true, // Always allow with overage
      currentUsage: subscription.currentUsage,
      monthlyLimit: subscription.monthlyLimit,
      remainingGenerations: Math.max(0, remainingGenerations),
      isOverage,
      overageCost: isOverage ? this.OVERAGE_PRICE : 0,
    };
  }

  /**
   * Increment usage count for user
   */
  static async incrementUsage(
    userId: string,
    generationId: string
  ): Promise<{ isOverage: boolean; overageCharge: number }> {
    const subscription = await this.getOrCreateSubscription(userId);

    const newUsage = subscription.currentUsage + 1;
    const isOverage = newUsage > subscription.monthlyLimit;
    const overageCharge = isOverage ? this.OVERAGE_PRICE : 0;

    // Update subscription usage
    await db
      .update(subscriptions)
      .set({
        currentUsage: newUsage,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    // Log usage event
    await db.insert(usageEvents).values({
      userId,
      generationId,
      eventType: isOverage ? 'overage_charged' : 'generation_started',
      metadata: {
        usageCount: newUsage,
        isOverage,
        overageCharge,
      },
      createdAt: new Date(),
    });

    return { isOverage, overageCharge };
  }

  /**
   * Get usage summary for dashboard
   */
  static async getUsageSummary(userId: string): Promise<UsageSummary> {
    const subscription = await this.getOrCreateSubscription(userId);

    // Calculate overage stats
    const overageCount = Math.max(0, subscription.currentUsage - subscription.monthlyLimit);
    const overageAmount = overageCount * this.OVERAGE_PRICE;

    return {
      currentMonth: {
        generationsUsed: subscription.currentUsage,
        generationsIncluded: subscription.monthlyLimit,
        overageCount,
        overageAmount,
      },
      plan: {
        name: 'Growth Plan',
        price: 29.0,
        generationsIncluded: subscription.monthlyLimit,
        overagePrice: this.OVERAGE_PRICE,
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
