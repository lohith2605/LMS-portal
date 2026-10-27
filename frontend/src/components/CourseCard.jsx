import React from 'react';
import { Clock, ArrowRight, Layers, Sparkles, BarChart3, Compass } from 'lucide-react';

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

  return (
    <article className="bg-white border border-border-subtle rounded-2xl overflow-hidden flex flex-col transition-all duration-200 shadow-card hover:border-border-medium hover:-translate-y-0.5 hover:shadow-elevated" aria-label={course.title}>
      {/* Visual Thumbnail Header */}
      <div
        className={`h-[140px] w-full relative flex items-center justify-between p-4 overflow-hidden border-b ${
          course.accent === 'sage'
            ? 'bg-gradient-to-br from-[#EDF0E9] to-[#Dfe5da] border-[#A8B5A0]/40'
            : 'bg-gradient-to-br from-[#E9EFF2] to-[#D8E3E8] border-[#637D91]/30'
        }`}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/85 text-primary backdrop-blur-xs shadow-xs">
          {course.highlightTag}
        </span>
        <div className="w-11 h-11 rounded-xl bg-white/85 flex items-center justify-center text-primary shadow-xs">
          {getCategoryIcon(course.category)}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex flex-col flex-grow gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-accent-blue-dark">{course.category}</span>
          <span className="text-[11px] font-medium text-secondary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle">{course.level}</span>
        </div>

        <h3 className="text-base font-bold text-primary leading-snug">{course.title}</h3>

        <p className="text-xs text-secondary leading-relaxed flex-grow">{course.description}</p>

        {/* Instructor row */}
        <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
          <div className="w-6.5 h-6.5 rounded-full bg-surface-subtle border border-border-subtle text-[11px] font-bold text-primary flex items-center justify-center" aria-hidden="true">
            {course.instructor.initials}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-primary leading-tight">{course.instructor.name}</span>
            <span className="text-[11px] text-tertiary leading-tight">{course.instructor.role}</span>
          </div>
        </div>

        {/* Bottom actions & metadata */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-secondary flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            <span>{course.duration} • {course.lessonsCount} lessons</span>
          </div>

          <button
            type="button"
            className="text-xs font-semibold text-primary inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-subtle border border-border-subtle hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
            onClick={() => onSelectCourse(course)}
            aria-label={`Preview syllabus for ${course.title}`}
          >
            <span>Preview</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
