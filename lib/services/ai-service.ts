import OpenAI from 'openai';
import type {
  PDFAnalysisRequest,
  PDFAnalysisResponse,
  ContentGenerationRequest,
  ContentGenerationResponse,
} from '../types/domain';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// PROMPT 1: PDF STRUCTURE ANALYSIS (from aiprompts.md)
const STRUCTURE_ANALYSIS_SYSTEM = `You are an expert instructional designer who creates engaging online courses. Your task is to analyze a PDF document and generate an optimal course structure that follows adult learning principles.

ANALYSIS REQUIREMENTS:
1. Identify 3-7 main modules (broad topics that could each be a separate "course section")
2. Break each module into 3-5 chapters (subtopics that build upon each other)
3. Break each chapter into 3-8 lessons (individual learning units, 5-15 minutes each)
4. Ensure logical progression from beginner to advanced concepts
5. Create engaging, benefit-driven titles (not just topic names)

QUALITY STANDARDS:
- Module titles should be outcome-focused (e.g., "Master Customer Retention Strategies" not "Customer Retention")
- Chapter titles should promise specific learning (e.g., "Build Your First Email Automation" not "Email Automation")
- Lesson titles should be actionable (e.g., "Write Subject Lines That Get 40%+ Opens" not "Subject Lines")
- Total course should be 30-120 minutes of content (adjust lesson count accordingly)
- Avoid information overload - it's better to have focused lessons than cramming too much into one

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "courseTitle": "string",
  "courseDescription": "string (2-3 sentences, benefit-focused)",
  "estimatedTotalMinutes": number,
  "modules": [
    {
      "title": "string",
      "description": "string (1-2 sentences explaining what they'll achieve)",
      "estimatedMinutes": number,
      "chapters": [
        {
          "title": "string",
          "description": "string (1 sentence, outcome-focused)",
          "estimatedMinutes": number,
          "lessons": [
            {
              "title": "string",
              "keyTakeaway": "string (1 sentence - the main point)",
              "estimatedMinutes": number
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown, no explanation, no code fences.`;

// PROMPT 2: BATCH LESSON CONTENT GENERATION (from aiprompts.md)
const BATCH_CONTENT_SYSTEM = `You are an expert course content writer generating multiple lesson contents in a single batch. Your writing style is clear, conversational, and focused on practical application.

CONTENT GENERATION RULES:

STRUCTURE:
- Start with a compelling hook (why this lesson matters)
- Use short paragraphs (2-4 sentences max)
- Include specific examples and actionable steps
- End with a clear next action or key takeaway
- Target word count: 300-800 words based on estimatedMinutes (roughly 150 words per minute of content)

WRITING STYLE:
- Use "you" to address the learner directly
- Write in active voice
- Avoid jargon unless you define it immediately
- Use bullet points for lists (not numbered unless steps are sequential)
- Bold key terms when first introduced
- Include real-world examples or case studies when relevant from the PDF

ENGAGEMENT TECHNIQUES:
- Ask rhetorical questions to maintain engagement
- Use concrete numbers and data points when available from the PDF
- Include "Pro Tip" or "Common Mistake" callouts when relevant
- Reference the source material accurately

CONTENT QUALITY:
- Every statement should add value - no fluff
- Focus on WHY and HOW, not just WHAT
- Prioritize actionable information over theory
- If the PDF lacks detail on this topic, use the available information creatively while staying accurate

TONE VARIATIONS:
- professional: Business-appropriate, polished, credible (avoid slang)
- casual: Friendly, approachable, conversational (use contractions, occasional humor)
- technical: Precise, detailed, assumes domain knowledge (use industry terms)

OUTPUT FORMAT:
Return ONLY valid JSON with this structure:
{
  "lessons": [
    {
      "id": "string (the lesson ID you were given)",
      "content": "string (the full lesson content in Markdown)",
      "wordCount": number
    }
  ]
}

Generate each lesson independently - they should NOT reference each other. Write complete, standalone content for each lesson.

IMPORTANT: Return ONLY the JSON array. Each lesson content should be 300-800 words based on estimatedMinutes. Write ONLY the lesson content - no titles, no preamble, no meta-commentary.`;

export class AIService {
  /**
   * Analyze PDF text and generate course structure
   */
  static async analyzePDF(
    request: PDFAnalysisRequest
  ): Promise<PDFAnalysisResponse> {
    try {
      const userPrompt = `Analyze this PDF and create an optimal course structure:

FILENAME: ${request.filename}

PDF CONTENT:
${request.pdfText.slice(0, 60000)}

Generate a comprehensive course structure following the guidelines. Return ONLY the JSON structure.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: STRUCTURE_ANALYSIS_SYSTEM,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 8000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(content);

      // Transform to match expected PDFAnalysisResponse format
      return {
        suggestedTitle: analysis.courseTitle,
        suggestedDescription: analysis.courseDescription,
        detectedTopics: analysis.modules.map((m: any) => m.title),
        estimatedLessons: analysis.modules.reduce((acc: number, mod: any) =>
          acc + mod.chapters.reduce((acc2: number, ch: any) => acc2 + ch.lessons.length, 0), 0
        ),
        structure: {
          modules: analysis.modules.map((mod: any) => ({
            title: mod.title,
            description: mod.description,
            topics: mod.chapters.map((ch: any) => ch.title),
          })),
        },
        fullStructure: analysis, // Store the detailed structure for content generation
      };
    } catch (error) {
      console.error('PDF Analysis Error:', error);
      throw new Error(
        `Failed to analyze PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate full course content using batch generation
   */
  static async generateContent(
    request: ContentGenerationRequest
  ): Promise<ContentGenerationResponse> {
    try {
      const tone = request.tone || 'professional';

      // Use the detailed structure from analysis
      const fullStructure = (request.structure as any).fullStructure || request.structure;

      // Collect all lessons for batch generation
      const allLessons: any[] = [];
      let lessonIndex = 0;

      fullStructure.modules?.forEach((module: any, modIdx: number) => {
        module.chapters?.forEach((chapter: any, chapIdx: number) => {
          chapter.lessons?.forEach((lesson: any, lessIdx: number) => {
            allLessons.push({
              id: `lesson_${lessonIndex++}`,
              moduleIdx: modIdx,
              chapterIdx: chapIdx,
              lessonIdx: lessIdx,
              moduleTitle: module.title,
              chapterTitle: chapter.title,
              lessonTitle: lesson.title,
              keyTakeaway: lesson.keyTakeaway || lesson.title,
              estimatedMinutes: lesson.estimatedMinutes || 5,
            });
          });
        });
      });

      // Generate lessons in batches of 10
      const batchSize = 10;
      const generatedLessons: any = {};

      for (let i = 0; i < allLessons.length; i += batchSize) {
        const batch = allLessons.slice(i, i + batchSize);

        const lessonsPrompt = batch.map((lesson, idx) => `
---
LESSON ${idx + 1}
ID: ${lesson.id}
MODULE: ${lesson.moduleTitle}
CHAPTER: ${lesson.chapterTitle}
LESSON TITLE: ${lesson.lessonTitle}
KEY TAKEAWAY: ${lesson.keyTakeaway}
TARGET: ${lesson.estimatedMinutes} minutes
---`).join('\n');

        const userPrompt = `Generate content for multiple lessons in batch:

TONE: ${tone}

PDF SOURCE MATERIAL:
${request.pdfText.slice(0, 80000)}

LESSONS TO GENERATE:
${lessonsPrompt}

Generate complete, engaging content for ALL lessons listed above. Return ONLY the JSON structure with all lesson contents.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: BATCH_CONTENT_SYSTEM,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 16000,
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('No response from OpenAI for batch');
        }

        const batchResult = JSON.parse(content);

        // Map generated content back to lessons
        batchResult.lessons?.forEach((lesson: any) => {
          generatedLessons[lesson.id] = lesson.content;
        });
      }

      // Build the final course structure with generated content
      const courseContent: ContentGenerationResponse = {
        courseTitle: fullStructure.courseTitle || request.structure.suggestedTitle,
        courseDescription: fullStructure.courseDescription || request.structure.suggestedDescription,
        modules: fullStructure.modules.map((module: any, modIdx: number) => ({
          title: module.title,
          description: module.description,
          chapters: module.chapters.map((chapter: any, chapIdx: number) => ({
            title: chapter.title,
            description: chapter.description,
            learningObjectives: chapter.learningObjectives || [chapter.description],
            lessons: chapter.lessons.map((lesson: any, lessIdx: number) => {
              const lessonData = allLessons.find(
                (l) => l.moduleIdx === modIdx && l.chapterIdx === chapIdx && l.lessonIdx === lessIdx
              );
              return {
                title: lesson.title,
                content: generatedLessons[lessonData?.id] || `Content for: ${lesson.title}\n\n${lesson.keyTakeaway}`,
                estimatedMinutes: lesson.estimatedMinutes || 5,
              };
            }),
          })),
        })),
      };

      return courseContent;
    } catch (error) {
      console.error('Content Generation Error:', error);
      throw new Error(
        `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get token usage estimate for a text string
   */
  static estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for GPT models
    return Math.ceil(text.length / 4);
  }
}
