'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
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

function PreviewPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get company ID from URL query param first (B2B pattern), fallback to auth
  const urlCompanyId = searchParams.get('companyId');

  const [companyId, setCompanyId] = useState<string | null>(urlCompanyId);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const generationId = params.id as string;

  // Only fetch from auth if we don't have companyId from URL
  useEffect(() => {
    if (urlCompanyId) {
      console.log('✅ Using company ID from URL:', urlCompanyId);
      setCompanyId(urlCompanyId);
      return;
    }

    const fetchUser = async () => {
      try {
        console.log('👤 Fetching user data (no companyId in URL)...');
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        console.log('📥 User API response:', data);
        if (data.success && data.data.companyId) {
          console.log('✅ User data received:', data.data);
          setCompanyId(data.data.companyId);
        } else {
          console.error('❌ User fetch failed or no companyId:', data);
        }
      } catch (error) {
        console.error('❌ Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, [urlCompanyId]);

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

  const loadCourses = async () => {
    if (!companyId) return;

    setLoadingCourses(true);
    try {
      console.log('📋 Loading courses for company:', companyId);
      const res = await fetch(`/api/courses/list?company_id=${companyId}`);
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses);
        if (data.courses.length > 0) {
          setSelectedCourseId(data.courses[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      alert('Failed to load courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  const handlePublishClick = async () => {
    if (!generation || !companyId) {
      alert('Missing generation or company data. Please navigate from the dashboard.');
      return;
    }

    // Load courses and show selector
    await loadCourses();
    setShowCourseSelector(true);
  };

  const handlePublish = async () => {
    console.log('🔘 Publishing to course:', selectedCourseId);

    if (!generation) {
      console.error('❌ No generation found');
      alert('No generation data available');
      return;
    }

    if (!selectedCourseId) {
      alert('Please select a course');
      return;
    }

    console.log('✅ Starting publish process...');
    setPublishing(true);
    setShowCourseSelector(false);
    try {
      console.log('📤 Sending publish request...');
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: generation.id,
          courseId: selectedCourseId,
        }),
      });

      console.log('📥 Response status:', res.status);
      const data = await res.json();
      console.log('📋 Response data:', data);

      if (data.success) {
        console.log('✅ Publish successful!');
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
        alert('Course published successfully!');
      } else {
        console.error('❌ Publish failed:', data.error);
        alert('Failed to publish: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Publish error:', error);
      alert('Failed to publish course: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      console.log('🏁 Publish process complete');
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
              <div className="flex items-center space-x-3">
                <Link
                  href={`/preview/${generationId}/edit`}
                  className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm"
                  style={{ color: 'var(--gray-12)', background: 'var(--gray-4)', border: '1px solid var(--gray-a6)' }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Course
                </Link>
                <button
                  onClick={handlePublishClick}
                  disabled={publishing}
                  className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm disabled:opacity-50 cursor-pointer hover:opacity-90"
                  style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)', cursor: publishing ? 'not-allowed' : 'pointer' }}
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
                    'Add to Whop Course'
                  )}
                </button>
              </div>
            )}
            {generation.whopExperienceId && (
              <div className="flex items-center space-x-3">
                <Link
                  href={`/course/${generation.whopExperienceId}`}
                  className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm"
                  style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)' }}
                >
                  View Course →
                </Link>
                <Link
                  href={`/edit/${generation.whopExperienceId}${companyId ? `?companyId=${companyId}` : ''}`}
                  className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm"
                  style={{ color: 'var(--gray-12)', background: 'var(--gray-4)', border: '1px solid var(--gray-a6)' }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Course
                </Link>
                <a
                  href={`https://whop.com/hub/${companyId}/experiences/${generation.whopExperienceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 border-0 text-base font-medium rounded-md shadow-sm"
                  style={{ color: 'var(--gray-12)', background: 'var(--gray-3)', border: '1px solid var(--gray-a6)' }}
                >
                  View in Whop
                </a>
              </div>
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
        {(generation.status === 'completed' || generation.status === 'published') && (
          <div className="rounded-lg shadow" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--gray-a6)' }}>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--gray-12)' }}>Course Structure</h2>
            </div>
            <div className="p-6 space-y-4">
              {generation.modules.map((module) => (
                <div key={module.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--gray-a6)' }}>
                  <button
                    onClick={() => {
                      console.log('Toggling module:', module.id);
                      toggleModule(module.id);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ background: 'var(--gray-3)' }}
                    type="button"
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
                            onClick={() => {
                              console.log('Toggling chapter:', chapter.id);
                              toggleChapter(chapter.id);
                            }}
                            className="w-full text-left flex items-center justify-between py-2 hover:opacity-80 transition-opacity cursor-pointer"
                            type="button"
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
                                    onClick={() => {
                                      console.log('Toggling lesson:', lesson.id);
                                      toggleLesson(lesson.id);
                                    }}
                                    className="w-full text-left py-2 flex items-center justify-between hover:opacity-80 transition-opacity cursor-pointer"
                                    type="button"
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

      {/* Course Selector Modal */}
      {showCourseSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="max-w-lg w-full rounded-lg shadow-xl" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--gray-12)' }}>
                Select a Course
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--gray-11)' }}>
                Choose an existing course from Whop to add this content to. The generated chapters and lessons will be added to the selected course.
              </p>

              {loadingCourses ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--accent-9)' }}></div>
                  <p className="mt-3" style={{ color: 'var(--gray-11)' }}>Loading courses...</p>
                </div>
              ) : courses.length === 0 ? (
                <div className="py-8 text-center">
                  <p style={{ color: 'var(--gray-11)' }}>No courses found. Please create a course in the Whop Courses app first.</p>
                  <a
                    href={`https://whop.com/hub/${companyId}/courses`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center px-4 py-2 rounded-md text-sm font-medium"
                    style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)' }}
                  >
                    Create Course in Whop →
                  </a>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>
                      Course
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-4 py-3 rounded-md text-base"
                      style={{
                        background: 'var(--gray-3)',
                        color: 'var(--gray-12)',
                        border: '1px solid var(--gray-a6)',
                      }}
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCourseSelector(false)}
                      className="flex-1 px-4 py-2 rounded-md text-sm font-medium"
                      style={{ color: 'var(--gray-12)', background: 'var(--gray-4)', border: '1px solid var(--gray-a6)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={!selectedCourseId}
                      className="flex-1 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                      style={{ color: 'var(--accent-contrast)', background: 'var(--accent-9)' }}
                    >
                      Publish to Course
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-9)' }}></div>
          <p style={{ color: 'var(--gray-11)' }}>Loading...</p>
        </div>
      </div>
    }>
      <PreviewPageContent />
    </Suspense>
  );
}
