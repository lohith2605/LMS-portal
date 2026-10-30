import React, { useEffect } from 'react';
import { X, Clock, BookOpen, Award, ArrowRight } from 'lucide-react';

export default function CourseModal({ course, onClose, onEnrollInterest }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!course) return null;

  return (
    <div
      className="fixed inset-0 bg-primary/45 backdrop-blur-xs flex items-center justify-center p-4 z-[1000] animate-[modalFadeIn_200ms_ease-out]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl md:rounded-3xl border border-border-subtle shadow-preview w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative animate-[modalSlideUp_240ms_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-modal-title"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex gap-2 items-center mb-1.5">
              <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent-blue-pale text-accent-blue-dark">{course.category}</span>
              <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-surface-subtle text-secondary border border-border-subtle">{course.level}</span>
            </div>
            <h2 id="course-modal-title" className="text-xl font-bold text-primary leading-snug">
              {course.title}
            </h2>
          </div>
          <button
            type="button"
            className="w-9 h-9 p-0 rounded-xl inline-flex items-center justify-center border border-border-subtle bg-surface-subtle text-secondary hover:text-primary transition-all cursor-pointer"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Duration & Metadata line */}
        <div className="flex flex-wrap gap-4 text-xs text-secondary pb-4 border-b border-border-subtle mb-4">
          <span className="inline-flex items-center gap-1">
            <Clock size={13} aria-hidden="true" />
            {course.duration || course.estimatedDuration || '6 weeks'}
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen size={13} aria-hidden="true" />
            {course.lessonsCount ?? course.totalLessons ?? 0} structured lessons
          </span>
          <span className="inline-flex items-center gap-1">
            <Award size={13} aria-hidden="true" />
            Certificate upon completion
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-secondary leading-relaxed mb-5">
          {course.description}
        </p>

        {/* Syllabus Section */}
        {((course.syllabus && course.syllabus.length > 0) || (course.sections && course.sections.length > 0)) && (
          <div className="mb-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-2.5">
              Curriculum Structure
            </h4>
            <div className="flex flex-col gap-2">
              {(course.syllabus || course.sections.map((s) => s.title)).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 sm:px-3 bg-surface-subtle rounded-lg border border-border-subtle text-xs"
                >
                  <span className="font-bold text-accent-blue-dark min-w-[60px]">
                    Part 0{idx + 1}
                  </span>
                  <span className="text-primary font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learning Outcome & Prerequisites */}
        {(course.outcomes || (course.learningObjectives && course.learningObjectives.length > 0)) && (
          <div className="grid grid-cols-1 gap-3 mb-6">
            <div className="p-3 bg-accent-sage-pale rounded-lg border border-[#A8B5A0]/40">
              <div className="text-[11px] font-bold uppercase text-accent-sage-dark mb-1">
                Core Outcome
              </div>
              <div className="text-xs text-primary font-medium">
                {course.outcomes || course.learningObjectives.join(' • ')}
              </div>
            </div>
          </div>
        )}

        {/* Instructor */}
        <div className="flex items-center gap-3 p-3 bg-surface-subtle rounded-xl border border-border-subtle mb-6">
          <div className="w-9 h-9 rounded-full bg-cobalt text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-cobalt/20">
            {course.instructor?.initials || course.instructor?.name?.slice(0, 2).toUpperCase() || 'LS'}
          </div>
          <div>
            <div className="text-sm font-bold text-primary">
              {course.instructor?.name || 'Instructor'}
            </div>
            <div className="text-[11px] text-secondary">
              {course.instructor?.role || 'Educator'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold rounded-xl bg-surface text-primary border border-border-subtle hover:bg-surface-subtle hover:border-border-medium transition-all cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 hover:shadow-card transition-all cursor-pointer"
            onClick={() => {
              onClose();
              onEnrollInterest(course);
            }}
          >
            <span>Express Interest</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
