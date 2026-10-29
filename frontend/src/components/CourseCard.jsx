import React from 'react';
import { Clock, ArrowRight, Layers, Sparkles, BarChart3, Compass, Star } from 'lucide-react';

export default function CourseCard({ course, onSelectCourse }) {
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Development':
        return <Layers size={20} aria-hidden="true" />;
      case 'Design':
        return <Sparkles size={20} aria-hidden="true" />;
      case 'Data':
        return <BarChart3 size={20} aria-hidden="true" />;
      case 'Business':
        return <Compass size={20} aria-hidden="true" />;
      default:
        return <Layers size={20} aria-hidden="true" />;
    }
  };

  const instructorName = course.instructor?.name || 'LearnSpace Educator';
  const instructorInitials =
    course.instructor?.initials ||
    (instructorName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'LS');
  const instructorRole = course.instructor?.role || 'Course Instructor';

  const duration = course.duration || course.estimatedDuration || '6 weeks';
  const lessonsCount = course.lessonsCount ?? course.totalLessons ?? 0;
  const descriptionText = course.summary || course.description || '';
  const totalReviews = course.totalReviews || 0;
  const averageRating = course.averageRating || 0;

  return (
    <article
      className="bg-surface border border-border-subtle rounded-2xl overflow-hidden flex flex-col transition-all duration-200 shadow-card hover:border-border-medium hover:-translate-y-0.5 hover:shadow-elevated"
      aria-label={course.title}
    >
      {/* Visual Thumbnail Header */}
      <div className="h-[150px] w-full relative overflow-hidden bg-surface-subtle border-b border-border-subtle">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-between p-4 ${
              course.category === 'Design'
                ? 'bg-gradient-to-br from-[#EDF0E9] to-[#Dfe5da] dark:from-[#1F242A] dark:to-[#15181C]'
                : 'bg-gradient-to-br from-[#E9EFF2] to-[#D8E3E8] dark:from-[#1F242A] dark:to-[#15181C]'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-surface/85 text-primary backdrop-blur-xs shadow-xs">
              {course.highlightTag || course.category}
            </span>
            <div className="w-11 h-11 rounded-xl bg-surface/85 flex items-center justify-center text-primary shadow-xs">
              {getCategoryIcon(course.category)}
            </div>
          </div>
        )}

        {course.thumbnail && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface/90 text-primary backdrop-blur-xs">
              {course.category}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
              {course.level}
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex flex-col flex-grow gap-3">
        {!course.thumbnail && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-accent-blue-dark">
              {course.category}
            </span>
            <span className="text-[11px] font-medium text-secondary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle">
              {course.level}
            </span>
          </div>
        )}

        <h3 className="text-base font-bold text-primary leading-snug line-clamp-2">
          {course.title}
        </h3>

        <p className="text-xs text-secondary leading-relaxed line-clamp-2 flex-grow">
          {descriptionText}
        </p>

        {/* Instructor row */}
        <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
          <div
            className="w-6.5 h-6.5 rounded-full bg-surface-subtle border border-border-subtle text-[11px] font-bold text-primary flex items-center justify-center"
            aria-hidden="true"
          >
            {instructorInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-primary leading-tight truncate">
              {instructorName}
            </span>
            <span className="text-[11px] text-tertiary leading-tight truncate">
              {instructorRole}
            </span>
          </div>
        </div>

        {/* Bottom actions & metadata */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] text-secondary flex items-center gap-1">
              <Clock size={12} aria-hidden="true" />
              <span>
                {duration} • {lessonsCount} lessons
              </span>
            </div>
            {totalReviews > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                <span>{averageRating.toFixed(1)}</span>
                <span className="text-secondary font-normal">({totalReviews})</span>
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className="text-xs font-semibold text-primary inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-subtle border border-border-subtle hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
            onClick={() => onSelectCourse(course)}
            aria-label={`View course ${course.title}`}
          >
            <span>View Track</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
