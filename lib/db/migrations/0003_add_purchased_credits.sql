CREATE TYPE "public"."credit_status" AS ENUM('available', 'used', 'expired');--> statement-breakpoint
CREATE TABLE "purchased_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"whop_payment_id" varchar(255),
	"credits_amount" integer DEFAULT 1 NOT NULL,
	"credits_remaining" integer DEFAULT 1 NOT NULL,
	"amount_paid" numeric(10, 2) NOT NULL,
	"status" "credit_status" DEFAULT 'available' NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "purchased_credits_whop_payment_id_unique" UNIQUE("whop_payment_id")
);
--> statement-breakpoint
ALTER TABLE "purchased_credits" ADD CONSTRAINT "purchased_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;