import React from 'react';
import {
  ArrowRight,
  Presentation,
  Code2,
  ClipboardCheck,
  TrendingUp,
  Megaphone,
  Users,
  Clock,
  CheckCircle2,
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
      className="py-16 sm:py-20 lg:py-24 border-t border-border-subtle bg-surface-subtle relative"
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-sage-pale border border-accent-sage-soft/40 text-xs font-bold uppercase tracking-wider text-accent-sage-dark mb-4 shadow-2xs">
                <Sparkles size={12} strokeWidth={1.75} className="text-accent-sage-dark animate-sparkle" />
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
                className="group inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-neutral-800 hover-lift btn-press shadow-xs transition-all cursor-pointer"
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
        {/* PRODUCT SHOWCASE: Wide Integrated Instructor Workspace    */}
        {/* ========================================================= */}
        <Reveal delayMs={120}>
          <div
            className="bg-surface rounded-2xl border border-border-subtle shadow-card overflow-hidden hover-lift transition-all"
            aria-label="Instructor Dashboard Preview"
          >
            {/* Top Console Bar */}
            <div className="bg-surface-subtle border-b border-border-subtle px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  ED
                </div>
                <div>
                  <div className="text-xs font-bold text-primary">
                    Distributed Systems & Microservices • Cohort 04
                  </div>
                  <div className="text-[11px] text-secondary">
                    Spring 2026 Academic Term • 12 Modules
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-[11px] font-semibold text-accent-sage-dark bg-accent-sage-pale border border-accent-sage-soft/40 px-2.5 py-0.5 rounded-full shadow-2xs">
                  Active Cohort • 38 Students
                </span>
              </div>
            </div>

            {/* Console Multi-Panel Grid */}
            <div className="p-5 sm:p-6 lg:p-7">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
                
                {/* Panel 1: Cohort Velocity & Vitals (4 cols) */}
                <div className="group lg:col-span-4 rounded-xl border border-border-subtle bg-surface-subtle p-4.5 flex flex-col justify-between gap-4 hover-lift transition-all">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent-blue">
                      Cohort Overview
                    </span>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border-subtle">
                      <div>
                        <div className="flex items-center gap-1.5 text-accent-blue">
                          <Users size={13} strokeWidth={1.75} aria-hidden="true" />
                          <span className="text-base font-bold text-primary">38</span>
                        </div>
                        <span className="text-[10px] text-secondary">Enrolled</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <ClipboardCheck size={13} strokeWidth={1.75} aria-hidden="true" />
                          <span className="text-base font-bold text-primary">4</span>
                        </div>
                        <span className="text-[10px] text-secondary">Pending</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-accent-sage-dark">
                          <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                          <span className="text-base font-bold text-primary">91%</span>
                        </div>
                        <span className="text-[10px] text-secondary">Velocity</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-subtle">
                    <div className="flex justify-between text-xs text-secondary mb-1.5">
                      <span>Curriculum Pace</span>
                      <span className="font-semibold text-primary">Ahead of Schedule</span>
                    </div>
                    <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-accent-sage-dark rounded-full transition-all duration-700" style={{ width: '91%' }} />
                    </div>
                  </div>
                </div>

                {/* Panel 2: Live Submission Queue (5 cols) */}
                <div className="group lg:col-span-5 rounded-xl border border-border-subtle bg-surface p-4.5 flex flex-col justify-between gap-3 hover-lift transition-all">
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                    <span className="text-xs font-bold text-primary">
                      Live Review Queue
                    </span>
                    <span className="text-[10px] font-semibold text-accent-blue-dark bg-accent-blue-pale px-2 py-0.5 rounded-md">
                      Assignment 02 • Rubric Ready
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-border-subtle text-xs hover:border-border-medium transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center font-bold text-[10px]">
                          SJ
                        </div>
                        <div>
                          <div className="font-bold text-primary">Sarah Jenkins</div>
                          <div className="text-[10px] text-secondary">Event Queue Architecture • 2h ago</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onInstructorInquiry}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-primary text-white hover:bg-neutral-800 hover-lift btn-press transition-all cursor-pointer"
                      >
                        Review
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-border-subtle text-xs hover:border-border-medium transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-accent-blue text-white flex items-center justify-center font-bold text-[10px]">
                          MV
                        </div>
                        <div>
                          <div className="font-bold text-primary">Marcus Vance</div>
                          <div className="text-[10px] text-secondary">Service Mesh Topology • 4h ago</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-tertiary font-medium">Queued</span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Broadcast & Office Hours (3 cols) */}
                <div className="group lg:col-span-3 rounded-xl border border-border-subtle bg-surface p-4.5 flex flex-col justify-between gap-3 hover-lift transition-all">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-sage-dark mb-2">
                      <Megaphone size={13} strokeWidth={1.75} className="text-accent-sage-dark" />
                      <span>Recent Broadcast</span>
                    </div>
                    <h4 className="text-xs font-bold text-primary leading-snug">
                      Live Office Hours Update
                    </h4>
                    <p className="text-[11px] text-secondary mt-1 leading-normal">
                      Scheduled for Thursday at 4:00 PM EST. Architecture Q&A on microservices.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px]">
                    <span className="text-accent-sage-dark font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={12} strokeWidth={1.75} /> Broadcast Active
                    </span>
                  </div>
                </div>

              </div>

              {/* Console Footnote */}
              <div className="mt-5 pt-3.5 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-tertiary">
                <span>Illustrative educator workspace • Real-time cohort governance & rubric evaluation</span>
                <span>LearnSpace Instructor Suite</span>
              </div>
            </div>
          </div>
        </Reveal>

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

