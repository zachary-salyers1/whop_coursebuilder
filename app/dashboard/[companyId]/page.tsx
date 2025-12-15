'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import DashboardClient from '../../dashboard-client';

function DashboardPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get company ID from URL params (this is the B2B pattern)
  const companyId = params.companyId as string;

  console.log('Dashboard loaded with companyId from URL:', companyId);

  useEffect(() => {
    // Check if we're viewing a specific experience via URL params
    const urlExperienceId = searchParams.get('experienceId') || searchParams.get('experience_id');

    if (urlExperienceId) {
      // Redirect to course viewer
      router.push(`/course/${urlExperienceId}`);
      return;
    }

    // Get user ID from auth
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        console.log('Auth response:', data);
        if (data.success) {
          setUserId(data.data.id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Auth error:', err);
        setLoading(false);
      });
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Authentication required</p>
        </div>
      </div>
    );
  }

  return <DashboardClient userId={userId} companyId={companyId} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
