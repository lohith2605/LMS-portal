import React from 'react';
import { PlayCircle, Clock, Calendar, Award, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ProductPreview() {
  return (
    <div className="w-full relative" aria-label="LMS Product Interface Preview">
      <div className="bg-white rounded-2xl md:rounded-3xl border border-border-medium shadow-preview hover:shadow-[0_28px_56px_-12px_rgba(23,23,23,0.12),0_3px_8px_rgba(23,23,23,0.04)] overflow-hidden transition-all duration-200">
        {/* Window Chrome */}
        <div className="bg-surface-subtle border-b border-border-subtle px-4 sm:px-4.5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D6D6D1]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#D6D6D1]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#D6D6D1]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-secondary tracking-tight">
            <span>LearnSpace Studio</span>
            <span className="text-tertiary">/</span>
            <span>Learner Portal</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-sage-dark bg-accent-sage-pale px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-sage" aria-hidden="true" />
            <span>Active Session</span>
          </div>
        </div>

        {/* Window Content */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 bg-white">
          {/* User Status Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-9.5 h-9.5 rounded-full bg-gradient-to-br from-accent-blue-pale to-accent-sage-pale text-primary flex items-center justify-center font-bold text-sm border border-border-subtle" aria-label="Alex Rivera profile">AR</div>
              <div>
                <div className="text-sm font-bold text-primary leading-tight">Alex Rivera</div>
                <div className="text-xs text-secondary">Student Track • Design Systems</div>
              </div>
            </div>
            <div className="text-xs font-medium text-secondary bg-surface-subtle border border-border-subtle px-2.5 py-1 rounded-lg">
              Term: Spring 2026
            </div>
          </div>

          {/* Active Course Card with Progress */}
          <div className="bg-surface-subtle border border-border-subtle rounded-xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-accent-blue-dark mb-1">Current Enrolled Course</div>
                <h4 className="text-base font-bold text-primary leading-snug">Design Systems from Figma to Production Code</h4>
              </div>
              <span className="text-xs font-bold text-accent-blue-dark bg-accent-blue-pale px-2 py-0.75 rounded-full whitespace-nowrap">70% Complete</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-secondary">
                <span>Module 3 of 4: Component Architecture</span>
                <span>14 of 20 lessons</span>
              </div>
              <div
                className="w-full h-1.75 bg-[#E6E6E1] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={70}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Course completion progress"
              >
                <div className="h-full bg-accent-blue rounded-full transition-all duration-500" style={{ width: '70%' }} />
              </div>
            </div>
          </div>

          {/* Sub Grid: Next Activity & Upcoming Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Next Activity */}
            <div className="bg-white border border-border-subtle rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-secondary">
                <PlayCircle size={14} className="text-accent-blue" aria-hidden="true" />
                <span>Next Lesson</span>
              </div>
              <div className="text-sm font-semibold text-primary leading-snug">Token Hierarchies & Semantic Sync</div>
              <div className="text-xs text-secondary flex items-center gap-1.5">
                <Clock size={12} aria-hidden="true" />
                <span>18 min • Code exercise</span>
              </div>
              <div className="mt-auto pt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer">
                <span>Resume Lesson</span>
                <ArrowRight size={13} aria-hidden="true" />
              </div>
            </div>

            {/* Upcoming Assignment */}
            <div className="bg-white border border-border-subtle rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-secondary">
                <Calendar size={14} className="text-accent-sage-dark" aria-hidden="true" />
                <span>Upcoming Due Date</span>
              </div>
              <div className="text-sm font-semibold text-primary leading-snug">Assignment 03: Accessible Token Set</div>
              <div className="text-xs text-secondary flex items-center gap-1.5">
                <span>Due Thursday • 11:59 PM</span>
              </div>
              <div className="mt-auto pt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <span>2/3 Tasks Done</span>
                <CheckCircle2 size={13} className="text-accent-sage-dark" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Milestone Notification Bar */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 bg-accent-sage-pale border border-[#A8B5A0]/40 rounded-xl text-xs text-accent-sage-dark">
            <div className="w-6 h-6 rounded-full bg-accent-sage text-white flex items-center justify-center shrink-0" aria-hidden="true">
              <Award size={14} />
            </div>
            <div>
              <span className="font-semibold text-primary">Milestone Complete: </span>
              <span>Foundational Color Tokens Mastered</span>
            </div>
            <span className="hidden sm:inline text-accent-sage-dark ml-auto text-[11px]">Verified Skill Check</span>
          </div>

          {/* Illustrative Label */}
          <div className="flex items-center justify-between text-[11px] text-tertiary pt-0.5">
            <span>Sample learner interface</span>
            <span>Real-time lesson and submission tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
