import React from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, BookOpen, Sparkles, Compass } from 'lucide-react';
import AnimatedProgressBar from '../../ui/AnimatedProgressBar';

export default function ResumeLearningCard({
  resumeLearning = null,
  hasEnrollments = false,
  setActiveTab,
}) {
  // Case 1: Active In-Progress Lesson to Resume
  if (resumeLearning) {
    const courseSlug = resumeLearning.courseSlug || resumeLearning.courseId;
    const progress = Math.min(100, Math.max(0, resumeLearning.progressPercentage || 0));

    return (
      <div className="bg-surface border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs hover:border-cobalt/40 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cobalt-soft text-cobalt border border-cobalt-border">
              <Play size={10} className="fill-cobalt" />
              <span>Resume Learning</span>
            </span>
            <span className="text-xs text-secondary font-medium">
              {progress}% completed
            </span>
          </div>

          <span className="text-[11px] text-tertiary">
            {resumeLearning.lastAccessedAt ? (
              <span>Last active: {new Date(resumeLearning.lastAccessedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            ) : null}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight truncate">
              {resumeLearning.courseTitle}
            </h3>

            <p className="text-xs text-secondary truncate">
              {resumeLearning.sectionTitle && (
                <span className="font-medium text-tertiary">{resumeLearning.sectionTitle} • </span>
              )}
              <span className="font-semibold text-primary">
                {resumeLearning.lessonTitle || 'Continue next lesson'}
              </span>
            </p>

            <div className="pt-2 max-w-md">
              <AnimatedProgressBar
                progress={progress}
                inProgress={progress > 0 && progress < 100}
                height="h-1.5"
                colorClass="bg-cobalt"
                ariaLabel={`${resumeLearning.courseTitle} progress: ${progress}%`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/courses/${courseSlug}/learn`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 hover-lift btn-press transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
            >
              <Play size={13} className="fill-white" />
              <span>Resume</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Has Enrollments, but All Completed or Ready to Pick Next
  if (hasEnrollments) {
    return (
      <div className="bg-surface border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Sparkles size={11} />
            <span>Ready for your next milestone</span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-primary">
            Start your next course
          </h3>
          <p className="text-xs text-secondary leading-relaxed max-w-xl">
            You are up to date on your active modules. Explore other enrolled tracks or dive into a new subject in the course catalog.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('learning')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-semibold text-primary hover:bg-border-subtle transition-all cursor-pointer"
          >
            <BookOpen size={13} />
            <span>My Learning</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('explore')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-xs shadow-cobalt/20 transition-all cursor-pointer"
          >
            <span>Explore Courses</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Zero Enrollments - Call to Action
  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cobalt-soft text-cobalt border border-cobalt-border">
          <Compass size={11} />
          <span>Curriculum Ready</span>
        </div>
        <h3 className="text-sm sm:text-base font-bold text-primary">
          Start your first course
        </h3>
        <p className="text-xs text-secondary leading-relaxed max-w-xl">
          Browse our curated catalog to begin your learning journey. Choose from industry-verified tracks in development, cloud architecture, and data engineering.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setActiveTab && setActiveTab('explore')}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 hover-lift btn-press transition-all cursor-pointer shrink-0"
      >
        <Compass size={14} />
        <span>Explore Catalog</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}

