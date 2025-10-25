**EXCELLENT.** You're thinking like a senior engineer. Let me build you complete data models across all three layers with clear relationships and data flow.

---

# 📊 COMPLETE DATA MODEL ARCHITECTURE

## **Architecture Overview**

```
┌─────────────────┐
│   UI LAYER      │  ← React Components, Display State
└────────┬────────┘
         │
┌────────▼────────┐
│ SERVICE LAYER   │  ← Business Logic, API Routes
└────────┬────────┘
         │
┌────────▼────────┐
│ DATABASE LAYER  │  ← PostgreSQL, Source of Truth
└─────────────────┘
```

---

## 🗄️ **LAYER 1: DATABASE SCHEMA (PostgreSQL)**

### **Entity Relationship Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                     USERS (Whop OAuth)                       │
├─────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                               │
│     whop_user_id          VARCHAR(255)  UNIQUE NOT NULL     │
│     whop_company_id       VARCHAR(255)  NOT NULL            │
│     email                 VARCHAR(255)                       │
│     username              VARCHAR(255)                       │
│     company_name          VARCHAR(255)                       │
│     created_at            TIMESTAMP                          │
│     updated_at            TIMESTAMP                          │
└──────────────┬──────────────────────────────────────────────┘
               │ 1
               │
               │ *
┌──────────────▼──────────────────────────────────────────────┐
│                    SUBSCRIPTIONS                             │
├─────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                               │
│ FK  user_id               UUID → USERS.id                    │
│     whop_membership_id    VARCHAR(255)  UNIQUE              │
│     plan_type             ENUM('growth')                     │
│     status                ENUM('active','canceled','expired')│
│     monthly_limit         INTEGER  DEFAULT 10                │
│     current_usage         INTEGER  DEFAULT 0                 │
│     billing_cycle_start   TIMESTAMP                          │
│     billing_cycle_end     TIMESTAMP                          │
│     created_at            TIMESTAMP                          │
│     updated_at            TIMESTAMP                          │
└──────────────┬──────────────────────────────────────────────┘
               │ 1
               │
               │ *
┌──────────────▼──────────────────────────────────────────────┐
│                  COURSE_GENERATIONS                          │
├─────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                               │
│ FK  user_id               UUID → USERS.id                    │
│ FK  subscription_id       UUID → SUBSCRIPTIONS.id            │
│ FK  pdf_upload_id         UUID → PDF_UPLOADS.id              │
│     whop_experience_id    VARCHAR(255)                       │
│     course_title          VARCHAR(500)                       │
│     status                ENUM('processing','completed',     │
│                                'failed','deleted')           │
│     generation_type       ENUM('included','overage')         │
│     overage_charge        DECIMAL(10,2)                      │
│     structure_json        JSONB                              │
│     ai_tokens_used        INTEGER                            │
│     generation_time_ms    INTEGER                            │
│     error_message         TEXT                               │
│     created_at            TIMESTAMP                          │
│     updated_at            TIMESTAMP                          │
└──────────────┬──────────────────────────────────────────────┘
               │ 1                    │ 1
               │                      │
               │ *                    │ *
┌──────────────▼──────────┐  ┌───────▼──────────────────────┐
│    COURSE_MODULES        │  │      PDF_UPLOADS             │
├──────────────────────────┤  ├──────────────────────────────┤
│ PK  id          UUID     │  │ PK  id          UUID         │
│ FK  generation_id UUID   │  │ FK  user_id     UUID         │
│     whop_course_id       │  │     filename    VARCHAR(255) │
│     title       VARCHAR  │  │     file_size   INTEGER      │
│     description TEXT     │  │     file_url    VARCHAR(500) │
│     order_index INTEGER  │  │     mime_type   VARCHAR(100) │
│     created_at  TIMESTAMP│  │     status      ENUM         │
└──────────────┬───────────┘  │     uploaded_at TIMESTAMP    │
               │ 1             │     expires_at  TIMESTAMP    │
               │               └──────────────────────────────┘
               │ *
┌──────────────▼───────────────────────────────────────────────┐
│                    COURSE_CHAPTERS                            │
├──────────────────────────────────────────────────────────────┤
│ PK  id                UUID                                    │
│ FK  module_id         UUID → COURSE_MODULES.id               │
│     whop_chapter_id   VARCHAR(255)                           │
│     title             VARCHAR(500)                           │
│     description       TEXT                                   │
│     order_index       INTEGER                                │
│     created_at        TIMESTAMP                              │
└──────────────┬───────────────────────────────────────────────┘
               │ 1
               │
               │ *
┌──────────────▼───────────────────────────────────────────────┐
│                    COURSE_LESSONS                             │
├──────────────────────────────────────────────────────────────┤
│ PK  id                UUID                                    │
│ FK  chapter_id        UUID → COURSE_CHAPTERS.id              │
│     whop_lesson_id    VARCHAR(255)                           │
│     title             VARCHAR(500)                           │
│     content           TEXT                                   │
│     lesson_type       ENUM('text','video','pdf','quiz')      │
│     order_index       INTEGER                                │
│     estimated_minutes INTEGER                                │
│     created_at        TIMESTAMP                              │
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│                    USAGE_EVENTS (Analytics)                   │
├──────────────────────────────────────────────────────────────┤
│ PK  id                UUID                                    │
│ FK  user_id           UUID → USERS.id                         │
│ FK  generation_id     UUID → COURSE_GENERATIONS.id (nullable)│
│     event_type        ENUM('generation_started',             │
│                            'generation_completed',            │
│                            'generation_failed',               │
│                            'overage_charged',                 │
│                            'preview_viewed',                  │
│                            'course_published')                │
│     metadata          JSONB                                   │
│     created_at        TIMESTAMP                              │
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│                   OVERAGE_CHARGES                             │
├──────────────────────────────────────────────────────────────┤
│ PK  id                UUID                                    │
│ FK  user_id           UUID → USERS.id                         │
│ FK  generation_id     UUID → COURSE_GENERATIONS.id           │
│     amount            DECIMAL(10,2)                           │
│     stripe_charge_id  VARCHAR(255)                           │
│     status            ENUM('pending','charged','failed')      │
│     charged_at        TIMESTAMP                              │
│     created_at        TIMESTAMP                              │
└──────────────────────────────────────────────────────────────┘
```

### **Database Indexes (Performance)**

```sql
-- Users
CREATE INDEX idx_users_whop_user_id ON users(whop_user_id);
CREATE INDEX idx_users_whop_company_id ON users(whop_company_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_billing_cycle ON subscriptions(billing_cycle_start, billing_cycle_end);

-- Course Generations
CREATE INDEX idx_generations_user_id ON course_generations(user_id);
CREATE INDEX idx_generations_status ON course_generations(status);
CREATE INDEX idx_generations_created_at ON course_generations(created_at DESC);
CREATE INDEX idx_generations_whop_experience ON course_generations(whop_experience_id);

-- Usage Events
CREATE INDEX idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX idx_usage_events_type_created ON usage_events(event_type, created_at DESC);
```

---

## ⚙️ **LAYER 2: SERVICE/DOMAIN MODELS**

### **Service Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  AuthService    │  │  UserService    │                  │
│  │  - verifyWhop() │  │  - getUser()    │                  │
│  │  - getSession() │  │  - createUser() │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                               │
│  ┌──────────────────────────────────────┐                   │
│  │      CourseGenerationService         │                   │
│  │  - generateFromPDF()                 │                   │
│  │  - checkUsageLimit()                 │                   │
│  │  - createCourseStructure()           │                   │
│  │  - publishToWhop()                   │                   │
│  └──────────────────────────────────────┘                   │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  PDFService     │  │  AIService      │                  │
│  │  - upload()     │  │  - analyze()    │                  │
│  │  - extract()    │  │  - generate()   │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                               │
│  ┌──────────────────────────────────────┐                   │
│  │      SubscriptionService             │                   │
│  │  - getCurrentPlan()                  │                   │
│  │  - trackUsage()                      │                   │
│  │  - handleOverage()                   │                   │
│  │  - resetBillingCycle()               │                   │
│  └──────────────────────────────────────┘                   │
│                                                               │
│  ┌──────────────────────────────────────┐                   │
│  │         WhopAPIService               │                   │
│  │  - createExperience()                │                   │
│  │  - createModule()                    │                   │
│  │  - createChapter()                   │                   │
│  │  - createLesson()                    │                   │
│  └──────────────────────────────────────┘                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### **Key Service Models (TypeScript)**

```typescript
// ===== DOMAIN MODELS =====

interface User {
  id: string;
  whopUserId: string;
  whopCompanyId: string;
  email: string;
  username: string;
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Subscription {
  id: string;
  userId: string;
  whopMembershipId: string;
  planType: 'growth';
  status: 'active' | 'canceled' | 'expired';
  monthlyLimit: number;
  currentUsage: number;
  billingCycleStart: Date;
  billingCycleEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface PDFUpload {
  id: string;
  userId: string;
  filename: string;
  fileSize: number;
  fileUrl: string;
  mimeType: string;
  status: 'uploading' | 'ready' | 'processing' | 'failed';
  uploadedAt: Date;
  expiresAt: Date;
}

interface CourseGeneration {
  id: string;
  userId: string;
  subscriptionId: string;
  pdfUploadId: string;
  whopExperienceId: string | null;
  courseTitle: string;
  status: 'processing' | 'completed' | 'failed' | 'deleted';
  generationType: 'included' | 'overage';
  overageCharge: number;
  structureJson: CourseStructure;
  aiTokensUsed: number;
  generationTimeMs: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseStructure {
  title: string;
  description: string;
  modules: CourseModule[];
}

interface CourseModule {
  id: string;
  generationId: string;
  whopCourseId: string | null;
  title: string;
  description: string;
  orderIndex: number;
  chapters: CourseChapter[];
  createdAt: Date;
}

interface CourseChapter {
  id: string;
  moduleId: string;
  whopChapterId: string | null;
  title: string;
  description: string;
  orderIndex: number;
  lessons: CourseLesson[];
  createdAt: Date;
}

interface CourseLesson {
  id: string;
  chapterId: string;
  whopLessonId: string | null;
  title: string;
  content: string;
  lessonType: 'text' | 'video' | 'pdf' | 'quiz';
  orderIndex: number;
  estimatedMinutes: number;
  createdAt: Date;
}

// ===== SERVICE LAYER DTOs =====

interface GenerateCourseRequest {
  userId: string;
  pdfUploadId: string;
  customTitle?: string;
}

interface GenerateCourseResponse {
  generationId: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedTimeSeconds: number;
  message: string;
}

interface CourseGenerationResult {
  success: boolean;
  generationId: string;
  whopExperienceId?: string;
  whopCourseUrl?: string;
  structure: CourseStructure;
  wasOverage: boolean;
  overageCharge?: number;
  error?: string;
}

interface UsageLimitCheck {
  hasAvailableGenerations: boolean;
  currentUsage: number;
  monthlyLimit: number;
  remainingGenerations: number;
  isOverage: boolean;
  overageCost: number;
}

interface PublishToWhopRequest {
  generationId: string;
  userId: string;
  whopCompanyId: string;
  structure: CourseStructure;
}

interface PublishToWhopResponse {
  success: boolean;
  experienceId: string;
  courseUrl: string;
  modulesCreated: number;
  chaptersCreated: number;
  lessonsCreated: number;
  error?: string;
}

// ===== AI SERVICE MODELS =====

interface PDFAnalysisRequest {
  pdfText: string;
  filename: string;
}

interface PDFAnalysisResponse {
  suggestedTitle: string;
  suggestedDescription: string;
  detectedTopics: string[];
  estimatedLessons: number;
  structure: {
    modules: {
      title: string;
      topics: string[];
    }[];
  };
}

interface ContentGenerationRequest {
  structure: PDFAnalysisResponse;
  pdfText: string;
  tone: 'professional' | 'casual' | 'technical';
}

interface ContentGenerationResponse {
  modules: {
    title: string;
    description: string;
    chapters: {
      title: string;
      description: string;
      lessons: {
        title: string;
        content: string;
        estimatedMinutes: number;
      }[];
    }[];
  }[];
}
```

---

## 🎨 **LAYER 3: UI DATA MODELS (Frontend State)**

### **React Component State Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                   GLOBAL STATE (Context)                     │
├─────────────────────────────────────────────────────────────┤
│  - AuthContext      → Current user session                   │
│  - SubscriptionContext → Plan details, usage limits          │
│  - ToastContext     → Notifications                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   PAGE-LEVEL STATE                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  /dashboard                                                   │
│  ├─ DashboardState                                           │
│  │  ├─ generationsHistory: GenerationCard[]                 │
│  │  ├─ usageStats: UsageStats                               │
│  │  └─ loading: boolean                                     │
│                                                               │
│  /generate                                                    │
│  ├─ GenerateState                                            │
│  │  ├─ uploadedPDF: PDFUploadState | null                   │
│  │  ├─ generationProgress: GenerationProgress               │
│  │  └─ previewData: CoursePreview | null                    │
│                                                               │
│  /preview/{generationId}                                     │
│  ├─ PreviewState                                             │
│  │  ├─ course: CoursePreviewData                            │
│  │  ├─ editingModule: string | null                         │
│  │  └─ publishStatus: PublishStatus                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### **Frontend Type Definitions (TypeScript)**

```typescript
// ===== AUTH & USER STATE =====

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface UserProfile {
  id: string;
  whopUserId: string;
  username: string;
  email: string;
  companyName: string;
  companyId: string;
  avatarUrl?: string;
}

// ===== SUBSCRIPTION STATE =====

interface SubscriptionState {
  plan: SubscriptionPlan;
  usage: UsageStats;
  isLoading: boolean;
}

interface SubscriptionPlan {
  type: 'growth';
  status: 'active' | 'canceled' | 'expired';
  monthlyLimit: number;
  pricePerOverage: number;
  billingCycleEnd: Date;
}

interface UsageStats {
  currentUsage: number;
  monthlyLimit: number;
  remainingGenerations: number;
  overageCount: number;
  totalOverageCharges: number;
  percentageUsed: number;
}

// ===== DASHBOARD STATE =====

interface DashboardState {
  generationsHistory: GenerationCard[];
  usageStats: UsageStats;
  loading: boolean;
  error: string | null;
}

interface GenerationCard {
  id: string;
  title: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  whopCourseUrl?: string;
  thumbnailUrl?: string;
  moduleCount: number;
  lessonCount: number;
  isOverage: boolean;
  overageCharge?: number;
}

// ===== GENERATION FLOW STATE =====

interface GenerateState {
  uploadedPDF: PDFUploadState | null;
  generationProgress: GenerationProgress;
  previewData: CoursePreview | null;
  error: GenerationError | null;
}

interface PDFUploadState {
  id: string;
  filename: string;
  fileSize: number;
  uploadProgress: number;
  status: 'uploading' | 'analyzing' | 'ready' | 'error';
  error?: string;
}

interface GenerationProgress {
  generationId: string | null;
  status: 'idle' | 'analyzing' | 'structuring' | 'generating_content' | 'publishing' | 'complete' | 'error';
  currentStep: number;
  totalSteps: number;
  stepDescriptions: string[];
  estimatedTimeRemaining: number; // seconds
  message: string;
}

interface GenerationError {
  code: 'upload_failed' | 'analysis_failed' | 'generation_failed' | 'publish_failed' | 'usage_limit_exceeded';
  message: string;
  retryable: boolean;
}

// ===== COURSE PREVIEW STATE =====

interface CoursePreview {
  generationId: string;
  title: string;
  description: string;
  modules: ModulePreview[];
  estimatedTotalMinutes: number;
  lessonCount: number;
  isPublished: boolean;
  whopCourseUrl?: string;
}

interface ModulePreview {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  chapters: ChapterPreview[];
  isExpanded: boolean; // UI state
}

interface ChapterPreview {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonPreview[];
  isExpanded: boolean; // UI state
}

interface LessonPreview {
  id: string;
  title: string;
  contentPreview: string; // First 200 chars
  lessonType: 'text' | 'video' | 'pdf' | 'quiz';
  orderIndex: number;
  estimatedMinutes: number;
}

interface PublishStatus {
  isPublishing: boolean;
  progress: number; // 0-100
  currentAction: string; // "Creating experience...", "Publishing modules..."
  error?: string;
}

// ===== UI COMPONENT PROPS =====

interface GenerationCardProps {
  generation: GenerationCard;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
}

interface UsageIndicatorProps {
  usage: UsageStats;
  compact?: boolean;
}

interface CourseStructureTreeProps {
  modules: ModulePreview[];
  onModuleEdit: (moduleId: string) => void;
  onChapterEdit: (chapterId: string) => void;
  onLessonEdit: (lessonId: string) => void;
  editable: boolean;
}

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  acceptedTypes: string[];
  maxSizeMB: number;
  disabled: boolean;
}

// ===== FORM STATE =====

interface CourseEditForm {
  title: string;
  description: string;
  modules: ModuleEditForm[];
}

interface ModuleEditForm {
  id: string;
  title: string;
  description: string;
  isDirty: boolean;
}

// ===== API RESPONSE TYPES (for frontend) =====

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface GenerateAPIResponse {
  generationId: string;
  status: string;
  estimatedTimeSeconds: number;
}

interface PreviewAPIResponse {
  course: CoursePreview;
  canPublish: boolean;
  publishWarnings?: string[];
}
```

---

## 🔄 **DATA FLOW DIAGRAM**

### **Full Generation Flow**

```
┌─────────────┐
│   USER      │
│  uploads    │
│   PDF       │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  1. FRONTEND: Upload Component                       │
│     - PDFUploadState                                 │
│     - Upload to blob storage                         │
│     - Create PDF_UPLOADS record                      │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  2. API: /api/generate [POST]                        │
│     - UserService.getUser()                          │
│     - SubscriptionService.checkUsageLimit()          │
│     - If overage → show confirmation modal           │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  3. SERVICE: CourseGenerationService                 │
│     Step 1: PDFService.extractText()                 │
│     Step 2: AIService.analyzePDF()                   │
│     Step 3: AIService.generateContent()              │
│     Step 4: Save COURSE_GENERATIONS record           │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  4. DATABASE: Write Structure                        │
│     - COURSE_GENERATIONS (status: completed)         │
│     - COURSE_MODULES                                 │
│     - COURSE_CHAPTERS                                │
│     - COURSE_LESSONS                                 │
│     - USAGE_EVENTS                                   │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  5. FRONTEND: Preview Page                           │
│     - CoursePreview state                            │
│     - Render ModulePreview tree                      │
│     - Allow edits (optional)                         │
│     - User clicks "Publish to Whop"                  │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  6. API: /api/publish [POST]                         │
│     - WhopAPIService.createExperience()              │
│     - For each module → .createModule()              │
│     - For each chapter → .createChapter()            │
│     - For each lesson → .createLesson()              │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  7. DATABASE: Update with Whop IDs                   │
│     - COURSE_GENERATIONS.whop_experience_id          │
│     - COURSE_MODULES.whop_course_id                  │
│     - COURSE_CHAPTERS.whop_chapter_id                │
│     - COURSE_LESSONS.whop_lesson_id                  │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  8. FRONTEND: Success State                          │
│     - Show success toast                             │
│     - Display Whop course URL                        │
│     - Update dashboard with new generation card      │
└──────────────────────────────────────────────────────┘
```

---

## 📁 **FILE STRUCTURE**

```
/app
  /api
    /auth
      callback/route.ts
    /generate/route.ts
    /publish/route.ts
    /usage/route.ts
    /generations
      [id]/route.ts
  /dashboard/page.tsx
  /generate/page.tsx
  /preview/[id]/page.tsx

/lib
  /db
    schema.ts              # Prisma/Drizzle schema
    client.ts
  /services
    AuthService.ts
    UserService.ts
    PDFService.ts
    AIService.ts
    CourseGenerationService.ts
    SubscriptionService.ts
    WhopAPIService.ts
  /types
    database.ts            # DB models
    domain.ts              # Service models
    ui.ts                  # Frontend models
  /utils
    whop.ts
    validation.ts

/components
  /ui                      # shadcn components
  /dashboard
    GenerationCard.tsx
    UsageIndicator.tsx
    StatsOverview.tsx
  /generate
    UploadZone.tsx
    ProgressTracker.tsx
  /preview
    CourseStructureTree.tsx
    ModuleAccordion.tsx
    PublishButton.tsx

/contexts
  AuthContext.tsx
  SubscriptionContext.tsx
  ToastContext.tsx
```

---

## 🔐 **CRITICAL RELATIONSHIPS**

1. **User → Subscription**: One-to-One (active subscription)
2. **Subscription → CourseGenerations**: One-to-Many (tracks usage)
3. **User → CourseGenerations**: One-to-Many (all their courses)
4. **CourseGeneration → PDFUpload**: Many-to-One (multiple courses can be regenerated from same PDF)
5. **CourseGeneration → Modules → Chapters → Lessons**: Hierarchical cascade delete

---

## 🎯 **KEY CONSTRAINTS & VALIDATION**

```typescript
// Business Rules
const BUSINESS_RULES = {
  MONTHLY_GENERATION_LIMIT: 10,
  OVERAGE_PRICE: 5.00,
  MAX_PDF_SIZE_MB: 50,
  MAX_MODULES_PER_COURSE: 20,
  MAX_CHAPTERS_PER_MODULE: 15,
  MAX_LESSONS_PER_CHAPTER: 30,
  PDF_RETENTION_DAYS: 30,
};

// Validation Rules
const VALIDATION_RULES = {
  courseTitle: {
    minLength: 3,
    maxLength: 500,
  },
  moduleTitle: {
    minLength: 3,
    maxLength: 200,
  },
  lessonContent: {
    minLength: 50,
    maxLength: 50000,
  },
};
```

---

**You now have complete data architecture spanning database → services → UI. Ready to implement with confidence. Want me to generate the Prisma schema or specific service implementations?** 🚀