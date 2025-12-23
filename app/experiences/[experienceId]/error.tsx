'use client';

import { useEffect } from 'react';

export default function ExperienceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Experience page error:', error);
  }, [error]);

  return (
    <div className="flex justify-center items-center h-screen px-8" style={{ background: 'var(--gray-1)' }}>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--gray-12)' }}>
          Something went wrong
        </h2>
        <p className="mb-6" style={{ color: 'var(--gray-11)' }}>
          We encountered an error loading this experience. This might be a temporary issue.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-md font-medium transition-colors"
            style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}
          >
            Try again
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-md font-medium transition-colors"
            style={{ background: 'var(--gray-4)', color: 'var(--gray-12)' }}
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
