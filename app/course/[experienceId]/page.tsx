'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';

interface Lesson {
  id: string;
  title: string;
  content: string;
  lesson_type: string;
  order: number;
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  chapters: Chapter[];
}

interface Experience {
  id: string;
  name: string;
  courses: Course[];
}

export default function CourseViewerPage() {
  const params = useParams();
  const experienceId = params.experienceId as string;

  const [experience, setExperience] = useState<Experience | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!experienceId) return;

    console.log('Fetching experience:', experienceId);

    fetch(`/api/course/experience/${experienceId}`)
      .then((r) => {
        console.log('Response status:', r.status);
        return r.json();
      })
      .then((data) => {
        console.log('API Response:', data);
        if (data.success) {
          setExperience(data.data);
          console.log('Experience set:', data.data);

          // Build flat list of all lessons
          const lessons: Lesson[] = [];
          data.data.courses.forEach((course: Course) => {
            course.chapters.forEach((chapter: Chapter) => {
              lessons.push(...chapter.lessons);
            });
          });
          setAllLessons(lessons);

          // Auto-select first course and first lesson
          if (data.data.courses?.length > 0) {
            const firstCourse = data.data.courses[0];
            setSelectedCourse(firstCourse);
            console.log('First course:', firstCourse);
            if (firstCourse.chapters?.length > 0 && firstCourse.chapters[0].lessons?.length > 0) {
              setSelectedLesson(firstCourse.chapters[0].lessons[0]);
            }
          } else {
            console.warn('No courses found in experience');
            setError('No courses found in this experience');
          }
        } else {
          console.error('API error:', data.error);
          setError(data.error?.message || 'Failed to load course');
        }
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setError('Failed to load course: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [experienceId]);

  // Load progress data
  useEffect(() => {
    if (!experienceId) return;

    fetch(`/api/progress/experience/${experienceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.progress) {
          setProgress(data.progress);
        }
      })
      .catch((err) => console.error('Failed to load progress:', err));
  }, [experienceId]);

  // Mark lesson as complete
  const markLessonComplete = async (lessonId: string) => {
    try {
      await fetch(`/api/progress/${lessonId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experienceId }),
      });

      setProgress((prev) => ({ ...prev, [lessonId]: true }));
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
    }
  };

  // Navigation functions
  const goToNextLesson = () => {
    if (!selectedLesson || allLessons.length === 0) return;

    const currentIndex = allLessons.findIndex((l) => l.id === selectedLesson.id);
    if (currentIndex < allLessons.length - 1) {
      setSelectedLesson(allLessons[currentIndex + 1]);
      // Mark current lesson as complete when moving to next
      markLessonComplete(selectedLesson.id);
    }
  };

  const goToPreviousLesson = () => {
    if (!selectedLesson || allLessons.length === 0) return;

    const currentIndex = allLessons.findIndex((l) => l.id === selectedLesson.id);
    if (currentIndex > 0) {
      setSelectedLesson(allLessons[currentIndex - 1]);
    }
  };

  const isFirstLesson = selectedLesson ? allLessons.findIndex((l) => l.id === selectedLesson.id) === 0 : true;
  const isLastLesson = selectedLesson ? allLessons.findIndex((l) => l.id === selectedLesson.id) === allLessons.length - 1 : true;

  // Toggle functions for collapsible sidebar
  const toggleCourse = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-9)' }}></div>
          <p style={{ color: 'var(--gray-11)' }}>Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--gray-12)' }}>
            {error || 'Course not found'}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--gray-1)' }}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-md"
        style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`w-80 flex-shrink-0 overflow-y-auto fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ background: 'var(--gray-2)', borderRight: '1px solid var(--gray-a6)' }}
      >
        <div className="p-6 pt-16 lg:pt-6">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md hover:opacity-80 transition-opacity"
            style={{ color: 'var(--accent-11)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--gray-12)' }}>
            {experience.name}
          </h2>

          {experience.courses && experience.courses.length > 0 && (
            <div className="space-y-3">
              {experience.courses.map((course) => (
                <div key={course.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--gray-a6)' }}>
                  {/* Course Header - Collapsible */}
                  <button
                    onClick={() => toggleCourse(course.id)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--gray-3)' }}
                    type="button"
                  >
                    <h2 className="text-base font-bold" style={{ color: 'var(--accent-11)' }}>
                      {course.title}
                    </h2>
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        expandedCourses.has(course.id) ? 'transform rotate-180' : ''
                      }`}
                      style={{ color: 'var(--gray-a8)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Course Content - Chapters */}
                  {expandedCourses.has(course.id) && (
                    <div className="px-2 py-2">
                      {course.chapters.map((chapter) => (
                        <div key={chapter.id} className="mb-2">
                          {/* Chapter Header - Collapsible */}
                          <button
                            onClick={() => toggleChapter(chapter.id)}
                            className="w-full px-3 py-2 flex items-center justify-between hover:opacity-80 transition-opacity rounded-md"
                            style={{ background: 'var(--gray-2)' }}
                            type="button"
                          >
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-12)' }}>
                              {chapter.title}
                            </h3>
                            <svg
                              className={`h-3 w-3 transition-transform ${
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

                          {/* Chapter Content - Lessons */}
                          {expandedChapters.has(chapter.id) && (
                            <div className="ml-2 space-y-1 mt-1">
                              {chapter.lessons.map((lesson) => (
                                <button
                                  key={lesson.id}
                                  onClick={() => {
                                    setSelectedLesson(lesson);
                                    setSidebarOpen(false); // Close sidebar on mobile after selection
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2"
                                  style={{
                                    background: selectedLesson?.id === lesson.id ? 'var(--accent-3)' : 'transparent',
                                    color: selectedLesson?.id === lesson.id ? 'var(--accent-11)' : 'var(--gray-11)',
                                  }}
                                >
                                  {progress[lesson.id] && (
                                    <svg
                                      className="w-4 h-4 flex-shrink-0"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                      style={{ color: 'var(--green-9)' }}
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                  <span className="flex-1">{lesson.title}</span>
                                </button>
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
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto lg:ml-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 pt-20 lg:pt-12">
          {selectedLesson ? (
            <div>
              <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--gray-12)' }}>
                {selectedLesson.title}
              </h1>
              <div
                className="prose prose-lg max-w-none dark:prose-invert mb-12"
                style={{
                  color: 'var(--gray-12)',
                  '--tw-prose-body': 'var(--gray-12)',
                  '--tw-prose-headings': 'var(--gray-12)',
                  '--tw-prose-links': 'var(--accent-11)',
                  '--tw-prose-bold': 'var(--gray-12)',
                  '--tw-prose-code': 'var(--accent-11)',
                  '--tw-prose-pre-bg': 'var(--gray-3)',
                } as React.CSSProperties}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeRaw]}
                >
                  {selectedLesson.content}
                </ReactMarkdown>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-8 border-t" style={{ borderColor: 'var(--gray-a6)' }}>
                <button
                  onClick={goToPreviousLesson}
                  disabled={isFirstLesson}
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: isFirstLesson ? 'var(--gray-3)' : 'var(--gray-4)',
                    color: 'var(--gray-12)',
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous Lesson</span>
                  <span className="sm:hidden">Previous</span>
                </button>

                <button
                  onClick={() => markLessonComplete(selectedLesson.id)}
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-3 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: progress[selectedLesson.id] ? 'var(--green-3)' : 'var(--gray-4)',
                    color: progress[selectedLesson.id] ? 'var(--green-11)' : 'var(--gray-12)',
                  }}
                >
                  {progress[selectedLesson.id] ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Completed
                    </>
                  ) : (
                    <>Mark Complete</>
                  )}
                </button>

                <button
                  onClick={goToNextLesson}
                  disabled={isLastLesson}
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: isLastLesson ? 'var(--gray-3)' : 'var(--accent-9)',
                    color: isLastLesson ? 'var(--gray-12)' : 'var(--accent-contrast)',
                  }}
                >
                  <span className="hidden sm:inline">Next Lesson</span>
                  <span className="sm:hidden">Next</span>
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p style={{ color: 'var(--gray-11)' }}>Select a lesson to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
