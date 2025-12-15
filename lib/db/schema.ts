import { pgTable, uuid, varchar, timestamp, text, integer, decimal, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'expired']);
export const generationStatusEnum = pgEnum('generation_status', ['processing', 'completed', 'failed', 'published']);
export const generationTypeEnum = pgEnum('generation_type', ['included', 'overage']);
export const pdfStatusEnum = pgEnum('pdf_status', ['uploading', 'ready', 'processing', 'failed']);
export const lessonTypeEnum = pgEnum('lesson_type', ['text', 'video', 'pdf', 'quiz']);
export const usageEventTypeEnum = pgEnum('usage_event_type', [
  'generation_started',
  'generation_completed',
  'generation_failed',
  'overage_charged',
  'preview_viewed',
  'course_published'
]);
export const overageStatusEnum = pgEnum('overage_status', ['pending', 'charged', 'failed']);
export const creditStatusEnum = pgEnum('credit_status', ['available', 'used', 'expired']);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  whopUserId: varchar('whop_user_id', { length: 255 }).notNull(),
  whopCompanyId: varchar('whop_company_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  username: varchar('username', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Composite unique constraint: each user can have one record per company
  uniqueUserCompany: sql`UNIQUE (whop_user_id, whop_company_id)`,
}));

// Subscriptions Table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  whopMembershipId: varchar('whop_membership_id', { length: 255 }).unique(),
  planType: varchar('plan_type', { length: 50 }).default('growth').notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  monthlyLimit: integer('monthly_limit').default(10).notNull(),
  currentUsage: integer('current_usage').default(0).notNull(),
  billingCycleStart: timestamp('billing_cycle_start'),
  billingCycleEnd: timestamp('billing_cycle_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// PDF Uploads Table
export const pdfUploads = pgTable('pdf_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  filename: varchar('filename', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  pageCount: integer('page_count'),
  extractionStatus: pdfStatusEnum('extraction_status').default('uploading').notNull(),
  rawText: text('raw_text'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

// Course Generations Table
export const courseGenerations = pgTable('course_generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }).notNull(),
  pdfUploadId: uuid('pdf_upload_id').references(() => pdfUploads.id, { onDelete: 'set null' }),
  whopExperienceId: varchar('whop_experience_id', { length: 255 }),
  courseTitle: varchar('course_title', { length: 500 }).notNull(),
  status: generationStatusEnum('status').default('processing').notNull(),
  generationType: generationTypeEnum('generation_type').notNull(),
  overageCharge: decimal('overage_charge', { precision: 10, scale: 2 }).default('0.00'),
  structureJson: jsonb('structure_json'),
  aiTokensUsed: integer('ai_tokens_used'),
  generationTimeMs: integer('generation_time_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Course Modules Table
export const courseModules = pgTable('course_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  generationId: uuid('generation_id').references(() => courseGenerations.id, { onDelete: 'cascade' }).notNull(),
  whopCourseId: varchar('whop_course_id', { length: 255 }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Course Chapters Table
export const courseChapters = pgTable('course_chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').references(() => courseModules.id, { onDelete: 'cascade' }).notNull(),
  whopChapterId: varchar('whop_chapter_id', { length: 255 }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  learningObjectives: text('learning_objectives').array(),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Course Lessons Table
export const courseLessons = pgTable('course_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: uuid('chapter_id').references(() => courseChapters.id, { onDelete: 'cascade' }).notNull(),
  whopLessonId: varchar('whop_lesson_id', { length: 255 }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  lessonType: lessonTypeEnum('lesson_type').default('text').notNull(),
  orderIndex: integer('order_index').notNull(),
  estimatedMinutes: integer('estimated_minutes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Usage Events Table (Analytics)
export const usageEvents = pgTable('usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  generationId: uuid('generation_id').references(() => courseGenerations.id, { onDelete: 'cascade' }),
  eventType: usageEventTypeEnum('event_type').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Overage Charges Table
export const overageCharges = pgTable('overage_charges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  generationId: uuid('generation_id').references(() => courseGenerations.id, { onDelete: 'cascade' }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  status: overageStatusEnum('status').default('pending').notNull(),
  chargedAt: timestamp('charged_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Subscription Plans Reference Table
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  generationsIncluded: integer('generations_included').notNull(),
  overagePrice: decimal('overage_price', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Purchased Credits Table - tracks additional generation credits purchased
export const purchasedCredits = pgTable('purchased_credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  whopPaymentId: varchar('whop_payment_id', { length: 255 }).unique(),
  creditsAmount: integer('credits_amount').default(1).notNull(),
  creditsRemaining: integer('credits_remaining').default(1).notNull(),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull(),
  status: creditStatusEnum('status').default('available').notNull(),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
  usedAt: timestamp('used_at'),
  metadata: jsonb('metadata'),
});

// Lesson Progress Table
export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  whopLessonId: varchar('whop_lesson_id', { length: 255 }).notNull(),
  whopExperienceId: varchar('whop_experience_id', { length: 255 }).notNull(),
  completed: boolean('completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  courseGenerations: many(courseGenerations),
  pdfUploads: many(pdfUploads),
  usageEvents: many(usageEvents),
  overageCharges: many(overageCharges),
  lessonProgress: many(lessonProgress),
  purchasedCredits: many(purchasedCredits),
}));

export const purchasedCreditsRelations = relations(purchasedCredits, ({ one }) => ({
  user: one(users, {
    fields: [purchasedCredits.userId],
    references: [users.id],
  }),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [lessonProgress.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  courseGenerations: many(courseGenerations),
}));

export const pdfUploadsRelations = relations(pdfUploads, ({ one, many }) => ({
  user: one(users, {
    fields: [pdfUploads.userId],
    references: [users.id],
  }),
  courseGenerations: many(courseGenerations),
}));

export const courseGenerationsRelations = relations(courseGenerations, ({ one, many }) => ({
  user: one(users, {
    fields: [courseGenerations.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [courseGenerations.subscriptionId],
    references: [subscriptions.id],
  }),
  pdfUpload: one(pdfUploads, {
    fields: [courseGenerations.pdfUploadId],
    references: [pdfUploads.id],
  }),
  modules: many(courseModules),
  usageEvents: many(usageEvents),
  overageCharges: many(overageCharges),
}));

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  generation: one(courseGenerations, {
    fields: [courseModules.generationId],
    references: [courseGenerations.id],
  }),
  chapters: many(courseChapters),
}));

export const courseChaptersRelations = relations(courseChapters, ({ one, many }) => ({
  module: one(courseModules, {
    fields: [courseChapters.moduleId],
    references: [courseModules.id],
  }),
  lessons: many(courseLessons),
}));

export const courseLessonsRelations = relations(courseLessons, ({ one }) => ({
  chapter: one(courseChapters, {
    fields: [courseLessons.chapterId],
    references: [courseChapters.id],
  }),
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  user: one(users, {
    fields: [usageEvents.userId],
    references: [users.id],
  }),
  generation: one(courseGenerations, {
    fields: [usageEvents.generationId],
    references: [courseGenerations.id],
  }),
}));

export const overageChargesRelations = relations(overageCharges, ({ one }) => ({
  user: one(users, {
    fields: [overageCharges.userId],
    references: [users.id],
  }),
  generation: one(courseGenerations, {
    fields: [overageCharges.generationId],
    references: [courseGenerations.id],
  }),
}));
