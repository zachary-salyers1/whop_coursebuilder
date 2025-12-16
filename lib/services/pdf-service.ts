import { put } from '@vercel/blob';
import { db } from '../db/client';
import { pdfUploads } from '../db/schema';
import { eq } from 'drizzle-orm';

// pdf-parse v1 - import from lib to avoid test file loading issue
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse');

export class PDFService {
  /**
   * Sanitize text to remove null bytes and control characters that PostgreSQL can't handle
   */
  private static sanitizeText(text: string): string {
    return text
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' '); // Replace other control chars with space
  }

  /**
   * Upload PDF file to Vercel Blob storage
   */
  static async uploadPDF(file: File, userId: string): Promise<string> {
    try {
      // Upload to Vercel Blob
      const blob = await put(file.name, file, {
        access: 'public',
        addRandomSuffix: true,
      });

      // Create database record
      const [upload] = await db
        .insert(pdfUploads)
        .values({
          userId,
          filename: file.name,
          fileSize: file.size,
          fileUrl: blob.url,
          mimeType: file.type,
          extractionStatus: 'uploading',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        })
        .returning();

      return upload.id;
    } catch (error) {
      console.error('PDF Upload Error:', error);
      throw new Error(
        `Failed to upload PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract text from PDF buffer using pdf-parse v1
   */
  static async extractText(buffer: Buffer): Promise<{
    text: string;
    pageCount: number;
  }> {
    try {
      const result = await pdfParse(buffer);

      return {
        text: result.text,
        pageCount: result.numpages,
      };
    } catch (error) {
      console.error('PDF Extraction Error:', error);
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch PDF from URL and extract text
   */
  static async extractTextFromUrl(url: string): Promise<{
    text: string;
    pageCount: number;
  }> {
    try {
      // Fetch PDF from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use pdf-parse v1 to extract text
      const result = await pdfParse(buffer);

      return {
        text: result.text,
        pageCount: result.numpages,
      };
    } catch (error) {
      console.error('PDF Fetch and Extract Error:', error);
      throw new Error(
        `Failed to fetch and extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process uploaded PDF: extract text and update database
   */
  static async processPDF(pdfUploadId: string): Promise<string> {
    try {
      console.log('processPDF: Starting for ID:', pdfUploadId);

      // Get PDF upload record
      const [upload] = await db
        .select()
        .from(pdfUploads)
        .where(eq(pdfUploads.id, pdfUploadId));

      if (!upload) {
        throw new Error('PDF upload not found');
      }

      console.log('processPDF: Found upload, extracting from URL:', upload.fileUrl);

      // Extract text from PDF
      const { text, pageCount } = await this.extractTextFromUrl(upload.fileUrl);

      console.log('processPDF: Extraction successful, text length:', text.length, 'pages:', pageCount);

      // Sanitize text to remove null bytes and control characters
      const sanitizedText = this.sanitizeText(text);
      console.log('processPDF: Text sanitized, length:', sanitizedText.length);

      // Update database with extracted text
      await db
        .update(pdfUploads)
        .set({
          rawText: sanitizedText,
          pageCount,
          extractionStatus: 'ready',
          metadata: {
            extractedAt: new Date().toISOString(),
            textLength: sanitizedText.length,
          },
        })
        .where(eq(pdfUploads.id, pdfUploadId));

      console.log('processPDF: Database updated successfully');

      return sanitizedText;
    } catch (error) {
      console.error('processPDF: Error occurred:', error);

      // Update status to failed
      await db
        .update(pdfUploads)
        .set({
          extractionStatus: 'failed',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
        .where(eq(pdfUploads.id, pdfUploadId));

      throw error;
    }
  }

  /**
   * Get extracted text from PDF upload
   */
  static async getExtractedText(pdfUploadId: string): Promise<string | null> {
    const [upload] = await db
      .select()
      .from(pdfUploads)
      .where(eq(pdfUploads.id, pdfUploadId))
      .limit(1);

    console.log('getExtractedText: Retrieved upload, rawText length:', upload?.rawText?.length || 0);
    return upload?.rawText || null;
  }

  /**
   * Validate PDF file
   */
  static validatePDF(file: File): { valid: boolean; error?: string } {
    const maxSizeMB = 50;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' };
    }

    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB`,
      };
    }

    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    return { valid: true };
  }
}
