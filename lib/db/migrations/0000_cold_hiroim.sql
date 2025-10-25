CREATE TYPE "public"."generation_status" AS ENUM('processing', 'completed', 'failed', 'published');--> statement-breakpoint
CREATE TYPE "public"."generation_type" AS ENUM('included', 'overage');--> statement-breakpoint
CREATE TYPE "public"."lesson_type" AS ENUM('text', 'video', 'pdf', 'quiz');--> statement-breakpoint
CREATE TYPE "public"."overage_status" AS ENUM('pending', 'charged', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pdf_status" AS ENUM('uploading', 'ready', 'processing', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."usage_event_type" AS ENUM('generation_started', 'generation_completed', 'generation_failed', 'overage_charged', 'preview_viewed', 'course_published');--> statement-breakpoint
CREATE TABLE "course_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"whop_chapter_id" varchar(255),
	"title" varchar(500) NOT NULL,
	"description" text,
	"learning_objectives" text[],
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"pdf_upload_id" uuid,
	"whop_experience_id" varchar(255),
	"course_title" varchar(500) NOT NULL,
	"status" "generation_status" DEFAULT 'processing' NOT NULL,
	"generation_type" "generation_type" NOT NULL,
	"overage_charge" numeric(10, 2) DEFAULT '0.00',
	"structure_json" jsonb,
	"ai_tokens_used" integer,
	"generation_time_ms" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "course_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"whop_lesson_id" varchar(255),
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"lesson_type" "lesson_type" DEFAULT 'text' NOT NULL,
	"order_index" integer NOT NULL,
	"estimated_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"whop_course_id" varchar(255),
	"title" varchar(500) NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overage_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"generation_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"stripe_charge_id" varchar(255),
	"status" "overage_status" DEFAULT 'pending' NOT NULL,
	"charged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdf_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" varchar(100),
	"page_count" integer,
	"extraction_status" "pdf_status" DEFAULT 'uploading' NOT NULL,
	"raw_text" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"generations_included" integer NOT NULL,
	"overage_price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"whop_membership_id" varchar(255),
	"plan_type" varchar(50) DEFAULT 'growth' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"monthly_limit" integer DEFAULT 10 NOT NULL,
	"current_usage" integer DEFAULT 0 NOT NULL,
	"billing_cycle_start" timestamp,
	"billing_cycle_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_whop_membership_id_unique" UNIQUE("whop_membership_id")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"generation_id" uuid,
	"event_type" "usage_event_type" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whop_user_id" varchar(255) NOT NULL,
	"whop_company_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"username" varchar(255),
	"company_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_whop_user_id_unique" UNIQUE("whop_user_id")
);
--> statement-breakpoint
ALTER TABLE "course_chapters" ADD CONSTRAINT "course_chapters_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_generations" ADD CONSTRAINT "course_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_generations" ADD CONSTRAINT "course_generations_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_generations" ADD CONSTRAINT "course_generations_pdf_upload_id_pdf_uploads_id_fk" FOREIGN KEY ("pdf_upload_id") REFERENCES "public"."pdf_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_chapter_id_course_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."course_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_generation_id_course_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."course_generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overage_charges" ADD CONSTRAINT "overage_charges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overage_charges" ADD CONSTRAINT "overage_charges_generation_id_course_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."course_generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_uploads" ADD CONSTRAINT "pdf_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_generation_id_course_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."course_generations"("id") ON DELETE cascade ON UPDATE no action;