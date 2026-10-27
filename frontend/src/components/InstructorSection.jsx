import React from 'react';
import {
  ArrowRight,
  BookOpen,
  FileCode,
  FileCheck,
  TrendingUp,
  Bell,
  Users,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const CAPABILITIES = [
  {
    step: '01',
    icon: BookOpen,
    title: 'Organize Content',
    desc: 'Modular chapters, video lessons, and downloadable syllabus assets.'
  },
  {
    step: '02',
    icon: FileCode,
    title: 'Design Exercises',
    desc: 'Project-based assignments, coding sandboxes, and automated quizzes.'
  },
  {
    step: '03',
    icon: FileCheck,
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
    icon: Bell,
    title: 'Broadcast Updates',
    desc: 'Direct announcements, scheduled office hours, and deadline adjustments.'
  }
];

export default function InstructorSection({ onInstructorInquiry }) {
  return (
    <section
      id="instructors"
      className="py-16 sm:py-20 lg:py-24 border-t border-[#E4E4E1] bg-[#F8F8F6] relative"
      aria-label="For Instructors"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        
        {/* ========================================================= */}
        {/* TOP EDITORIAL AREA: Header & Positioning                  */}
        {/* ========================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-10 border-b border-[#E4E4E1]">
          <div className="max-w-2xl">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF0E9] border border-[#A8B5A0]/40 text-xs font-bold uppercase tracking-wider text-[#5F7158] mb-4">
              <Sparkles size={12} className="text-[#5F7158]" />
              <span>For Educators & Practitioners</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-[#171717] leading-tight">
              Bring your teaching into focus.
            </h2>

            {/* Supporting Statement */}
            <p className="text-base sm:text-lg text-[#686868] mt-3 leading-relaxed">
              Create courses, organize learning materials, review assignments, and help learners understand their progress without administrative friction.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="shrink-0">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-[#171717] text-white hover:bg-[#2b2b2b] hover:-translate-y-0.5 shadow-xs transition-all cursor-pointer"
              onClick={onInstructorInquiry}
            >
              <span>Learn About Teaching</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MIDDLE AREA: Horizontal 5-Pillar Capability Sequence      */}
        {/* ========================================================= */}
        <div className="my-10 lg:my-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {CAPABILITIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E4E4E1] bg-white p-4.5 flex flex-col justify-between gap-3 shadow-2xs hover:border-[#D5D5D0] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[#8A8A86]">
                      {item.step}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#E9EFF2] text-[#4A6376] flex items-center justify-center">
                      <Icon size={16} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#171717] leading-tight mb-1">
                      {item.title}
                    </h3>
                    <p className="text-[12px] text-[#686868] leading-normal">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PRODUCT SHOWCASE: Wide Integrated Instructor Workspace    */}
        {/* ========================================================= */}
        <div
          className="bg-white rounded-2xl border border-[#E4E4E1] shadow-card overflow-hidden"
          aria-label="Instructor Dashboard Preview"
        >
          {/* Top Console Bar */}
          <div className="bg-[#F8F8F6] border-b border-[#E4E4E1] px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                ED
              </div>
              <div>
                <div className="text-xs font-bold text-[#171717]">
                  Distributed Systems & Microservices • Cohort 04
                </div>
                <div className="text-[11px] text-[#686868]">
                  Spring 2026 Academic Term • 12 Modules
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-[11px] font-semibold text-[#5F7158] bg-[#EDF0E9] border border-[#A8B5A0]/40 px-2.5 py-0.5 rounded-full">
                Active Cohort • 38 Students
              </span>
            </div>
          </div>

          {/* Console Multi-Panel Grid */}
          <div className="p-5 sm:p-6 lg:p-7">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
              
              {/* Panel 1: Cohort Velocity & Vitals (4 cols) */}
              <div className="lg:col-span-4 rounded-xl border border-[#E4E4E1] bg-[#F8F8F6] p-4.5 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#637D91]">
                    Cohort Overview
                  </span>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#E4E4E1]">
                    <div>
                      <div className="flex items-center gap-1 text-[#637D91]">
                        <Users size={12} />
                        <span className="text-base font-bold text-[#171717]">38</span>
                      </div>
                      <span className="text-[10px] text-[#686868]">Enrolled</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <FileCheck size={12} />
                        <span className="text-base font-bold text-[#171717]">4</span>
                      </div>
                      <span className="text-[10px] text-[#686868]">Pending</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[#5F7158]">
                        <Clock size={12} />
                        <span className="text-base font-bold text-[#171717]">91%</span>
                      </div>
                      <span className="text-[10px] text-[#686868]">Velocity</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E4E4E1]/80">
                  <div className="flex justify-between text-xs text-[#686868] mb-1">
                    <span>Curriculum Pace</span>
                    <span className="font-semibold text-[#171717]">Ahead of Schedule</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E4E4E1] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5F7158] rounded-full" style={{ width: '91%' }} />
                  </div>
                </div>
              </div>

              {/* Panel 2: Live Submission Queue (5 cols) */}
              <div className="lg:col-span-5 rounded-xl border border-[#E4E4E1] bg-white p-4.5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E1]">
                  <span className="text-xs font-bold text-[#171717]">
                    Live Review Queue
                  </span>
                  <span className="text-[10px] font-semibold text-[#4A6376] bg-[#E9EFF2] px-2 py-0.5 rounded-md">
                    Assignment 02 • Rubric Ready
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8F8F6] border border-[#E4E4E1] text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#171717] text-white flex items-center justify-center font-bold text-[10px]">
                        SJ
                      </div>
                      <div>
                        <div className="font-bold text-[#171717]">Sarah Jenkins</div>
                        <div className="text-[10px] text-[#686868]">Event Queue Architecture • 2h ago</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onInstructorInquiry}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#171717] text-white hover:bg-[#2b2b2b] transition-all cursor-pointer"
                    >
                      Review
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8F8F6] border border-[#E4E4E1] text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#637D91] text-white flex items-center justify-center font-bold text-[10px]">
                        MV
                      </div>
                      <div>
                        <div className="font-bold text-[#171717]">Marcus Vance</div>
                        <div className="text-[10px] text-[#686868]">Service Mesh Topology • 4h ago</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#8A8A86] font-medium">Queued</span>
                  </div>
                </div>
              </div>

              {/* Panel 3: Broadcast & Office Hours (3 cols) */}
              <div className="lg:col-span-3 rounded-xl border border-[#E4E4E1] bg-white p-4.5 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5F7158] mb-2">
                    <Bell size={12} className="text-[#5F7158]" />
                    <span>Recent Broadcast</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#171717] leading-snug">
                    Live Office Hours Update
                  </h4>
                  <p className="text-[11px] text-[#686868] mt-1 leading-normal">
                    Scheduled for Thursday at 4:00 PM EST. Architecture Q&A on microservices.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E4E4E1] flex items-center justify-between text-[11px]">
                  <span className="text-[#5F7158] font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Broadcast Active
                  </span>
                </div>
              </div>

            </div>

            {/* Console Footnote */}
            <div className="mt-5 pt-3.5 border-t border-[#E4E4E1] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#8A8A86]">
              <span>Illustrative educator workspace • Real-time cohort governance & rubric evaluation</span>
              <span>LearnSpace Instructor Suite</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION ENDING: Clear CTA Transition                      */}
        {/* ========================================================= */}
        <div className="mt-10 sm:mt-12 text-center">
          <p className="text-xs sm:text-sm text-[#686868] mb-3">
            Want to build and mentor cohorts on LearnSpace?
          </p>
          <button
            type="button"
            onClick={onInstructorInquiry}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#171717] hover:underline cursor-pointer"
          >
            <span>Apply to become a verified instructor</span>
            <ArrowRight size={13} />
          </button>
        </div>

      </div>
    </section>
  );
}
