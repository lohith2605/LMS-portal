import React from 'react';
import {
  TrendingUp,
  PlayCircle,
  Clock,
  CalendarClock,
  Medal,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Radio,
  ListChecks,
  Terminal,
} from 'lucide-react';
import IconChip from './ui/IconChip';
import AnimatedProgressBar from './ui/AnimatedProgressBar';

export default function ProductPreview() {
  return (
    <div className="w-full relative" aria-label="LearnSpace Horizontal Product Showcase">
      {/* Subtle architectural ambient glow behind showcase */}
      <div className="absolute -inset-2 bg-gradient-to-b from-accent-blue-pale/40 via-transparent to-accent-sage-pale/40 rounded-3xl blur-xl -z-10 pointer-events-none" />

      {/* Main Integrated Showcase Canvas */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-card overflow-hidden">
        
        {/* Top Workspace Context Header */}
        <div className="bg-surface-subtle border-b border-border-subtle px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Active Course Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              DS
            </div>
            <div>
              <div className="text-xs font-bold text-primary leading-tight">
                Design Systems from Figma to Production Code
              </div>
              <div className="text-[11px] text-secondary">
                Module 3 of 4: Component Architecture & Token Sync
              </div>
            </div>
          </div>

          {/* Active Learner & Session Status */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="w-6 h-6 rounded-full bg-accent-blue-pale text-accent-blue-dark flex items-center justify-center font-bold text-[10px]">
                AR
              </span>
              <span className="text-secondary text-[11px]">Alex Rivera (Student Track)</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-sage-pale border border-accent-sage-soft/40 text-[11px] font-semibold text-accent-sage-dark shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <Radio size={12} strokeWidth={1.75} aria-hidden="true" />
              <span>Live Progress Synced</span>
            </div>
          </div>
        </div>

        {/* Horizontal 3-Column Product Showcase Body */}
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-stretch">
            
            {/* Column 1: Overall Progress & Competency Gauge (4 cols) */}
            <div className="group md:col-span-4 rounded-xl border border-border-subtle bg-surface-subtle p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-border-medium hover-lift transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-blue">
                    <IconChip icon={TrendingUp} tone="accent" size="sm" animate />
                    <span>Track Velocity</span>
                  </div>
                  <span className="text-xs font-bold text-accent-blue-dark bg-accent-blue-pale px-2 py-0.5 rounded-full">
                    70% Complete
                  </span>
                </div>

                <div className="text-base sm:text-lg font-extrabold text-primary">
                  14 of 20 Lessons Finished
                </div>
                <p className="text-xs text-secondary mt-1 leading-normal">
                  Paced for graduation in 3 weeks with verified repository commits.
                </p>
              </div>

              {/* Progress Bar with Shimmer Animation */}
              <div>
                <AnimatedProgressBar
                  progress={70}
                  inProgress={true}
                  height="h-2"
                  colorClass="bg-accent"
                  ariaLabel="Course completion progress"
                />
                <div className="flex justify-between text-[11px] text-tertiary mt-2">
                  <span>Foundations: Done</span>
                  <span>Capstones: In Progress</span>
                </div>
              </div>
            </div>

            {/* Column 2: Next Interactive Lesson (4 cols) */}
            <div className="group md:col-span-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-border-medium hover-lift transition-all">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-accent-blue mb-2">
                  <IconChip icon={PlayCircle} tone="accent" size="sm" animate className="group-hover:scale-110" />
                  <span>Next Active Lesson</span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-primary leading-snug">
                  Token Hierarchies & Semantic Sync
                </h4>

                <div className="flex items-center gap-2 mt-2.5 text-xs text-secondary">
                  <span className="inline-flex items-center gap-1.5 bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded-md text-[11px]">
                    <Clock size={12} strokeWidth={1.75} className="text-tertiary" aria-hidden="true" />
                    18 min lab
                  </span>
                  <span className="inline-flex items-center gap-1 bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded-md text-[11px]">
                    <Terminal size={12} strokeWidth={1.75} className="text-tertiary" aria-hidden="true" />
                    Hands-on Sandbox
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs text-secondary">Interactive Exercise</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline cursor-pointer">
                  <span>Resume Lesson</span>
                  <ArrowRight size={13} strokeWidth={1.75} className="group-hover-nudge-x" aria-hidden="true" />
                </span>
              </div>
            </div>

            {/* Column 3: Upcoming Checkpoint & Rubric Status (4 cols) */}
            <div className="group md:col-span-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-border-medium hover-lift transition-all">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-accent-sage-dark mb-2">
                  <IconChip icon={CalendarClock} tone="success" size="sm" animate />
                  <span>Upcoming Due Date</span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-primary leading-snug">
                  Assignment 03: Accessible Token Set
                </h4>

                <div className="flex items-center gap-2 mt-2 text-xs text-secondary">
                  <span className="text-[11px]">Due Thursday • 11:59 PM</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-sage-dark">
                  <CheckCircle2 size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span>2 of 3 tasks verified</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-blue-dark bg-accent-blue-pale px-2 py-0.5 rounded-md">
                  <ListChecks size={12} strokeWidth={1.75} aria-hidden="true" />
                  <span>Rubric Ready</span>
                </span>
              </div>
            </div>

          </div>

          {/* Bottom Milestone Ribbon */}
          <div className="mt-5 pt-4 border-t border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <IconChip icon={Medal} tone="success" size="sm" animate />
              <div className="text-primary">
                <span className="font-semibold">Recent Milestone: </span>
                <span className="text-accent-sage-dark font-medium">Foundational Color & Spacing Tokens Mastered</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-tertiary">
              <Sparkles size={13} strokeWidth={1.75} className="text-accent-blue animate-sparkle" aria-hidden="true" />
              <span>Real-time mentor checkpoints & code repository synchronization</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

