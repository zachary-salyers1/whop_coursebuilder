'use client';

import { useState, useEffect } from 'react';

interface GettingStartedGuideProps {
  onDismiss?: () => void;
  defaultExpanded?: boolean;
}

const STEPS = [
  {
    number: 1,
    title: 'Create a Course in Whop',
    description: 'First, go to your Whop dashboard and create a new course using the native Courses app. This will be the container for your AI-generated content.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    number: 2,
    title: 'Upload Your PDF',
    description: 'Return to Course Builder and click "+ New Course" to upload your PDF document (guides, eBooks, training materials, etc.).',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'AI Generates Your Course',
    description: 'Our AI analyzes your PDF and automatically structures it into modules, chapters, and lessons with engaging content.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    number: 4,
    title: 'Review & Edit',
    description: 'Preview your generated course and make any edits or adjustments to the content, structure, or formatting.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    number: 5,
    title: 'Add to Whop Course',
    description: 'Click "Add to Whop Course" and select the course you created in Step 1. Your content will be published directly.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
    ),
  },
  {
    number: 6,
    title: 'You\'re Live!',
    description: 'Your course is now live in Whop! You can continue editing anytime - changes sync automatically to your Whop course.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

export default function GettingStartedGuide({ onDismiss, defaultExpanded = true }: GettingStartedGuideProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem('courseBuilderGuideDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('courseBuilderGuideDismissed', 'true');
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleShowAgain = () => {
    localStorage.removeItem('courseBuilderGuideDismissed');
    setIsDismissed(false);
    setIsExpanded(true);
  };

  if (isDismissed) {
    return (
      <button
        onClick={handleShowAgain}
        className="text-sm font-medium mb-4 flex items-center"
        style={{ color: 'var(--accent-11)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        Show Getting Started Guide
      </button>
    );
  }

  return (
    <div
      className="rounded-lg shadow mb-8 overflow-hidden"
      style={{ background: 'var(--accent-2)', border: '1px solid var(--accent-6)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderBottom: isExpanded ? '1px solid var(--accent-6)' : 'none' }}
      >
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 mr-3"
            style={{ color: 'var(--accent-11)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--accent-11)' }}>
              Getting Started Guide
            </h3>
            <p className="text-sm" style={{ color: 'var(--accent-11)', opacity: 0.8 }}>
              Learn how to create your first AI-powered course
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="text-sm font-medium px-3 py-1 rounded"
            style={{ color: 'var(--accent-11)', background: 'var(--accent-3)' }}
          >
            Dismiss
          </button>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--accent-11)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex items-start p-4 rounded-lg"
                style={{ background: 'var(--accent-3)' }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3"
                  style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}
                >
                  <span className="text-sm font-bold">{step.number}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span style={{ color: 'var(--accent-11)' }}>{step.icon}</span>
                    <h4 className="text-sm font-semibold ml-2" style={{ color: 'var(--accent-12)' }}>
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--accent-11)' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pro tip */}
          <div
            className="mt-4 p-4 rounded-lg flex items-start"
            style={{ background: 'var(--gray-3)', border: '1px solid var(--gray-a6)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--accent-9)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--gray-12)' }}>
                Pro Tip
              </p>
              <p className="text-sm" style={{ color: 'var(--gray-11)' }}>
                All edits to your course material can be made after publishing. Just navigate to the Edit button in Course Builder, and your changes will automatically sync to your Whop course!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
