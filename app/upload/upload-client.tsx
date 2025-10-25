'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import Link from 'next/link';

export default function UploadClient({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setFile(file);
      } else {
        setError('Please upload a PDF file');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setFile(file);
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleUploadAndGenerate = async () => {
    if (!file || !userId) return;

    setUploading(true);
    setError(null);

    try {
      // Upload PDF
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error(uploadData.error?.message || 'Upload failed');
      }

      setUploading(false);
      setGenerating(true);

      // Start generation
      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfUploadId: uploadData.data.uploadId,
          userId: userId,
        }),
      });

      const generateData = await generateRes.json();

      if (!generateData.success) {
        throw new Error(generateData.error?.message || 'Generation failed');
      }

      // Redirect to preview page
      router.push(`/preview/${generateData.data.generationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setUploading(false);
      setGenerating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gray-1)' }}>
      <header style={{ background: 'var(--gray-2)', borderBottom: '1px solid var(--gray-a6)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-sm font-medium" style={{ color: 'var(--accent-11)' }}>
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold mt-2" style={{ color: 'var(--gray-12)' }}>Upload PDF</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--gray-11)' }}>
                Upload a PDF to automatically generate a Whop course
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-lg shadow-lg p-8" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
          {/* Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className="border-2 border-dashed rounded-lg p-12 text-center transition-colors"
            style={{
              borderColor: dragActive ? 'var(--accent-9)' : 'var(--gray-a6)',
              background: dragActive ? 'var(--accent-3)' : 'transparent'
            }}
          >
            {!file ? (
              <>
                <svg
                  className="mx-auto h-12 w-12"
                  style={{ color: 'var(--gray-a8)' }}
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-4 text-sm" style={{ color: 'var(--gray-11)' }}>
                  Drag and drop your PDF file here, or click to browse
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading || generating}
                />
                <label
                  htmlFor="file-upload"
                  className="mt-4 inline-flex items-center px-4 py-2 border-0 text-sm font-medium rounded-md shadow-sm cursor-pointer"
                  style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)' }}
                >
                  Select PDF
                </label>
                <p className="mt-2 text-xs" style={{ color: 'var(--gray-11)' }}>PDF up to 50MB</p>
              </>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--gray-3)' }}>
                <div className="flex items-center space-x-3">
                  <svg
                    className="h-10 w-10"
                    style={{ color: 'var(--danger-9)' }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--gray-12)' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: 'var(--gray-11)' }}>{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  disabled={uploading || generating}
                  className="disabled:opacity-50"
                  style={{ color: 'var(--gray-a8)' }}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 rounded-md" style={{ background: 'var(--danger-3)', border: '1px solid var(--danger-6)' }}>
              <p className="text-sm" style={{ color: 'var(--danger-11)' }}>{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-between">
            <Link
              href="/"
              className="text-sm font-medium"
              style={{ color: 'var(--gray-11)' }}
            >
              Cancel
            </Link>
            <button
              onClick={handleUploadAndGenerate}
              disabled={!file || uploading || generating}
              className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)' }}
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </>
              ) : generating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating Course...
                </>
              ) : (
                'Upload & Generate Course'
              )}
            </button>
          </div>

          {/* Info Section */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--gray-a6)' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--gray-12)' }}>What happens next?</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium" style={{ background: 'var(--accent-3)', color: 'var(--accent-11)' }}>
                    1
                  </div>
                </div>
                <p className="ml-3 text-sm" style={{ color: 'var(--gray-11)' }}>
                  Your PDF will be uploaded and analyzed by AI
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium" style={{ background: 'var(--accent-3)', color: 'var(--accent-11)' }}>
                    2
                  </div>
                </div>
                <p className="ml-3 text-sm" style={{ color: 'var(--gray-11)' }}>
                  A course structure with modules, chapters, and lessons will be generated
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium" style={{ background: 'var(--accent-3)', color: 'var(--accent-11)' }}>
                    3
                  </div>
                </div>
                <p className="ml-3 text-sm" style={{ color: 'var(--gray-11)' }}>
                  You'll be able to preview and publish your course to Whop
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs" style={{ color: 'var(--gray-11)' }}>
              Generation typically takes 2-3 minutes. You'll be redirected to the preview page automatically.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
