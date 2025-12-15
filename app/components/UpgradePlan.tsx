'use client';

import { useIframeSdk } from '@whop/react';
import { useState } from 'react';

interface UpgradePlanProps {
  userId: string;
  companyId?: string;
  currentPlan?: string;
  remainingGenerations: number;
  purchasedCredits?: number;
}

export default function UpgradePlan({
  userId,
  companyId,
  currentPlan,
  remainingGenerations,
  purchasedCredits = 0,
}: UpgradePlanProps) {
  const iframeSdk = useIframeSdk();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePurchase = async (type: 'growth' | 'additional') => {
    setLoading(type);
    setError(null);
    setSuccessMessage(null);

    try {
      // Create checkout configuration on the server
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: type,
          userId,
          companyId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create checkout');
      }

      // Open in-app purchase modal with the returned planId and id
      const res = await iframeSdk.inAppPurchase({
        planId: data.data.planId,
        id: data.data.id,
      });

      if (res.status === 'ok') {
        setSuccessMessage(
          type === 'growth'
            ? 'Successfully upgraded to Growth Plan!'
            : 'Successfully purchased additional generation!'
        );
        // Refresh the page to update usage data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError('Purchase was cancelled or failed');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div
          className="p-4 rounded-md"
          style={{ background: 'var(--success-3)', border: '1px solid var(--success-6)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--success-11)' }}>
            {successMessage}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="p-4 rounded-md"
          style={{ background: 'var(--danger-3)', border: '1px solid var(--danger-6)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--danger-11)' }}>
            {error}
          </p>
        </div>
      )}

      {/* Additional Generation Purchase */}
      <div
        className="rounded-lg p-6"
        style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--gray-12)' }}>
              Need More Generations?
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--gray-11)' }}>
              {remainingGenerations > 0
                ? `You have ${remainingGenerations} included generations remaining this month.`
                : 'You have used all your included generations this month.'}
              {purchasedCredits > 0 && ` Plus ${purchasedCredits} purchased credit${purchasedCredits > 1 ? 's' : ''}.`}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--gray-11)' }}>
              Purchase additional course generations for <strong>$5 each</strong>.
            </p>
          </div>
          <button
            onClick={() => handlePurchase('additional')}
            disabled={loading !== null}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: 'var(--accent-contrast)',
              background: 'var(--accent-9)',
            }}
          >
            {loading === 'additional' ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              'Buy Generation ($5)'
            )}
          </button>
        </div>
      </div>

      {/* Growth Plan Upgrade */}
      {currentPlan !== 'Growth Plan' && (
        <div
          className="rounded-lg p-6"
          style={{
            background: 'var(--accent-2)',
            border: '1px solid var(--accent-6)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--accent-11)' }}>
                Upgrade to Growth Plan
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--accent-11)' }}>
                Get <strong>10 course generations per month</strong> for just $29/month.
              </p>
              <ul className="text-sm mt-2 space-y-1" style={{ color: 'var(--accent-11)' }}>
                <li>10 AI-powered course generations/month</li>
                <li>Publish directly to Whop</li>
                <li>Additional generations at $5 each</li>
              </ul>
            </div>
            <button
              onClick={() => handlePurchase('growth')}
              disabled={loading !== null}
              className="inline-flex items-center px-6 py-3 text-base font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                color: 'var(--accent-contrast)',
                background: 'var(--accent-9)',
              }}
            >
              {loading === 'growth' ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                'Upgrade Now ($29/mo)'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
