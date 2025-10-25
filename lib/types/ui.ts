// UI/Frontend State Types
import { CourseStructure, ModuleStructure, ChapterStructure, LessonStructure } from './domain';

// Auth & User State
export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UserProfile {
  id: string;
  whopUserId: string;
  username: string;
  email: string;
  companyName: string;
  companyId: string;
  avatarUrl?: string;
}

// Subscription State
export interface SubscriptionState {
  plan: SubscriptionPlan;
  usage: UsageStats;
  isLoading: boolean;
}

export interface SubscriptionPlan {
  type: 'growth';
  status: 'active' | 'canceled' | 'expired';
  monthlyLimit: number;
  pricePerOverage: number;
  billingCycleEnd: Date;
}

export interface UsageStats {
  currentUsage: number;
  monthlyLimit: number;
  remainingGenerations: number;
  overageCount: number;
  totalOverageCharges: number;
  percentageUsed: number;
}

// Dashboard State
export interface DashboardState {
  generationsHistory: GenerationCard[];
  usageStats: UsageStats;
  loading: boolean;
  error: string | null;
}

export interface GenerationCard {
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

// Generation Flow State
export interface GenerateState {
  uploadedPDF: PDFUploadState | null;
  generationProgress: GenerationProgress;
  previewData: CoursePreview | null;
  error: GenerationError | null;
}

export interface PDFUploadState {
  id: string;
  filename: string;
  fileSize: number;
  uploadProgress: number;
  status: 'uploading' | 'analyzing' | 'ready' | 'error';
  error?: string;
}

export interface GenerationProgress {
  generationId: string | null;
  status:
    | 'idle'
    | 'analyzing'
    | 'structuring'
    | 'generating_content'
    | 'publishing'
    | 'complete'
    | 'error';
  currentStep: number;
  totalSteps: number;
  stepDescriptions: string[];
  estimatedTimeRemaining: number; // seconds
  message: string;
}

export interface GenerationError {
  code:
    | 'upload_failed'
    | 'analysis_failed'
    | 'generation_failed'
    | 'publish_failed'
    | 'usage_limit_exceeded';
  message: string;
  retryable: boolean;
}

// Course Preview State
export interface CoursePreview {
  generationId: string;
  title: string;
  description: string;
  modules: ModulePreview[];
  estimatedTotalMinutes: number;
  lessonCount: number;
  isPublished: boolean;
  whopCourseUrl?: string;
}

export interface ModulePreview {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  chapters: ChapterPreview[];
  isExpanded: boolean; // UI state
}

export interface ChapterPreview {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonPreview[];
  isExpanded: boolean; // UI state
}

export interface LessonPreview {
  id: string;
  title: string;
  contentPreview: string; // First 200 chars
  lessonType: 'text' | 'video' | 'pdf' | 'quiz';
  orderIndex: number;
  estimatedMinutes: number;
}

export interface PublishStatus {
  isPublishing: boolean;
  progress: number; // 0-100
  currentAction: string; // "Creating experience...", "Publishing modules..."
  error?: string;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface GenerateAPIResponse {
  generationId: string;
  status: string;
  estimatedTimeSeconds: number;
}

export interface PreviewAPIResponse {
  course: CoursePreview;
  canPublish: boolean;
  publishWarnings?: string[];
}

// Form State
export interface CourseEditForm {
  title: string;
  description: string;
  modules: ModuleEditForm[];
}

export interface ModuleEditForm {
  id: string;
  title: string;
  description: string;
  isDirty: boolean;
}

// Component Props
export interface GenerationCardProps {
  generation: GenerationCard;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
}

export interface UsageIndicatorProps {
  usage: UsageStats;
  compact?: boolean;
}

export interface CourseStructureTreeProps {
  modules: ModulePreview[];
  onModuleEdit: (moduleId: string) => void;
  onChapterEdit: (chapterId: string) => void;
  onLessonEdit: (lessonId: string) => void;
  editable: boolean;
}

export interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  acceptedTypes: string[];
  maxSizeMB: number;
  disabled: boolean;
}
