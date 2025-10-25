// Domain/Service Layer Types

// Course Structure Models
export interface CourseStructure {
  title: string;
  description: string;
  modules: ModuleStructure[];
}

export interface ModuleStructure {
  title: string;
  description: string;
  order: number;
  chapters: ChapterStructure[];
}

export interface ChapterStructure {
  title: string;
  description: string;
  learningObjectives: string[];
  order: number;
  lessons: LessonStructure[];
}

export interface LessonStructure {
  title: string;
  content: string;
  lessonType: 'text' | 'video' | 'pdf' | 'quiz';
  order: number;
  estimatedMinutes?: number;
}

// AI Service Types
export interface AIGenerationConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  structurePromptVersion: string;
  contentPromptVersion: string;
}

export interface PDFAnalysisRequest {
  pdfText: string;
  filename: string;
}

export interface PDFAnalysisResponse {
  suggestedTitle: string;
  suggestedDescription: string;
  detectedTopics: string[];
  estimatedLessons: number;
  structure: {
    modules: {
      title: string;
      description: string;
      topics: string[];
    }[];
  };
}

export interface ContentGenerationRequest {
  structure: PDFAnalysisResponse;
  pdfText: string;
  tone?: 'professional' | 'casual' | 'technical';
}

export interface ContentGenerationResponse {
  courseTitle: string;
  courseDescription: string;
  modules: {
    title: string;
    description: string;
    chapters: {
      title: string;
      description: string;
      learningObjectives: string[];
      lessons: {
        title: string;
        content: string;
        estimatedMinutes: number;
      }[];
    }[];
  }[];
}

// Service DTOs
export interface GenerateCourseRequest {
  userId: string;
  pdfUploadId: string;
  customTitle?: string;
}

export interface GenerateCourseResponse {
  generationId: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedTimeSeconds: number;
  message: string;
}

export interface CourseGenerationResult {
  success: boolean;
  generationId: string;
  whopExperienceId?: string;
  whopCourseUrl?: string;
  structure: CourseStructure;
  wasOverage: boolean;
  overageCharge?: number;
  error?: string;
}

export interface UsageLimitCheck {
  hasAvailableGenerations: boolean;
  currentUsage: number;
  monthlyLimit: number;
  remainingGenerations: number;
  isOverage: boolean;
  overageCost: number;
}

export interface PublishToWhopRequest {
  generationId: string;
  userId: string;
  whopCompanyId: string;
  structure: CourseStructure;
}

export interface PublishToWhopResponse {
  success: boolean;
  experienceId: string;
  courseUrl: string;
  modulesCreated: number;
  chaptersCreated: number;
  lessonsCreated: number;
  error?: string;
}

// Usage & Subscription Types
export interface UsageSummary {
  currentMonth: {
    generationsUsed: number;
    generationsIncluded: number;
    overageCount: number;
    overageAmount: number;
  };
  plan: {
    name: string;
    price: number;
    generationsIncluded: number;
    overagePrice: number;
  };
}
