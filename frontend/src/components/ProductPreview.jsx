import React from 'react';
import { PlayCircle, Clock, Calendar, Award, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export default function ProductPreview() {
  return (
    <div className="w-full relative" aria-label="LearnSpace Horizontal Product Showcase">
      {/* Subtle architectural ambient glow behind showcase */}
      <div className="absolute -inset-2 bg-gradient-to-b from-[#E9EFF2]/50 via-transparent to-[#EDF0E9]/50 rounded-3xl blur-xl -z-10 pointer-events-none" />

      {/* Main Integrated Showcase Canvas */}
      <div className="bg-white rounded-2xl border border-[#E4E4E1] shadow-card overflow-hidden">
        
        {/* Top Workspace Context Header */}
        <div className="bg-[#F8F8F6] border-b border-[#E4E4E1] px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Active Course Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              DS
            </div>
            <div>
              <div className="text-xs font-bold text-[#171717] leading-tight">
                Design Systems from Figma to Production Code
              </div>
              <div className="text-[11px] text-[#686868]">
                Module 3 of 4: Component Architecture & Token Sync
              </div>
            </div>
          </div>

          {/* Active Learner & Session Status */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="w-6 h-6 rounded-full bg-[#E9EFF2] text-[#4A6376] flex items-center justify-center font-bold text-[10px]">
                AR
              </span>
              <span className="text-[#686868] text-[11px]">Alex Rivera (Student Track)</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF0E9] border border-[#A8B5A0]/40 text-[11px] font-semibold text-[#5F7158]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8E9F86] animate-pulse" aria-hidden="true" />
              <span>Live Progress Synced</span>
            </div>
          </div>
        </div>

        {/* Horizontal 3-Column Product Showcase Body */}
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-stretch">
            
            {/* Column 1: Overall Progress & Competency Gauge (4 cols) */}
            <div className="md:col-span-4 rounded-xl border border-[#E4E4E1] bg-[#F8F8F6] p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#637D91]">
                    Track Velocity
                  </span>
                  <span className="text-xs font-bold text-[#4A6376] bg-[#E9EFF2] px-2 py-0.5 rounded-full">
                    70% Complete
                  </span>
                </div>

                <div className="text-base sm:text-lg font-extrabold text-[#171717]">
                  14 of 20 Lessons Finished
                </div>
                <p className="text-xs text-[#686868] mt-1 leading-normal">
                  Paced for graduation in 3 weeks with verified repository commits.
                </p>
              </div>

              {/* Progress Bar */}
              <div>
                <div
                  className="w-full h-2 bg-[#E4E4E1] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={70}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Course completion progress"
                >
                  <div
                    className="h-full bg-[#637D91] rounded-full transition-all duration-500"
                    style={{ width: '70%' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#8A8A86] mt-1.5">
                  <span>Foundations: Done</span>
                  <span>Capstones: In Progress</span>
                </div>
              </div>
            </div>

            {/* Column 2: Next Interactive Lesson (4 cols) */}
            <div className="md:col-span-4 rounded-xl border border-[#E4E4E1] bg-white p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#D5D5D0] transition-colors">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#637D91] mb-2">
                  <PlayCircle size={13} className="text-[#637D91]" />
                  <span>Next Active Lesson</span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-[#171717] leading-snug">
                  Token Hierarchies & Semantic Sync
                </h4>

                <div className="flex items-center gap-2 mt-2 text-xs text-[#686868]">
                  <span className="inline-flex items-center gap-1 bg-[#F8F8F6] border border-[#E4E4E1] px-2 py-0.5 rounded-md text-[11px]">
                    <Clock size={11} className="text-[#8A8A86]" />
                    18 min lab
                  </span>
                  <span className="text-[11px]">Hands-on Sandbox</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4E4E1]/80 flex items-center justify-between">
                <span className="text-xs text-[#686868]">Interactive Exercise</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#171717] hover:underline cursor-pointer">
                  <span>Resume Lesson</span>
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* Column 3: Upcoming Checkpoint & Rubric Status (4 cols) */}
            <div className="md:col-span-4 rounded-xl border border-[#E4E4E1] bg-white p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#D5D5D0] transition-colors">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5F7158] mb-2">
                  <Calendar size={13} className="text-[#5F7158]" />
                  <span>Upcoming Due Date</span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-[#171717] leading-snug">
                  Assignment 03: Accessible Token Set
                </h4>

                <div className="flex items-center gap-2 mt-2 text-xs text-[#686868]">
                  <span className="text-[11px]">Due Thursday • 11:59 PM</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4E4E1]/80 flex items-center justify-between">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5F7158]">
                  <CheckCircle2 size={13} />
                  <span>2 of 3 tasks verified</span>
                </div>
                <span className="text-[11px] font-semibold text-[#637D91] bg-[#E9EFF2] px-2 py-0.5 rounded-md">
                  Rubric Ready
                </span>
              </div>
            </div>

          </div>

          {/* Bottom Milestone Ribbon */}
          <div className="mt-5 pt-4 border-t border-[#E4E4E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#5F7158] text-white flex items-center justify-center shrink-0">
                <Award size={12} />
              </div>
              <div className="text-[#171717]">
                <span className="font-semibold">Recent Milestone: </span>
                <span className="text-[#5F7158]">Foundational Color & Spacing Tokens Mastered</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#8A8A86]">
              <Sparkles size={12} className="text-[#637D91]" />
              <span>Real-time mentor checkpoints & code repository synchronization</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
