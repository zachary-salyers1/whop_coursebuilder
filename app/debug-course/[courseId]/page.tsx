'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DebugCoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/debug/course?course_id=${courseId}`)
      .then(r => r.json())
      .then(data => {
        setCourseData(data);
        setLoading(false);
      });
  }, [courseId]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!courseData?.success) {
    return <div className="p-8">Error loading course</div>;
  }

  const course = courseData.courseData;

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--gray-1)' }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--gray-12)' }}>
          {course.title}
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--gray-11)' }}>
          {courseData.chaptersCount} chapters • {courseData.lessonsCount} lessons
        </p>

        <div className="space-y-6">
          {course.chapters.map((chapter: any, idx: number) => (
            <div
              key={chapter.id}
              className="rounded-lg p-6"
              style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-11)' }}>
                Chapter {idx + 1}: {chapter.title}
              </h2>
              <div className="space-y-2">
                {chapter.lessons.map((lesson: any, lessonIdx: number) => (
                  <div
                    key={lesson.id}
                    className="p-3 rounded"
                    style={{ background: 'var(--gray-3)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--gray-12)' }}>
                        Lesson {lessonIdx + 1}: {lesson.title}
                      </span>
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: 'var(--gray-4)', color: 'var(--gray-11)' }}
                      >
                        {lesson.lesson_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
