'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function CourseEditorPage() {
  const params = useParams();
  const router = useRouter();
  const experienceId = params.experienceId as string;

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

  useEffect(() => {
    if (!experienceId) return;

    fetch(`/api/course/experience/${experienceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setExperience(data.data);
          if (data.data.courses?.length > 0) {
            const firstCourse = data.data.courses[0];
            setSelectedCourse(firstCourse);
            if (firstCourse.chapters?.length > 0) {
              setSelectedChapter(firstCourse.chapters[0]);
              if (firstCourse.chapters[0].lessons?.length > 0) {
                const firstLesson = firstCourse.chapters[0].lessons[0];
                setSelectedLesson(firstLesson);
                setEditingTitle(firstLesson.title);
                setEditingContent(firstLesson.content);
                setEditingType(firstLesson.lesson_type as any);
              }
            }
          }
        } else {
          setError(data.error?.message || 'Failed to load course');
        }
      })
      .catch((err) => {
        setError('Failed to load course: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [experienceId]);

  const selectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setEditingTitle(lesson.title);
    setEditingContent(lesson.content);
    setEditingType(lesson.lesson_type as any);
  };

  const saveLesson = async () => {
    if (!selectedLesson) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/course/lesson/${selectedLesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTitle,
          content: editingContent,
          lesson_type: editingType,
        }),
      });

      if (response.ok) {
        // Update local state
        setSelectedLesson({ ...selectedLesson, title: editingTitle, content: editingContent, lesson_type: editingType });

        // Refresh experience data
        const refreshResponse = await fetch(`/api/course/experience/${experienceId}`);
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setExperience(refreshData.data);
        }
      } else {
        alert('Failed to save lesson');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save lesson');
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

        // Append the file URL to existing content instead of replacing
        const fileEmbed = editingType === 'pdf'
          ? `\n\n[📄 ${data.fileName}](${data.url})\n\n`
          : `\n\n[🎥 ${data.fileName}](${data.url})\n\n`;

        setEditingContent(editingContent + fileEmbed);
      } else {
        alert('Failed to upload file');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--gray-1)' }}>
      {/* Sidebar - Course Structure */}
      <div className="w-80 flex-shrink-0 overflow-y-auto" style={{ background: 'var(--gray-2)', borderRight: '1px solid var(--gray-a6)' }}>
        <div className="p-6">
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
            <h2 className="text-xl font-bold" style={{ color: 'var(--gray-12)' }}>
              {experience.name}
            </h2>
            <Link
              href={`/course/${experienceId}`}
              className="p-2 rounded-md hover:bg-gray-100"
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
                  <h3 className="text-base font-bold mb-3" style={{ color: 'var(--accent-11)' }}>
                    {course.title}
                  </h3>
                  {course.chapters.map((chapter) => (
                    <div key={chapter.id} className="mb-4">
                      <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--gray-12)' }}>
                        {chapter.title}
                      </h4>
                      <div className="space-y-1">
                        {chapter.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => selectLesson(lesson)}
                            className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2"
                            style={{
                              background: selectedLesson?.id === lesson.id ? 'var(--accent-3)' : 'transparent',
                              color: selectedLesson?.id === lesson.id ? 'var(--accent-11)' : 'var(--gray-11)',
                            }}
                          >
                            <span className="flex-1">{lesson.title}</span>
                            <span className="text-xs opacity-60">{lesson.lesson_type}</span>
                          </button>
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
        <div className="max-w-5xl mx-auto px-8 py-12">
          {selectedLesson ? (
            <div>
              {/* Editor Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-12)' }}>
                  Edit Lesson
                </h1>
                <button
                  onClick={saveLesson}
                  disabled={saving}
                  className="inline-flex items-center px-6 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'var(--accent-9)', color: 'var(--accent-contrast)' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
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

              {/* Content Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-12)' }}>
                  {editingType === 'text' && 'Content (Markdown supported)'}
                  {editingType === 'video' && 'Video URL or Embed Code'}
                  {editingType === 'pdf' && 'PDF URL'}
                </label>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 rounded-md text-base font-mono"
                  style={{
                    background: 'var(--gray-3)',
                    color: 'var(--gray-12)',
                    border: '1px solid var(--gray-a6)',
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
                  {editingContent && (editingType === 'video' || editingType === 'pdf') && (
                    <p className="mt-2 text-sm" style={{ color: 'var(--green-11)' }}>
                      ✓ File uploaded successfully
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p style={{ color: 'var(--gray-11)' }}>Select a lesson to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
