'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface UsageSummary {
  currentMonth: {
    generationsUsed: number;
    generationsIncluded: number;
    overageCount: number;
    overageAmount: number;
    purchasedCreditsAvailable?: number;
  };
  plan: {
    name: string;
    price: number;
    generationsIncluded: number;
    overagePrice: number;
  };
}

interface Generation {
  id: string;
  courseTitle: string;
  status: 'processing' | 'completed' | 'failed' | 'published';
  generationType: 'included' | 'overage';
  overageCharge: string;
  whopExperienceId: string | null;
  whopCourseUrl?: string;
  moduleCount: number;
  lessonCount: number;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface DashboardClientProps {
  userId: string;
  companyId?: string;
}

export default function DashboardClient({ userId, companyId: propCompanyId }: DashboardClientProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(propCompanyId || null);

  // If companyId not provided as prop, fetch from auth
  useEffect(() => {
    if (propCompanyId) {
      setCompanyId(propCompanyId);
      return;
    }

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.companyId) {
          setCompanyId(data.data.companyId);
        }
      })
      .catch(console.error);
  }, [propCompanyId]);

  // Fetch usage and generations with companyId
  useEffect(() => {
    if (!userId || !companyId) return;

    Promise.all([
      fetch(`/api/usage?userId=${userId}&companyId=${companyId}`).then((r) => r.json()),
      fetch(`/api/generations?userId=${userId}&companyId=${companyId}&limit=10`).then((r) => r.json()),
    ])
      .then(([usageRes, generationsRes]) => {
        if (usageRes.success) setUsage(usageRes.data);
        if (generationsRes.success) setGenerations(generationsRes.data.generations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, companyId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-9)' }}></div>
          <p style={{ color: 'var(--gray-11)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const percentUsed = usage
    ? (usage.currentMonth.generationsUsed / usage.currentMonth.generationsIncluded) * 100
    : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--gray-1)' }}>
      {/* Header */}
      <header style={{ background: 'var(--gray-2)', borderBottom: '1px solid var(--gray-a6)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--gray-12)' }}>AI Course Builder</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--gray-11)' }}>
                Transform PDFs into engaging Whop courses in minutes
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/profile"
                className="inline-flex items-center px-4 py-2 border-0 text-sm font-medium rounded-md"
                style={{ color: 'var(--gray-12)', background: 'var(--gray-3)', border: '1px solid var(--gray-a6)' }}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profile
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm"
                style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)' }}
              >
                <svg
                  className="-ml-1 mr-3 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Course
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Usage Stats */}
        {usage && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg shadow p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-12)' }}>Generations This Month</h3>
                <span className="text-2xl font-bold" style={{ color: 'var(--accent-9)' }}>
                  {usage.currentMonth.generationsUsed}/{usage.currentMonth.generationsIncluded}
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: 'var(--gray-a6)' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(percentUsed, 100)}%`, background: 'var(--accent-9)' }}
                ></div>
              </div>
              <p className="text-xs font-medium mt-2" style={{ color: 'var(--gray-11)' }}>
                {usage.currentMonth.generationsIncluded - usage.currentMonth.generationsUsed}{' '}
                remaining
              </p>
            </div>

            <div className="rounded-lg shadow p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--gray-12)' }}>Current Plan</h3>
              <p className="text-2xl font-bold" style={{ color: 'var(--gray-12)' }}>{usage.plan.name}</p>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--gray-11)' }}>
                ${usage.plan.price}/month • {usage.plan.generationsIncluded} generations
              </p>
            </div>

            {usage.currentMonth.purchasedCreditsAvailable !== undefined && usage.currentMonth.purchasedCreditsAvailable > 0 && (
              <div className="rounded-lg shadow p-6" style={{ background: 'var(--success-2)', border: '1px solid var(--success-6)' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--success-11)' }}>Purchased Credits</h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--success-11)' }}>
                  {usage.currentMonth.purchasedCreditsAvailable}
                </p>
                <p className="text-sm font-medium mt-1" style={{ color: 'var(--success-11)' }}>
                  Extra credits available to use
                </p>
              </div>
            )}

            {usage.currentMonth.overageCount > 0 && (
              <div className="rounded-lg shadow p-6" style={{ background: 'var(--warning-2)', border: '1px solid var(--warning-6)' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--warning-11)' }}>Overage This Month</h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--warning-11)' }}>
                  ${usage.currentMonth.overageAmount.toFixed(2)}
                </p>
                <p className="text-sm font-medium mt-1" style={{ color: 'var(--warning-11)' }}>
                  {usage.currentMonth.overageCount} extra generation
                  {usage.currentMonth.overageCount > 1 ? 's' : ''} @ ${usage.plan.overagePrice} each
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generations History */}
        <div className="rounded-lg shadow" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--gray-a6)' }}>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--gray-12)' }}>Recent Generations</h2>
          </div>

          {generations.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12"
                style={{ color: 'var(--gray-a8)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-semibold" style={{ color: 'var(--gray-12)' }}>No courses yet</h3>
              <p className="mt-1 text-sm font-medium" style={{ color: 'var(--gray-11)' }}>
                Get started by uploading your first PDF
              </p>
              <div className="mt-6">
                <Link
                  href="/upload"
                  className="inline-flex items-center px-4 py-2 border-0 shadow-sm text-sm font-medium rounded-md"
                  style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)' }}
                >
                  Upload PDF
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {generations.map((gen) => (
                <div key={gen.id} className="px-6 py-4" style={{ borderBottom: '1px solid var(--gray-a4)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium" style={{ color: 'var(--gray-12)' }}>{gen.courseTitle}</h3>
                        <StatusBadge status={gen.status} />
                        {gen.generationType === 'overage' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--warning-3)', color: 'var(--warning-11)' }}>
                            Overage: ${gen.overageCharge}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm font-medium space-x-4" style={{ color: 'var(--gray-11)' }}>
                        <span>{gen.moduleCount} modules</span>
                        <span>•</span>
                        <span>{gen.lessonCount} lessons</span>
                        <span>•</span>
                        <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
                      </div>
                      {gen.errorMessage && (
                        <p className="mt-2 text-sm" style={{ color: 'var(--danger-11)' }}>{gen.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {gen.status === 'completed' && gen.whopCourseUrl && (
                        <a
                          href={gen.whopCourseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 shadow-sm text-sm font-medium rounded-md"
                          style={{ color: 'var(--gray-12)', background: 'var(--gray-3)', border: '1px solid var(--gray-a6)' }}
                        >
                          View in Whop
                        </a>
                      )}
                      <Link
                        href={`/preview/${gen.id}`}
                        className="inline-flex items-center px-3 py-2 border-0 text-sm font-medium rounded-md"
                        style={{ color: 'var(--accent-11)', background: 'var(--accent-3)' }}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    processing: { background: 'var(--blue-3)', color: 'var(--blue-11)' },
    completed: { background: 'var(--success-3)', color: 'var(--success-11)' },
    failed: { background: 'var(--danger-3)', color: 'var(--danger-11)' },
    published: { background: 'var(--purple-3)', color: 'var(--purple-11)' },
  };

  const style = styles[status as keyof typeof styles] || { background: 'var(--gray-3)', color: 'var(--gray-11)' };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={style}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
