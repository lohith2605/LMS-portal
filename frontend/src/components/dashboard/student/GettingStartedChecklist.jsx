import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { courseService } from '../../../services/api';
import CourseCard from './CourseCard';

export default function GettingStartedChecklist({
  user,
  enrolledCourses = [],
  setActiveTab,
}) {
  const [recommendedCourses, setRecommendedCourses] = useState([]);

  // Check real state for checklist steps
  const isEmailVerified = Boolean(user?.emailVerified);
  const isEnrolled = enrolledCourses.length > 0;
  const isLessonCompleted = enrolledCourses.some(
    (e) => (e.completedCount || 0) > 0 || (e.progressPercentage || 0) > 0
  );

  const checklist = [
    {
      id: 'verify_email',
      title: 'Verify your email address',
      description: 'Confirm your account identity to receive course updates and earn verifiable certificates.',
      isCompleted: isEmailVerified,
      action: !isEmailVerified ? (
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Verify email</span>
          <ArrowRight size={12} />
        </button>
      ) : null,
    },
    {
      id: 'explore_catalog',
      title: 'Explore the course catalog',
      description: 'Discover curriculum tracks tailored to development, design, and data engineering.',
      isCompleted: isEnrolled,
      action: (
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Browse tracks</span>
          <ArrowRight size={12} />
        </button>
      ),
    },
    {
      id: 'enroll_first',
      title: 'Enroll in your first course',
      description: 'Select a course track to access interactive video modules, syllabi, and cohort materials.',
      isCompleted: isEnrolled,
      action: !isEnrolled ? (
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Select a course</span>
          <ArrowRight size={12} />
        </button>
      ) : null,
    },
    {
      id: 'complete_lesson',
      title: 'Complete your first lesson',
      description: 'Watch video content, inspect lesson summaries, and mark your first module finished.',
      isCompleted: isLessonCompleted,
      action: isEnrolled && !isLessonCompleted ? (
        <button
          type="button"
          onClick={() => setActiveTab('learning')}
          className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Go to lesson</span>
          <ArrowRight size={12} />
        </button>
      ) : null,
    },
  ];

  const completedStepsCount = checklist.filter((item) => item.isCompleted).length;

  useEffect(() => {
    let isMounted = true;

    courseService
      .getCourses({ limit: 6 })
      .then((res) => {
        if (!isMounted) return;
        const allCourses = res?.courses || [];
        const enrolledIds = new Set(
          enrolledCourses.map((e) => (e.course?._id || e.course?.id || '').toString())
        );
        // Cap to courses the student is NOT already enrolled in, max 3
        const nonEnrolled = allCourses
          .filter((c) => !enrolledIds.has((c._id || c.id || '').toString()))
          .slice(0, 3);
        setRecommendedCourses(nonEnrolled);
      })
      .catch(() => {
        if (isMounted) setRecommendedCourses([]);
      });

    return () => {
      isMounted = false;
    };
  }, [enrolledCourses]);

  return (
    <div className="space-y-6">
      {/* Getting Started Checklist Card */}
      <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-cobalt" />
              <h3 className="text-sm font-bold text-primary">Getting Started Checklist</h3>
            </div>
            <p className="text-xs text-secondary">
              Follow these simple steps to begin your learning journey on LearnSpace.
            </p>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cobalt-soft text-cobalt border border-cobalt-border self-start sm:self-auto shrink-0">
            {completedStepsCount} of {checklist.length} completed
          </span>
        </div>

        <div className="space-y-3">
          {checklist.map((step) => (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                step.isCompleted
                  ? 'bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                  : 'bg-surface-subtle border-border-subtle'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {step.isCompleted ? (
                  <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Circle size={17} className="text-tertiary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4
                    className={`text-xs font-bold ${
                      step.isCompleted
                        ? 'text-primary line-through opacity-80'
                        : 'text-primary'
                    }`}
                  >
                    {step.title}
                  </h4>
                  {step.action}
                </div>
                <p className="text-[11px] text-secondary mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Courses Inline */}
      {recommendedCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-primary">Recommended Courses for You</h3>
              <p className="text-xs text-secondary">Popular tracks selected by top industry instructors</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedCourses.map((course) => (
              <CourseCard
                key={course._id || course.id}
                course={course}
                variant="explore"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
