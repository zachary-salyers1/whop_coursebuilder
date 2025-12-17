'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
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

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function CourseEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const experienceId = params.experienceId as string;
  const companyId = searchParams.get('companyId');

  const [experience, setExperience] = useState<Experience | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editor state
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingType, setEditingType] = useState<'text' | 'video' | 'pdf'>('text');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Editing chapter/course titles
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState('');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseTitle, setEditingCourseTitle] = useState('');

  // Modal states
  const [showNewChapterModal, setShowNewChapterModal] = useState(false);
  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ type: 'chapter' | 'lesson'; id: string; title: string } | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [targetCourseId, setTargetCourseId] = useState<string>('');
  const [targetChapterId, setTargetChapterId] = useState<string>('');

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Autosave timer
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const originalContentRef = useRef<{ title: string; content: string; type: string }>({ title: '', content: '', type: 'text' });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch experience data
  const fetchExperience = useCallback(async () => {
    if (!experienceId) return;

    try {
      const response = await fetch(`/api/course/experience/${experienceId}${companyId ? `?companyId=${companyId}` : ''}`);
      const data = await response.json();

      if (data.success) {
        setExperience(data.data);
        if (data.data.courses?.length > 0 && !selectedCourse) {
          const firstCourse = data.data.courses[0];
          setSelectedCourse(firstCourse);
          if (firstCourse.chapters?.length > 0 && !selectedChapter) {
            setSelectedChapter(firstCourse.chapters[0]);
            if (firstCourse.chapters[0].lessons?.length > 0 && !selectedLesson) {
              const firstLesson = firstCourse.chapters[0].lessons[0];
              selectLesson(firstLesson);
            }
          }
        }
      } else {
        setError(data.error?.message || 'Failed to load course');
      }
    } catch (err) {
      setError('Failed to load course: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [experienceId, selectedCourse, selectedChapter, selectedLesson]);

  useEffect(() => {
    fetchExperience();
  }, [experienceId]);

  // Track unsaved changes
  useEffect(() => {
    if (selectedLesson) {
      const hasChanges =
        editingTitle !== originalContentRef.current.title ||
        editingContent !== originalContentRef.current.content ||
        editingType !== originalContentRef.current.type;
      setHasUnsavedChanges(hasChanges);
    }
  }, [editingTitle, editingContent, editingType, selectedLesson]);

  // Autosave
  useEffect(() => {
    if (hasUnsavedChanges && selectedLesson) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        saveLesson(true);
      }, 5000);
    }
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, editingTitle, editingContent, editingType]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && selectedLesson) {
          saveLesson();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, selectedLesson, editingTitle, editingContent, editingType]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const selectLesson = (lesson: Lesson) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Do you want to discard them?')) {
        return;
      }
    }
    setSelectedLesson(lesson);
    setEditingTitle(lesson.title);
    setEditingContent(lesson.content || '');
    setEditingType((lesson.lesson_type as any) || 'text');
    originalContentRef.current = {
      title: lesson.title,
      content: lesson.content || '',
      type: lesson.lesson_type || 'text',
    };
    setHasUnsavedChanges(false);
  };

  const saveLesson = async (isAutosave = false) => {
    if (!selectedLesson) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/course/lesson/${selectedLesson.id}${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTitle,
          content: editingContent,
          lesson_type: editingType,
        }),
      });

      if (response.ok) {
        originalContentRef.current = {
          title: editingTitle,
          content: editingContent,
          type: editingType,
        };
        setHasUnsavedChanges(false);
        showToast(isAutosave ? 'Autosaved' : 'Lesson saved successfully', 'success');
        await fetchExperience();
      } else {
        showToast('Failed to save lesson', 'error');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save lesson', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', editingType);

      const response = await fetch('/api/upload/media', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const fileEmbed = editingType === 'pdf'
          ? `\n\n[📄 ${data.fileName}](${data.url})\n\n`
          : `\n\n[🎥 ${data.fileName}](${data.url})\n\n`;
        setEditingContent(editingContent + fileEmbed);
        showToast('File uploaded successfully', 'success');
      } else {
        showToast('Failed to upload file', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Failed to upload file', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Chapter operations
  const saveChapterTitle = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/course/chapter/${chapterId}${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingChapterTitle }),
      });

      if (response.ok) {
        showToast('Chapter updated', 'success');
        setEditingChapterId(null);
        await fetchExperience();
      } else {
        showToast('Failed to update chapter', 'error');
      }
    } catch (err) {
      showToast('Failed to update chapter', 'error');
    }
  };

  const createChapter = async () => {
    if (!newChapterTitle.trim() || !targetCourseId) return;

    try {
      const response = await fetch(`/api/course/chapter${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: targetCourseId, title: newChapterTitle }),
      });

      if (response.ok) {
        showToast('Chapter created', 'success');
        setShowNewChapterModal(false);
        setNewChapterTitle('');
        await fetchExperience();
      } else {
        showToast('Failed to create chapter', 'error');
      }
    } catch (err) {
      showToast('Failed to create chapter', 'error');
    }
  };

  const deleteChapter = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/course/chapter/${chapterId}${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Chapter deleted', 'success');
        setShowDeleteModal(null);
        if (selectedChapter?.id === chapterId) {
          setSelectedChapter(null);
          setSelectedLesson(null);
        }
        await fetchExperience();
      } else {
        showToast('Failed to delete chapter', 'error');
      }
    } catch (err) {
      showToast('Failed to delete chapter', 'error');
    }
  };

  // Lesson operations
  const createLesson = async () => {
    if (!newLessonTitle.trim() || !targetChapterId) return;

    try {
      const response = await fetch(`/api/course/lesson${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: targetChapterId,
          title: newLessonTitle,
          content: '',
          lessonType: 'text',
        }),
      });

      if (response.ok) {
        showToast('Lesson created', 'success');
        setShowNewLessonModal(false);
        setNewLessonTitle('');
        await fetchExperience();
      } else {
        showToast('Failed to create lesson', 'error');
      }
    } catch (err) {
      showToast('Failed to create lesson', 'error');
    }
  };

  const deleteLesson = async (lessonId: string) => {
    try {
      const response = await fetch(`/api/course/lesson/${lessonId}${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Lesson deleted', 'success');
        setShowDeleteModal(null);
        if (selectedLesson?.id === lessonId) {
          setSelectedLesson(null);
          setEditingTitle('');
          setEditingContent('');
        }
        await fetchExperience();
      } else {
        showToast('Failed to delete lesson', 'error');
      }
    } catch (err) {
      showToast('Failed to delete lesson', 'error');
    }
  };

  // Course title operations
  const saveCourseTitle = async (courseId: string) => {
    try {
      const response = await fetch(`/api/course/module/${courseId}${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingCourseTitle }),
      });

      if (response.ok) {
        showToast('Course updated', 'success');
        setEditingCourseId(null);
        await fetchExperience();
      } else {
        showToast('Failed to update course', 'error');
      }
    } catch (err) {
      showToast('Failed to update course', 'error');
    }
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
          <Link href="/" className="text-sm" style={{ color: 'var(--accent-11)' }}>
            Back to Dashboard
          </Link>
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

      {/* Sidebar - Course Structure */}
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

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold truncate" style={{ color: 'var(--gray-12)' }}>
              {experience.name}
            </h2>
            <Link
              href={`/course/${experienceId}`}
              className="p-2 rounded-md hover:opacity-80"
              style={{ color: 'var(--accent-11)' }}
              title="View Course"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Link>
          </div>

          {experience.courses && experience.courses.length > 0 && (
            <div className="space-y-6">
              {experience.courses.map((course) => (
                <div key={course.id}>
                  {/* Course Title - Editable */}
                  <div className="flex items-center gap-2 mb-3">
                    {editingCourseId === course.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCourseTitle}
                          onChange={(e) => setEditingCourseTitle(e.target.value)}
                          className="flex-1 px-2 py-1 rounded text-sm"
                          style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCourseTitle(course.id);
                            if (e.key === 'Escape') setEditingCourseId(null);
                          }}
                        />
                        <button onClick={() => saveCourseTitle(course.id)} className="p-1 hover:opacity-80" style={{ color: 'var(--green-11)' }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button onClick={() => setEditingCourseId(null)} className="p-1 hover:opacity-80" style={{ color: 'var(--red-11)' }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-bold flex-1 truncate" style={{ color: 'var(--accent-11)' }}>
                          {course.title}
                        </h3>
                        <button
                          onClick={() => { setEditingCourseId(course.id); setEditingCourseTitle(course.title); }}
                          className="p-1 hover:opacity-80 opacity-50 hover:opacity-100"
                          style={{ color: 'var(--gray-11)' }}
                          title="Edit title"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setTargetCourseId(course.id); setShowNewChapterModal(true); }}
                          className="p-1 hover:opacity-80 opacity-50 hover:opacity-100"
                          style={{ color: 'var(--gray-11)' }}
                          title="Add chapter"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {course.chapters.map((chapter) => (
                    <div key={chapter.id} className="mb-4">
                      {/* Chapter Title - Editable */}
                      <div className="flex items-center gap-2 mb-2">
                        {editingChapterId === chapter.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingChapterTitle}
                              onChange={(e) => setEditingChapterTitle(e.target.value)}
                              className="flex-1 px-2 py-1 rounded text-sm"
                              style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveChapterTitle(chapter.id);
                                if (e.key === 'Escape') setEditingChapterId(null);
                              }}
                            />
                            <button onClick={() => saveChapterTitle(chapter.id)} className="p-1 hover:opacity-80" style={{ color: 'var(--green-11)' }}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button onClick={() => setEditingChapterId(null)} className="p-1 hover:opacity-80" style={{ color: 'var(--red-11)' }}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--gray-12)' }}>
                              {chapter.title}
                            </h4>
                            <button
                              onClick={() => { setEditingChapterId(chapter.id); setEditingChapterTitle(chapter.title); }}
                              className="p-1 hover:opacity-80 opacity-0 group-hover:opacity-50 hover:!opacity-100"
                              style={{ color: 'var(--gray-11)' }}
                              title="Edit title"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { setTargetChapterId(chapter.id); setShowNewLessonModal(true); }}
                              className="p-1 hover:opacity-80 opacity-50 hover:opacity-100"
                              style={{ color: 'var(--gray-11)' }}
                              title="Add lesson"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setShowDeleteModal({ type: 'chapter', id: chapter.id, title: chapter.title })}
                              className="p-1 hover:opacity-80 opacity-50 hover:opacity-100"
                              style={{ color: 'var(--red-11)' }}
                              title="Delete chapter"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                      <div className="space-y-1">
                        {chapter.lessons.map((lesson) => (
                          <div key={lesson.id} className="group flex items-center">
                            <button
                              onClick={() => { selectLesson(lesson); setSidebarOpen(false); }}
                              className="flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2"
                              style={{
                                background: selectedLesson?.id === lesson.id ? 'var(--accent-3)' : 'transparent',
                                color: selectedLesson?.id === lesson.id ? 'var(--accent-11)' : 'var(--gray-11)',
                              }}
                            >
                              <span className="flex-1 truncate">{lesson.title}</span>
                              <span className="text-xs opacity-60">{lesson.lesson_type}</span>
                            </button>
                            <button
                              onClick={() => setShowDeleteModal({ type: 'lesson', id: lesson.id, title: lesson.title })}
                              className="p-1 hover:opacity-80 opacity-0 group-hover:opacity-50 hover:!opacity-100"
                              style={{ color: 'var(--red-11)' }}
                              title="Delete lesson"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pt-16 lg:pt-8">
          {selectedLesson ? (
            <div>
              {/* Editor Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-12)' }}>
                    Edit Lesson
                  </h1>
                  {hasUnsavedChanges && (
                    <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--yellow-3)', color: 'var(--yellow-11)' }}>
                      Unsaved changes
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    style={{
                      background: showPreview ? 'var(--accent-3)' : 'var(--gray-4)',
                      color: showPreview ? 'var(--accent-11)' : 'var(--gray-12)',
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                  <button
                    onClick={() => saveLesson()}
                    disabled={saving || !hasUnsavedChanges}
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>Save (Ctrl+S)</>
                    )}
                  </button>
                </div>
              </div>

              {/* Lesson Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>
                  Lesson Type
                </label>
                <div className="flex gap-2">
                  {['text', 'video', 'pdf'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setEditingType(type as any)}
                      className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{
                        background: editingType === type ? 'var(--accent-9)' : 'var(--gray-4)',
                        color: editingType === type ? 'var(--accent-contrast)' : 'var(--gray-12)',
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>
                  Lesson Title
                </label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-md text-base"
                  style={{
                    background: 'var(--gray-3)',
                    color: 'var(--gray-12)',
                    border: '1px solid var(--gray-a6)',
                  }}
                  placeholder="Enter lesson title..."
                />
              </div>

              {/* Content Editor with Preview */}
              <div className={`grid gap-6 mb-6 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>
                    {editingType === 'text' && 'Content (Markdown supported)'}
                    {editingType === 'video' && 'Video URL or Embed Code'}
                    {editingType === 'pdf' && 'PDF URL'}
                  </label>
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={20}
                    className="w-full px-4 py-3 rounded-md text-base font-mono resize-y"
                    style={{
                      background: 'var(--gray-3)',
                      color: 'var(--gray-12)',
                      border: '1px solid var(--gray-a6)',
                      minHeight: '400px',
                    }}
                    placeholder={
                      editingType === 'text'
                        ? 'Enter lesson content in markdown format...'
                        : editingType === 'video'
                        ? 'Enter video URL (YouTube, Vimeo) or embed code...'
                        : 'Enter PDF URL...'
                    }
                  />
                </div>

                {showPreview && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>
                      Preview
                    </label>
                    <div
                      className="rounded-md p-4 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
                      style={{
                        background: 'var(--gray-3)',
                        border: '1px solid var(--gray-a6)',
                        minHeight: '400px',
                        maxHeight: '600px',
                        color: 'var(--gray-12)',
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {editingContent || '*No content yet...*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Buttons */}
              {editingType !== 'text' && (
                <div className="mb-6">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept={editingType === 'video' ? 'video/*' : 'application/pdf'}
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors"
                    style={{
                      background: uploading ? 'var(--gray-3)' : 'var(--gray-4)',
                      color: 'var(--gray-12)',
                      opacity: uploading ? 0.5 : 1,
                    }}
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload {editingType === 'video' ? 'Video' : 'PDF'}
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--gray-a6)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p style={{ color: 'var(--gray-11)' }}>Select a lesson from the sidebar to edit</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] animate-slide-in"
            style={{
              background: toast.type === 'success' ? 'var(--green-9)' : toast.type === 'error' ? 'var(--red-9)' : 'var(--accent-9)',
              color: 'white',
            }}
          >
            {toast.type === 'success' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:opacity-80">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* New Chapter Modal */}
      {showNewChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="max-w-md w-full rounded-lg shadow-xl p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--gray-12)' }}>Add New Chapter</h3>
            <input
              type="text"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              placeholder="Chapter title..."
              className="w-full px-4 py-3 rounded-md mb-4"
              style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') createChapter(); }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewChapterModal(false); setNewChapterTitle(''); }}
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium"
                style={{ background: 'var(--gray-4)', color: 'var(--gray-12)' }}
              >
                Cancel
              </button>
              <button
                onClick={createChapter}
                disabled={!newChapterTitle.trim()}
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Lesson Modal */}
      {showNewLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="max-w-md w-full rounded-lg shadow-xl p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--gray-12)' }}>Add New Lesson</h3>
            <input
              type="text"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              placeholder="Lesson title..."
              className="w-full px-4 py-3 rounded-md mb-4"
              style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') createLesson(); }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewLessonModal(false); setNewLessonTitle(''); }}
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium"
                style={{ background: 'var(--gray-4)', color: 'var(--gray-12)' }}
              >
                Cancel
              </button>
              <button
                onClick={createLesson}
                disabled={!newLessonTitle.trim()}
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="max-w-md w-full rounded-lg shadow-xl p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--gray-12)' }}>
              Delete {showDeleteModal.type === 'chapter' ? 'Chapter' : 'Lesson'}?
            </h3>
            <p className="mb-4" style={{ color: 'var(--gray-11)' }}>
              Are you sure you want to delete "{showDeleteModal.title}"?
              {showDeleteModal.type === 'chapter' && ' This will also delete all lessons in this chapter.'}
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium"
                style={{ background: 'var(--gray-4)', color: 'var(--gray-12)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteModal.type === 'chapter') {
                    deleteChapter(showDeleteModal.id);
                  } else {
                    deleteLesson(showDeleteModal.id);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium"
                style={{ background: 'var(--red-9)', color: 'white' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
