'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface Lesson {
  id: string;
  title: string;
  content: string;
  lessonType: string;
  orderIndex: number;
  estimatedMinutes: number | null;
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface Module {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  chapters: Chapter[];
}

interface Generation {
  id: string;
  courseTitle: string;
  status: string;
  modules: Module[];
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function LocalEditorPage() {
  const params = useParams();
  const generationId = params.id as string;

  const [generation, setGeneration] = useState<Generation | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingType, setEditingType] = useState<'text' | 'video' | 'pdf'>('text');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Inline editing
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState('');

  // Modal states
  const [showNewChapterModal, setShowNewChapterModal] = useState(false);
  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ type: 'chapter' | 'lesson'; id: string; title: string } | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [targetModuleId, setTargetModuleId] = useState<string>('');
  const [targetChapterId, setTargetChapterId] = useState<string>('');

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Autosave
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

  // Fetch generation data
  const fetchGeneration = useCallback(async () => {
    if (!generationId) return;

    try {
      const res = await fetch(`/api/generate/${generationId}`);
      const data = await res.json();

      if (data.success) {
        setGeneration(data.data);
        if (data.data.modules?.length > 0 && !selectedModule) {
          const firstModule = data.data.modules[0];
          setSelectedModule(firstModule);
          if (firstModule.chapters?.length > 0 && !selectedChapter) {
            const firstChapter = firstModule.chapters[0];
            setSelectedChapter(firstChapter);
            if (firstChapter.lessons?.length > 0 && !selectedLesson) {
              selectLesson(firstChapter.lessons[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch generation:', error);
    } finally {
      setLoading(false);
    }
  }, [generationId]);

  useEffect(() => {
    fetchGeneration();
  }, [generationId]);

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

  // Warn before leaving
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
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setSelectedLesson(lesson);
    setEditingTitle(lesson.title);
    setEditingContent(lesson.content || '');
    setEditingType((lesson.lessonType as any) || 'text');
    originalContentRef.current = {
      title: lesson.title,
      content: lesson.content || '',
      type: lesson.lessonType || 'text',
    };
    setHasUnsavedChanges(false);
  };

  const saveLesson = async (isAutosave = false) => {
    if (!selectedLesson) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/generation/${generationId}/lesson/${selectedLesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTitle,
          content: editingContent,
          lessonType: editingType,
        }),
      });

      if (res.ok) {
        originalContentRef.current = { title: editingTitle, content: editingContent, type: editingType };
        setHasUnsavedChanges(false);
        showToast(isAutosave ? 'Autosaved' : 'Lesson saved', 'success');
        await fetchGeneration();
      } else {
        showToast('Failed to save', 'error');
      }
    } catch (err) {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Module operations
  const saveModuleTitle = async (moduleId: string) => {
    try {
      const res = await fetch(`/api/generation/${generationId}/module/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingModuleTitle }),
      });
      if (res.ok) {
        showToast('Module updated', 'success');
        setEditingModuleId(null);
        await fetchGeneration();
      } else {
        showToast('Failed to update', 'error');
      }
    } catch (err) {
      showToast('Failed to update', 'error');
    }
  };

  // Chapter operations
  const saveChapterTitle = async (chapterId: string) => {
    try {
      const res = await fetch(`/api/generation/${generationId}/chapter/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingChapterTitle }),
      });
      if (res.ok) {
        showToast('Chapter updated', 'success');
        setEditingChapterId(null);
        await fetchGeneration();
      } else {
        showToast('Failed to update', 'error');
      }
    } catch (err) {
      showToast('Failed to update', 'error');
    }
  };

  const createChapter = async () => {
    if (!newChapterTitle.trim() || !targetModuleId) return;
    try {
      const res = await fetch(`/api/generation/${generationId}/chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: targetModuleId, title: newChapterTitle }),
      });
      if (res.ok) {
        showToast('Chapter created', 'success');
        setShowNewChapterModal(false);
        setNewChapterTitle('');
        await fetchGeneration();
      } else {
        showToast('Failed to create', 'error');
      }
    } catch (err) {
      showToast('Failed to create', 'error');
    }
  };

  const deleteChapter = async (chapterId: string) => {
    try {
      const res = await fetch(`/api/generation/${generationId}/chapter/${chapterId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Chapter deleted', 'success');
        setShowDeleteModal(null);
        if (selectedChapter?.id === chapterId) {
          setSelectedChapter(null);
          setSelectedLesson(null);
        }
        await fetchGeneration();
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  // Lesson operations
  const createLesson = async () => {
    if (!newLessonTitle.trim() || !targetChapterId) return;
    try {
      const res = await fetch(`/api/generation/${generationId}/lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: targetChapterId, title: newLessonTitle, content: '', lessonType: 'text' }),
      });
      if (res.ok) {
        showToast('Lesson created', 'success');
        setShowNewLessonModal(false);
        setNewLessonTitle('');
        await fetchGeneration();
      } else {
        showToast('Failed to create', 'error');
      }
    } catch (err) {
      showToast('Failed to create', 'error');
    }
  };

  const deleteLesson = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/generation/${generationId}/lesson/${lessonId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Lesson deleted', 'success');
        setShowDeleteModal(null);
        if (selectedLesson?.id === lessonId) {
          setSelectedLesson(null);
          setEditingTitle('');
          setEditingContent('');
        }
        await fetchGeneration();
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-9)' }}></div>
          <p style={{ color: 'var(--gray-11)' }}>Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gray-1)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--gray-12)' }}>Generation not found</h2>
          <Link href="/" style={{ color: 'var(--accent-11)' }}>Back to Dashboard</Link>
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

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div
        className={`w-80 flex-shrink-0 overflow-y-auto fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'var(--gray-2)', borderRight: '1px solid var(--gray-a6)' }}
      >
        <div className="p-6 pt-16 lg:pt-6">
          <Link href={`/preview/${generationId}`} className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md hover:opacity-80" style={{ color: 'var(--accent-11)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Preview
          </Link>

          <h2 className="text-xl font-bold mb-4 truncate" style={{ color: 'var(--gray-12)' }}>{generation.courseTitle}</h2>

          <div className="space-y-4">
            {generation.modules.map((module) => (
              <div key={module.id}>
                {/* Module Header */}
                <div className="flex items-center gap-2 mb-2">
                  {editingModuleId === module.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingModuleTitle}
                        onChange={(e) => setEditingModuleTitle(e.target.value)}
                        className="flex-1 px-2 py-1 rounded text-sm"
                        style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveModuleTitle(module.id); if (e.key === 'Escape') setEditingModuleId(null); }}
                      />
                      <button onClick={() => saveModuleTitle(module.id)} className="p-1" style={{ color: 'var(--green-11)' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </button>
                      <button onClick={() => setEditingModuleId(null)} className="p-1" style={{ color: 'var(--red-11)' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold flex-1 truncate" style={{ color: 'var(--accent-11)' }}>{module.title}</h3>
                      <button onClick={() => { setEditingModuleId(module.id); setEditingModuleTitle(module.title); }} className="p-1 opacity-50 hover:opacity-100" style={{ color: 'var(--gray-11)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => { setTargetModuleId(module.id); setShowNewChapterModal(true); }} className="p-1 opacity-50 hover:opacity-100" style={{ color: 'var(--gray-11)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Chapters */}
                {module.chapters.map((chapter) => (
                  <div key={chapter.id} className="mb-3 ml-2">
                    <div className="flex items-center gap-2 mb-1">
                      {editingChapterId === chapter.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingChapterTitle}
                            onChange={(e) => setEditingChapterTitle(e.target.value)}
                            className="flex-1 px-2 py-1 rounded text-xs"
                            style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') saveChapterTitle(chapter.id); if (e.key === 'Escape') setEditingChapterId(null); }}
                          />
                          <button onClick={() => saveChapterTitle(chapter.id)} className="p-1" style={{ color: 'var(--green-11)' }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button onClick={() => setEditingChapterId(null)} className="p-1" style={{ color: 'var(--red-11)' }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-xs font-semibold flex-1 truncate" style={{ color: 'var(--gray-12)' }}>{chapter.title}</h4>
                          <button onClick={() => { setEditingChapterId(chapter.id); setEditingChapterTitle(chapter.title); }} className="p-1 opacity-50 hover:opacity-100" style={{ color: 'var(--gray-11)' }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => { setTargetChapterId(chapter.id); setShowNewLessonModal(true); }} className="p-1 opacity-50 hover:opacity-100" style={{ color: 'var(--gray-11)' }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          </button>
                          <button onClick={() => setShowDeleteModal({ type: 'chapter', id: chapter.id, title: chapter.title })} className="p-1 opacity-50 hover:opacity-100" style={{ color: 'var(--red-11)' }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                    <div className="space-y-1 ml-2">
                      {chapter.lessons.map((lesson) => (
                        <div key={lesson.id} className="group flex items-center">
                          <button
                            onClick={() => { selectLesson(lesson); setSidebarOpen(false); }}
                            className="flex-1 text-left px-2 py-1 rounded text-xs transition-colors truncate"
                            style={{
                              background: selectedLesson?.id === lesson.id ? 'var(--accent-3)' : 'transparent',
                              color: selectedLesson?.id === lesson.id ? 'var(--accent-11)' : 'var(--gray-11)',
                            }}
                          >
                            {lesson.title}
                          </button>
                          <button onClick={() => setShowDeleteModal({ type: 'lesson', id: lesson.id, title: lesson.title })} className="p-1 opacity-0 group-hover:opacity-50 hover:!opacity-100" style={{ color: 'var(--red-11)' }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pt-16 lg:pt-8">
          {selectedLesson ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-12)' }}>Edit Lesson</h1>
                  {hasUnsavedChanges && (
                    <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--yellow-3)', color: 'var(--yellow-11)' }}>Unsaved</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium"
                    style={{ background: showPreview ? 'var(--accent-3)' : 'var(--gray-4)', color: showPreview ? 'var(--accent-11)' : 'var(--gray-12)' }}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => saveLesson()}
                    disabled={saving || !hasUnsavedChanges}
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                    style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}
                  >
                    {saving ? 'Saving...' : 'Save (Ctrl+S)'}
                  </button>
                </div>
              </div>

              {/* Lesson Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>Type</label>
                <div className="flex gap-2">
                  {['text', 'video', 'pdf'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setEditingType(type as any)}
                      className="px-4 py-2 rounded-md text-sm font-medium"
                      style={{ background: editingType === type ? 'var(--accent-9)' : 'var(--gray-4)', color: editingType === type ? 'var(--accent-contrast)' : 'var(--gray-12)' }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>Title</label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-md"
                  style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }}
                />
              </div>

              {/* Content */}
              <div className={`grid gap-6 mb-6 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>Content (Markdown)</label>
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={20}
                    className="w-full px-4 py-3 rounded-md font-mono text-sm resize-y"
                    style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)', minHeight: '400px' }}
                  />
                </div>
                {showPreview && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>Preview</label>
                    <div className="rounded-md p-4 overflow-y-auto prose prose-sm dark:prose-invert max-w-none" style={{ background: 'var(--gray-3)', border: '1px solid var(--gray-a6)', minHeight: '400px', maxHeight: '600px', color: 'var(--gray-12)' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {editingContent || '*No content yet...*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p style={{ color: 'var(--gray-11)' }}>Select a lesson to edit</p>
            </div>
          )}
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px]" style={{ background: toast.type === 'success' ? 'var(--green-9)' : toast.type === 'error' ? 'var(--red-9)' : 'var(--accent-9)', color: 'white' }}>
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:opacity-80">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* New Chapter Modal */}
      {showNewChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="max-w-md w-full rounded-lg shadow-xl p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--gray-12)' }}>Add Chapter</h3>
            <input type="text" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Chapter title..." className="w-full px-4 py-3 rounded-md mb-4" style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') createChapter(); }} />
            <div className="flex gap-3">
              <button onClick={() => { setShowNewChapterModal(false); setNewChapterTitle(''); }} className="flex-1 px-4 py-2 rounded-md text-sm font-medium" style={{ background: 'var(--gray-4)', color: 'var(--gray-12)' }}>Cancel</button>
              <button onClick={createChapter} disabled={!newChapterTitle.trim()} className="flex-1 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50" style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* New Lesson Modal */}
      {showNewLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="max-w-md w-full rounded-lg shadow-xl p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--gray-12)' }}>Add Lesson</h3>
            <input type="text" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} placeholder="Lesson title..." className="w-full px-4 py-3 rounded-md mb-4" style={{ background: 'var(--gray-3)', color: 'var(--gray-12)', border: '1px solid var(--gray-a6)' }} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') createLesson(); }} />
            <div className="flex gap-3">
              <button onClick={() => { setShowNewLessonModal(false); setNewLessonTitle(''); }} className="flex-1 px-4 py-2 rounded-md text-sm font-medium" style={{ background: 'var(--gray-4)', color: 'var(--gray-12)' }}>Cancel</button>
              <button onClick={createLesson} disabled={!newLessonTitle.trim()} className="flex-1 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50" style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="max-w-md w-full rounded-lg shadow-xl p-6" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--gray-12)' }}>Delete {showDeleteModal.type}?</h3>
            <p className="mb-4" style={{ color: 'var(--gray-11)' }}>Delete "{showDeleteModal.title}"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2 rounded-md text-sm font-medium" style={{ background: 'var(--gray-4)', color: 'var(--gray-12)' }}>Cancel</button>
              <button onClick={() => { if (showDeleteModal.type === 'chapter') deleteChapter(showDeleteModal.id); else deleteLesson(showDeleteModal.id); }} className="flex-1 px-4 py-2 rounded-md text-sm font-medium" style={{ background: 'var(--red-9)', color: 'white' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
