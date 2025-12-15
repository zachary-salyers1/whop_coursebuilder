import { waitUntil } from "@vercel/functions";
import { makeWebhookValidator } from "@whop/api";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users, subscriptions, purchasedCredits } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { UserService } from "@/lib/services/user-service";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

interface WebhookMetadata {
	userId?: string;
	companyId?: string;
	purchaseType?: 'growth' | 'additional';
	generationsIncluded?: string;
}

export async function POST(request: NextRequest): Promise<Response> {
	// Validate the webhook to ensure it's from Whop
	const webhookData = await validateWebhook(request);

	// Handle the webhook event
	if (webhookData.action === "payment.succeeded") {
		const { id, final_amount, currency, user_id, metadata } =
			webhookData.data as {
				id: string;
				final_amount: number;
				currency: string;
				user_id?: string | null;
				metadata?: WebhookMetadata;
			};

		console.log(
			`Payment ${id} succeeded for ${user_id} with amount ${final_amount} ${currency}`,
			{ metadata }
		);

		// if you need to do work that takes a long time, use waitUntil to run it in the background
		waitUntil(
			handlePaymentSuccess(
				id,
				user_id,
				final_amount,
				metadata
			),
		);
	}

	// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
	return new Response("OK", { status: 200 });
}

async function handlePaymentSuccess(
	paymentId: string,
	whopUserId: string | null | undefined,
	amount: number,
	metadata?: WebhookMetadata
) {
	if (!whopUserId) {
		console.log("Missing user_id in payment webhook", { whopUserId, metadata });
		return;
	}

	const { userId, companyId, purchaseType, generationsIncluded } = metadata || {};

	// Try to find the user in our database by internal ID first (if it's a valid UUID)
	let dbUser = null;

	// Check if userId looks like a UUID (internal ID) vs a Whop ID (starts with "user_")
	const isInternalId = userId && !userId.startsWith('user_');

	if (isInternalId) {
		dbUser = await db.query.users.findFirst({
			where: eq(users.id, userId),
		});
	}

	// If we don't have the internal userId, try to find by whopUserId
	if (!dbUser) {
		dbUser = await db.query.users.findFirst({
			where: eq(users.whopUserId, whopUserId),
		});
	}

	// If user still not found, create them
	if (!dbUser) {
		console.log("User not found in database, creating new user", { whopUserId, companyId });
		try {
			dbUser = await UserService.getOrCreateUser({
				id: whopUserId,
				companyId: companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
			});
			console.log("Created new user from webhook", { dbUserId: dbUser.id, whopUserId });
		} catch (createError) {
			console.error("Failed to create user for payment", { whopUserId, paymentId, error: createError });
			return;
		}
	}

	if (purchaseType === 'additional') {
		// Add purchased credits to the database
		const credits = parseInt(generationsIncluded || '1', 10);

		await db.insert(purchasedCredits).values({
			userId: dbUser.id,
			whopPaymentId: paymentId,
			creditsAmount: credits,
			creditsRemaining: credits,
			amountPaid: amount.toString(),
			status: 'available',
			purchasedAt: new Date(),
			metadata: { whopUserId, companyId, purchaseType },
		});

		console.log(`Added ${credits} purchased credit(s) for user ${dbUser.id}`);
	} else if (purchaseType === 'growth') {
		const targetCompanyId = companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID!;

		// Upgrade the user's subscription to growth plan
		const [existingSubscription] = await db
			.select()
			.from(subscriptions)
			.where(and(
				eq(subscriptions.userId, dbUser.id),
				eq(subscriptions.whopCompanyId, targetCompanyId),
				eq(subscriptions.status, 'active')
			))
			.limit(1);

		if (existingSubscription) {
			await db
				.update(subscriptions)
				.set({
					planType: 'growth',
					monthlyLimit: 10,
					updatedAt: new Date(),
				})
				.where(eq(subscriptions.id, existingSubscription.id));

			console.log(`Upgraded subscription to growth for user ${dbUser.id}`);
		} else {
			// Create new subscription if doesn't exist
			const billingCycleStart = new Date();
			const billingCycleEnd = new Date();
			billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

			await db.insert(subscriptions).values({
				userId: dbUser.id,
				whopCompanyId: targetCompanyId,
				planType: 'growth',
				status: 'active',
				monthlyLimit: 10,
				currentUsage: 0,
				billingCycleStart,
				billingCycleEnd,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			console.log(`Created new growth subscription for user ${dbUser.id}`);
		}
	}
}
