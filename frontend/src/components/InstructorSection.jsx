import React from 'react';
import {
  ArrowRight,
  Presentation,
  Code2,
  ClipboardCheck,
  TrendingUp,
  Megaphone,
  Sparkles
} from 'lucide-react';
import IconChip from './ui/IconChip';
import Reveal from './ui/Reveal';

const CAPABILITIES = [
  {
    step: '01',
    icon: Presentation,
    title: 'Organize Content',
    desc: 'Modular chapters, video lessons, and downloadable syllabus assets.'
  },
  {
    step: '02',
    icon: Code2,
    title: 'Design Exercises',
    desc: 'Project-based assignments, coding sandboxes, and automated quizzes.'
  },
  {
    step: '03',
    icon: ClipboardCheck,
    title: 'Review Submissions',
    desc: 'Standardized rubric evaluation with inline feedback commentary.'
  },
  {
    step: '04',
    icon: TrendingUp,
    title: 'Track Velocity',
    desc: 'Real-time cohort pacing, milestone risk alerts, and completion rates.'
  },
  {
    step: '05',
    icon: Megaphone,
    title: 'Broadcast Updates',
    desc: 'Direct announcements, scheduled office hours, and deadline adjustments.'
  }
];

export default function InstructorSection({ onInstructorInquiry }) {
  return (
    <section
      id="instructors"
      className="py-16 sm:py-20 lg:py-24 border-t border-border-subtle bg-surface-subtle relative scroll-mt-20"
      aria-label="For Instructors"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        
        {/* ========================================================= */}
        {/* TOP EDITORIAL AREA: Header & Positioning                  */}
        {/* ========================================================= */}
        <Reveal triggerOnMount delayMs={0}>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-10 border-b border-border-subtle">
            <div className="max-w-2xl">
              {/* Eyebrow Label */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cobalt-soft border border-cobalt-border text-xs font-bold uppercase tracking-wider text-cobalt mb-4 shadow-2xs">
                <Sparkles size={12} strokeWidth={1.75} className="text-cobalt animate-sparkle" />
                <span>For Educators & Practitioners</span>
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-primary leading-tight">
                Bring your teaching into focus.
              </h2>

              {/* Supporting Statement */}
              <p className="text-base sm:text-lg text-secondary mt-3 leading-relaxed">
                Create courses, organize learning materials, review assignments, and help learners understand their progress without administrative friction.
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="shrink-0">
              <button
                type="button"
                className="group inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed hover-lift btn-press shadow-sm shadow-cobalt/20 transition-all cursor-pointer"
                onClick={onInstructorInquiry}
              >
                <span>Learn About Teaching</span>
                <ArrowRight size={15} strokeWidth={1.75} className="group-hover-nudge-x" aria-hidden="true" />
              </button>
            </div>
          </div>
        </Reveal>

        {/* ========================================================= */}
        {/* MIDDLE AREA: Horizontal 5-Pillar Capability Sequence      */}
        {/* ========================================================= */}
        <div className="my-10 lg:my-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {CAPABILITIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Reveal key={idx} delayMs={idx * 60}>
                  <div
                    className="group rounded-xl border border-border-subtle bg-surface p-4.5 flex flex-col justify-between gap-3 shadow-2xs hover:border-border-medium hover-lift transition-all h-full"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-tertiary">
                        {item.step}
                      </span>
                      <IconChip icon={Icon} tone="accent" size="sm" animate />
                    </div>

                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-primary leading-tight mb-1">
                        {item.title}
                      </h3>
                      <p className="text-[12px] text-secondary leading-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION ENDING: Clear CTA Transition                      */}
        {/* ========================================================= */}
        <Reveal delayMs={160}>
          <div className="mt-10 sm:mt-12 text-center">
            <p className="text-xs sm:text-sm text-secondary mb-3">
              Want to build and mentor cohorts on LearnSpace?
            </p>
            <button
              type="button"
              onClick={onInstructorInquiry}
              className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline cursor-pointer"
            >
              <span>Apply to become a verified instructor</span>
              <ArrowRight size={13} strokeWidth={1.75} className="group-hover-nudge-x" />
            </button>
          </div>
        </Reveal>

      </div>
    </section>
  );
}

