'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UploadClient from "./upload-client";

function UploadPageContent() {
  const searchParams = useSearchParams();
  const urlCompanyId = searchParams.get('companyId');

  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(urlCompanyId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUserId(data.data.id);
          // Only use companyId from auth if not provided in URL
          if (!urlCompanyId && data.data.companyId) {
            setCompanyId(data.data.companyId);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [urlCompanyId]);

  if (loading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-9)' }}></div>
          <p style={{ color: 'var(--gray-11)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return <UploadClient userId={userId} userName="User" companyId={companyId} />;
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-9)' }}></div>
          <p style={{ color: 'var(--gray-11)' }}>Loading...</p>
        </div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}
