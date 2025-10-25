import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from '../db/schema';

// Database Model Types (Select)
export type User = InferSelectModel<typeof schema.users>;
export type Subscription = InferSelectModel<typeof schema.subscriptions>;
export type PdfUpload = InferSelectModel<typeof schema.pdfUploads>;
export type CourseGeneration = InferSelectModel<typeof schema.courseGenerations>;
export type CourseModule = InferSelectModel<typeof schema.courseModules>;
export type CourseChapter = InferSelectModel<typeof schema.courseChapters>;
export type CourseLesson = InferSelectModel<typeof schema.courseLessons>;
export type UsageEvent = InferSelectModel<typeof schema.usageEvents>;
export type OverageCharge = InferSelectModel<typeof schema.overageCharges>;
export type SubscriptionPlan = InferSelectModel<typeof schema.subscriptionPlans>;

// Database Model Types (Insert)
export type NewUser = InferInsertModel<typeof schema.users>;
export type NewSubscription = InferInsertModel<typeof schema.subscriptions>;
export type NewPdfUpload = InferInsertModel<typeof schema.pdfUploads>;
export type NewCourseGeneration = InferInsertModel<typeof schema.courseGenerations>;
export type NewCourseModule = InferInsertModel<typeof schema.courseModules>;
export type NewCourseChapter = InferInsertModel<typeof schema.courseChapters>;
export type NewCourseLesson = InferInsertModel<typeof schema.courseLessons>;
export type NewUsageEvent = InferInsertModel<typeof schema.usageEvents>;
export type NewOverageCharge = InferInsertModel<typeof schema.overageCharges>;
export type NewSubscriptionPlan = InferInsertModel<typeof schema.subscriptionPlans>;

// Enum Types
export type SubscriptionStatus = 'active' | 'canceled' | 'expired';
export type GenerationStatus = 'processing' | 'completed' | 'failed' | 'published';
export type GenerationType = 'included' | 'overage';
export type PdfStatus = 'uploading' | 'ready' | 'processing' | 'failed';
export type LessonType = 'text' | 'video' | 'pdf' | 'quiz';
export type UsageEventType =
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'overage_charged'
  | 'preview_viewed'
  | 'course_published';
export type OverageStatus = 'pending' | 'charged' | 'failed';
