'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UpgradePlan from '../components/UpgradePlan';

interface UsageSummary {
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

interface UserInfo {
  id: string;
  whopUserId: string;
  companyId?: string;
  email?: string;
  username?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (data) => {
        if (data.success) {
          setUser({
            id: data.data.id,
            whopUserId: data.data.whopUserId,
            companyId: data.data.companyId,
            email: data.data.email,
            username: data.data.username,
          });

          // Fetch usage data
          const usageParams = new URLSearchParams({
            userId: data.data.id,
          });
          if (data.data.companyId) {
            usageParams.append('companyId', data.data.companyId);
          }

          const usageRes = await fetch(`/api/usage?${usageParams}`);
          const usageData = await usageRes.json();
          if (usageData.success) {
            setUsage(usageData.data);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--accent-9)' }}
          ></div>
          <p style={{ color: 'var(--gray-11)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--danger-11)' }}>Failed to load user data</p>
        </div>
      </div>
    );
  }

  const percentUsed = usage
    ? (usage.currentMonth.generationsUsed / usage.currentMonth.generationsIncluded) * 100
    : 0;

  const remainingGenerations = usage
    ? usage.currentMonth.generationsIncluded - usage.currentMonth.generationsUsed
    : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--gray-1)' }}>
      {/* Header */}
      <header style={{ background: 'var(--gray-2)', borderBottom: '1px solid var(--gray-a6)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-sm font-medium" style={{ color: 'var(--accent-11)' }}>
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold mt-2" style={{ color: 'var(--gray-12)' }}>
                Profile & Billing
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--gray-11)' }}>
                Manage your subscription and view usage
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info */}
        <div
          className="rounded-lg shadow p-6 mb-8"
          style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--gray-12)' }}>
            Account Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--gray-11)' }}>
                User ID
              </p>
              <p className="text-sm mt-1 font-mono" style={{ color: 'var(--gray-12)' }}>
                {user.whopUserId}
              </p>
            </div>
            {user.email && (
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--gray-11)' }}>
                  Email
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--gray-12)' }}>
                  {user.email}
                </p>
              </div>
            )}
            {user.username && (
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--gray-11)' }}>
                  Username
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--gray-12)' }}>
                  {user.username}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        {usage && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--gray-12)' }}>
              Usage This Month
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Generations Used */}
              <div
                className="rounded-lg shadow p-6"
                style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-12)' }}>
                    Course Generations
                  </h3>
                  <span className="text-2xl font-bold" style={{ color: 'var(--accent-9)' }}>
                    {usage.currentMonth.generationsUsed}/{usage.currentMonth.generationsIncluded}
                  </span>
                </div>
                <div className="w-full rounded-full h-3" style={{ background: 'var(--gray-a6)' }}>
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(percentUsed, 100)}%`,
                      background: percentUsed >= 100 ? 'var(--warning-9)' : 'var(--accent-9)',
                    }}
                  ></div>
                </div>
                <p className="text-sm font-medium mt-3" style={{ color: 'var(--gray-11)' }}>
                  {remainingGenerations > 0
                    ? `${remainingGenerations} generations remaining`
                    : 'All included generations used'}
                </p>
              </div>

              {/* Current Plan */}
              <div
                className="rounded-lg shadow p-6"
                style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--gray-12)' }}>
                  Current Plan
                </h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--gray-12)' }}>
                  {usage.plan.name}
                </p>
                <p className="text-sm font-medium mt-2" style={{ color: 'var(--gray-11)' }}>
                  ${usage.plan.price}/month
                </p>
                <ul className="text-sm mt-3 space-y-1" style={{ color: 'var(--gray-11)' }}>
                  <li>{usage.plan.generationsIncluded} generations/month included</li>
                  <li>${usage.plan.overagePrice}/generation after limit</li>
                </ul>
              </div>
            </div>

            {/* Overage Info */}
            {usage.currentMonth.overageCount > 0 && (
              <div
                className="rounded-lg shadow p-6 mt-6"
                style={{ background: 'var(--warning-2)', border: '1px solid var(--warning-6)' }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--warning-11)' }}>
                  Overage This Month
                </h3>
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

        {/* Upgrade/Purchase Section */}
        {usage && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--gray-12)' }}>
              Purchase Options
            </h2>
            <UpgradePlan
              userId={user.id}
              companyId={user.companyId}
              currentPlan={usage.plan.name}
              remainingGenerations={remainingGenerations}
            />
          </div>
        )}
      </main>
    </div>
  );
}
