import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db/client';
import { pdfUploads } from '@/lib/db/schema';
import { PDFService } from '@/lib/services/pdf-service';
import { UserService } from '@/lib/services/user-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const whopUserId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'no_file', message: 'No file provided' } },
        { status: 400 }
      );
    }

    if (!whopUserId) {
      return NextResponse.json(
        { success: false, error: { code: 'no_user', message: 'User ID required' } },
        { status: 401 }
      );
    }

    // Validate PDF
    const validation = PDFService.validatePDF(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid_file', message: validation.error } },
        { status: 400 }
      );
    }

    // Get company ID from headers
    const companyId = request.headers.get('x-whop-company-id') || request.headers.get('whop-company-id');

    // Get or create user
    const user = await UserService.getOrCreateUser({
      id: whopUserId,
      companyId: companyId || undefined,
    });

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Create PDF upload record
    const [upload] = await db
      .insert(pdfUploads)
      .values({
        userId: user.id,
        filename: file.name,
        fileSize: file.size,
        fileUrl: blob.url,
        mimeType: file.type,
        extractionStatus: 'uploading',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .returning();

    // Start PDF processing in background
    PDFService.processPDF(upload.id).catch((error) => {
      console.error('Background PDF processing error:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        uploadId: upload.id,
        filename: upload.filename,
        fileSize: upload.fileSize,
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'upload_failed',
          message: error instanceof Error ? error.message : 'Upload failed',
        },
      },
      { status: 500 }
    );
  }
}
