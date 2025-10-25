'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Module {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  learningObjectives: string[];
  orderIndex: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  lessonType: string;
  orderIndex: number;
  estimatedMinutes: number | null;
}

interface Generation {
  id: string;
  courseTitle: string;
  status: 'processing' | 'completed' | 'failed' | 'published';
  generationType: 'included' | 'overage';
  overageCharge: string;
  whopExperienceId: string | null;
  structureJson: any;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  modules: Module[];
}

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<{ companyId?: string } | null>(null);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const generationId = params.id as string;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchGeneration = async () => {
      try {
        const res = await fetch(`/api/generate/${generationId}`);
        const data = await res.json();

        if (data.success) {
          setGeneration(data.data);

          // Auto-refresh if still processing
          if (data.data.status === 'processing') {
            setTimeout(fetchGeneration, 5000); // Poll every 5 seconds
          }
        }
      } catch (error) {
        console.error('Failed to fetch generation:', error);
      } finally {
        setLoading(false);
      }
    };

    if (generationId) {
      fetchGeneration();
    }
  }, [generationId]);

  const handlePublish = async () => {
    if (!generation || !user?.companyId) return;

    setPublishing(true);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: generation.id,
          companyId: user.companyId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Refresh generation data
        const updatedRes = await fetch(`/api/generate/${generationId}`);
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setGeneration(updatedData.data);
        }

        // Show success and redirect to Whop
        if (data.data.whopCourseUrl) {
          window.open(data.data.whopCourseUrl, '_blank');
        }
      } else {
        alert('Failed to publish: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to publish course');
      console.error(error);
    } finally {
      setPublishing(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const toggleLesson = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId);
    } else {
      newExpanded.add(lessonId);
    }
    setExpandedLessons(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-9)' }}></div>
          <p style={{ color: 'var(--gray-11)' }}>Loading course preview...</p>
        </div>
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--gray-12)' }}>Generation not found</h2>
          <Link href="/" style={{ color: 'var(--accent-11)' }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalLessons = generation.modules.reduce(
    (acc, mod) => acc + mod.chapters.reduce((acc2, ch) => acc2 + ch.lessons.length, 0),
    0
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--gray-1)' }}>
      <header className="sticky top-0 z-10" style={{ background: 'var(--gray-2)', borderBottom: '1px solid var(--gray-a6)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Link href="/" className="text-sm font-medium" style={{ color: 'var(--accent-11)' }}>
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--gray-12)' }}>{generation.courseTitle}</h1>
              <div className="flex items-center space-x-3 mt-2">
                <StatusBadge status={generation.status} />
                {generation.generationType === 'overage' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--warning-3)', color: 'var(--warning-11)' }}>
                    Overage: ${generation.overageCharge}
                  </span>
                )}
              </div>
            </div>
            {generation.status === 'completed' && !generation.whopExperienceId && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm disabled:opacity-50"
                style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)' }}
              >
                {publishing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Publishing...
                  </>
                ) : (
                  'Publish to Whop'
                )}
              </button>
            )}
            {generation.whopExperienceId && (
              <a
                href={`https://whop.com/hub/${user?.companyId}/experiences/${generation.whopExperienceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm"
                style={{ color: 'var(--success-contrast)', background: 'var(--success-9)' }}
              >
                View in Whop →
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {generation.status === 'processing' && (
          <div className="mb-6 rounded-lg p-4" style={{ background: 'var(--blue-3)', border: '1px solid var(--blue-6)' }}>
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-3" style={{ color: 'var(--blue-11)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--blue-11)' }}>Generating course content...</p>
                <p className="text-xs mt-1" style={{ color: 'var(--blue-11)' }}>This usually takes 2-3 minutes. The page will update automatically.</p>
              </div>
            </div>
          </div>
        )}

        {generation.status === 'failed' && (
          <div className="mb-6 rounded-lg p-4" style={{ background: 'var(--danger-3)', border: '1px solid var(--danger-6)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-11)' }}>Generation failed</p>
            <p className="text-sm mt-1" style={{ color: 'var(--danger-11)' }}>{generation.errorMessage || 'Unknown error'}</p>
          </div>
        )}

        {/* Course Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-lg shadow p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--gray-11)' }}>Modules</h3>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--gray-12)' }}>{generation.modules.length}</p>
          </div>
          <div className="rounded-lg shadow p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--gray-11)' }}>Chapters</h3>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--gray-12)' }}>
              {generation.modules.reduce((acc, mod) => acc + mod.chapters.length, 0)}
            </p>
          </div>
          <div className="rounded-lg shadow p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-sm font-medium" style={{ color: 'var(--gray-11)' }}>Lessons</h3>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--gray-12)' }}>{totalLessons}</p>
          </div>
        </div>

        {/* Course Structure */}
        {generation.status === 'completed' && (
          <div className="rounded-lg shadow" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--gray-a6)' }}>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--gray-12)' }}>Course Structure</h2>
            </div>
            <div className="p-6 space-y-4">
              {generation.modules.map((module) => (
                <div key={module.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--gray-a6)' }}>
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full px-4 py-3 flex items-center justify-between"
                    style={{ background: 'var(--gray-3)' }}
                  >
                    <div className="flex items-center space-x-3 text-left">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium" style={{ background: 'var(--accent-3)', color: 'var(--accent-11)' }}>
                        {module.orderIndex + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-medium" style={{ color: 'var(--gray-12)' }}>{module.title}</h3>
                        <p className="text-xs" style={{ color: 'var(--gray-11)' }}>{module.chapters.length} chapters</p>
                      </div>
                    </div>
                    <svg
                      className={`h-5 w-5 transition-transform ${
                        expandedModules.has(module.id) ? 'transform rotate-180' : ''
                      }`}
                      style={{ color: 'var(--gray-a8)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedModules.has(module.id) && (
                    <div className="px-4 py-3 space-y-2">
                      {module.description && (
                        <p className="text-sm mb-4" style={{ color: 'var(--gray-11)' }}>{module.description}</p>
                      )}
                      {module.chapters.map((chapter) => (
                        <div key={chapter.id} className="ml-4 pl-4" style={{ borderLeft: '2px solid var(--gray-a6)' }}>
                          <button
                            onClick={() => toggleChapter(chapter.id)}
                            className="w-full text-left flex items-center justify-between py-2"
                          >
                            <div>
                              <h4 className="text-sm font-medium" style={{ color: 'var(--gray-12)' }}>{chapter.title}</h4>
                              <p className="text-xs" style={{ color: 'var(--gray-11)' }}>{chapter.lessons.length} lessons</p>
                            </div>
                            <svg
                              className={`h-4 w-4 transition-transform ${
                                expandedChapters.has(chapter.id) ? 'transform rotate-180' : ''
                              }`}
                              style={{ color: 'var(--gray-a8)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {expandedChapters.has(chapter.id) && (
                            <div className="ml-4 space-y-2 pb-2">
                              {chapter.lessons.map((lesson) => (
                                <div key={lesson.id} className="pl-3" style={{ borderLeft: '2px solid var(--gray-a4)' }}>
                                  <button
                                    onClick={() => toggleLesson(lesson.id)}
                                    className="w-full text-left py-2 flex items-center justify-between"
                                  >
                                    <div className="flex-1">
                                      <p className="text-xs font-medium" style={{ color: 'var(--gray-12)' }}>{lesson.title}</p>
                                      {lesson.estimatedMinutes && (
                                        <p className="text-xs" style={{ color: 'var(--gray-11)' }}>{lesson.estimatedMinutes} min</p>
                                      )}
                                    </div>
                                    <svg
                                      className={`h-3 w-3 transition-transform flex-shrink-0 ml-2 ${
                                        expandedLessons.has(lesson.id) ? 'transform rotate-180' : ''
                                      }`}
                                      style={{ color: 'var(--gray-a8)' }}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {expandedLessons.has(lesson.id) && (
                                    <div className="pb-3 pr-3">
                                      <div
                                        className="text-xs p-3 rounded"
                                        style={{
                                          background: 'var(--gray-3)',
                                          color: 'var(--gray-12)',
                                          whiteSpace: 'pre-wrap'
                                        }}
                                      >
                                        {lesson.content}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
