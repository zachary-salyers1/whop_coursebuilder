'use client';

import { useState } from 'react';

export default function TestPublishPage() {
  const [experienceId, setExperienceId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [loading, setLoading] = useState(false);

  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_1Io4EO2Twj9wo7';

  const buttonClass = "px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";
  const buttonStyle = (disabled: boolean) => ({
    color: 'var(--accent-contrast)',
    background: disabled ? 'var(--gray-6)' : 'var(--accent-9)',
    border: '1px solid',
    borderColor: disabled ? 'var(--gray-7)' : 'var(--accent-10)',
  });

  const createExperience = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-publish/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      console.log('Experience created:', data);
      if (data.success) {
        setExperienceId(data.data.id);
        alert(`Experience created: ${data.data.id}`);
      } else {
        alert(`Failed: ${data.error?.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async () => {
    if (!experienceId) {
      alert('Create an experience first!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/test-publish/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experienceId }),
      });
      const data = await res.json();
      console.log('Course created:', data);
      if (data.success) {
        setCourseId(data.data.id);
        alert(`Course created: ${data.data.id}`);
      } else {
        alert(`Failed: ${data.error?.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const createChapter = async () => {
    if (!courseId) {
      alert('Create a course first!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/test-publish/chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      console.log('Chapter created:', data);
      if (data.success) {
        setChapterId(data.data.id);
        alert(`Chapter created: ${data.data.id}`);
      } else {
        alert(`Failed: ${data.error?.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const createLesson = async () => {
    if (!chapterId) {
      alert('Create a chapter first!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/test-publish/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId }),
      });
      const data = await res.json();
      console.log('Lesson created:', data);
      if (data.success) {
        setLessonId(data.data.id);
        alert(`Lesson created: ${data.data.id}`);
      } else {
        alert(`Failed: ${data.error?.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gray-1)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--gray-12)' }}>
          Test Whop Course Publishing
        </h1>

        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--gray-12)' }}>
              1. Create Experience
            </h2>
            <button
              onClick={createExperience}
              disabled={loading || !!experienceId}
              className={buttonClass}
              style={buttonStyle(loading || !!experienceId)}
            >
              Create Experience
            </button>
            {experienceId && (
              <p className="mt-2 text-sm" style={{ color: 'var(--gray-11)' }}>
                Experience ID: {experienceId}
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--gray-12)' }}>
              2. Create Course
            </h2>
            <button
              onClick={createCourse}
              disabled={loading || !experienceId || !!courseId}
              className={buttonClass}
              style={buttonStyle(loading || !experienceId || !!courseId)}
            >
              Create Course
            </button>
            {courseId && (
              <p className="mt-2 text-sm" style={{ color: 'var(--gray-11)' }}>
                Course ID: {courseId}
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--gray-12)' }}>
              3. Create Chapter
            </h2>
            <button
              onClick={createChapter}
              disabled={loading || !courseId || !!chapterId}
              className={buttonClass}
              style={buttonStyle(loading || !courseId || !!chapterId)}
            >
              Create Chapter
            </button>
            {chapterId && (
              <p className="mt-2 text-sm" style={{ color: 'var(--gray-11)' }}>
                Chapter ID: {chapterId}
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--gray-12)' }}>
              4. Create Lesson
            </h2>
            <button
              onClick={createLesson}
              disabled={loading || !chapterId || !!lessonId}
              className={buttonClass}
              style={buttonStyle(loading || !chapterId || !!lessonId)}
            >
              Create Lesson
            </button>
            {lessonId && (
              <p className="mt-2 text-sm" style={{ color: 'var(--gray-11)' }}>
                Lesson ID: {lessonId}
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--success-3)', border: '1px solid var(--success-6)' }}>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--gray-12)' }}>
              Summary
            </h2>
            <div className="text-sm space-y-1" style={{ color: 'var(--gray-11)' }}>
              <p>Experience: {experienceId || 'Not created'}</p>
              <p>Course: {courseId || 'Not created'}</p>
              <p>Chapter: {chapterId || 'Not created'}</p>
              <p>Lesson: {lessonId || 'Not created'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
