'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardClient from './dashboard-client';

function DashboardPageContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Check if we're viewing a specific experience via URL params
    const urlExperienceId = searchParams.get('experienceId') || searchParams.get('experience_id');

    console.log('Page loaded with params:', {
      urlExperienceId,
      allParams: Object.fromEntries(searchParams.entries())
    });

    if (urlExperienceId) {
      // Redirect to course viewer
      router.push(`/course/${urlExperienceId}`);
      return;
    }

    // Check auth and see if there's an experience ID in headers
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        console.log('Auth response:', data);

        if (data.success) {
          setUserId(data.data.id);

          // If there's an experience ID from Whop headers, show course viewer
          if (data.data.experienceId) {
            router.push(`/course/${data.data.experienceId}`);
            return;
          }
        }
        setLoading(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams, router]);

  if (loading || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <DashboardClient userId={userId} />;
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
