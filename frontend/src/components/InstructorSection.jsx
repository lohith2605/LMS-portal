import React from 'react';
import { CheckCircle2, ArrowRight, Bell, Users, Clock, FileCheck } from 'lucide-react';

const INSTRUCTOR_BENEFITS = [
  'Organize courses and learning materials into clear modular chapters.',
  'Create project-based assignments, code exercises, and quizzes.',
  'Review student submissions with standardized, rubric-driven scoring.',
  'Monitor cohort completion velocity, risk alerts, and lesson pace.',
  'Broadcast announcements, live office hours, and deadline adjustments.'
];

export default function InstructorSection({ onInstructorInquiry }) {
  return (
    <section id="instructors" className="pt-16 md:pt-20 pb-20 md:pb-24 bg-page relative" aria-label="For Instructors">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        <div className="bg-white border border-border-subtle rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-8 md:gap-12 items-center">
            {/* Left Content */}
            <div className="flex flex-col gap-5">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-sage-dark">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-sage-dark" aria-hidden="true" />
                <span>For Educators & Practitioners</span>
              </div>

              <h2 className="text-[clamp(1.85rem,3vw,2.5rem)] font-bold tracking-tight text-primary leading-tight">Bring your teaching into focus.</h2>

              <p className="text-base text-secondary leading-relaxed">
                Create courses, organize learning materials, review assignments, and help learners understand their progress without administrative friction.
              </p>

              <div className="flex flex-col gap-3 mt-2">
                {INSTRUCTOR_BENEFITS.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm text-primary font-medium">
                    <CheckCircle2 size={16} className="text-accent-sage-dark mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-[#2a2a2a] hover:-translate-y-0.5 shadow-sm hover:shadow-card transition-all cursor-pointer"
                  onClick={onInstructorInquiry}
                >
                  <span>Learn About Teaching</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Right Product Preview: Believable Instructor Dashboard */}
            <div className="bg-surface-subtle border border-border-medium rounded-2xl p-5 sm:p-6 shadow-elevated flex flex-col gap-4 sm:gap-5" aria-label="Instructor Dashboard Preview">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <div className="text-xs font-bold text-primary">Instructor Console • Cohort View</div>
                  <div className="text-[11px] text-secondary">
                    Course: Distributed Systems & APIs
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-accent-sage-dark bg-accent-sage-pale px-2 py-0.5 rounded-full">Active Cohort</span>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-border-subtle rounded-xl p-3 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-accent-blue-dark">
                    <Users size={13} aria-hidden="true" />
                    <span className="text-lg font-bold text-primary leading-tight">38</span>
                  </div>
                  <span className="text-[11px] text-secondary">Enrolled Learners</span>
                </div>

                <div className="bg-white border border-border-subtle rounded-xl p-3 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-accent-sage-dark">
                    <FileCheck size={13} aria-hidden="true" />
                    <span className="text-lg font-bold text-primary leading-tight">4</span>
                  </div>
                  <span className="text-[11px] text-secondary">Pending Reviews</span>
                </div>

                <div className="bg-white border border-border-subtle rounded-xl p-3 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-accent-blue-dark">
                    <Clock size={13} aria-hidden="true" />
                    <span className="text-lg font-bold text-primary leading-tight">91%</span>
                  </div>
                  <span className="text-[11px] text-secondary">On-Track Velocity</span>
                </div>
              </div>

              {/* Pending Review Item */}
              <div className="bg-white border border-border-subtle rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">Submission Queue</span>
                  <span className="text-[11px] font-semibold text-accent-blue-dark bg-accent-blue-pale px-2 py-0.5 rounded-full">Assignment 02</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-[11px] font-bold">SJ</div>
                    <div>
                      <div className="text-xs font-semibold text-primary">Sarah Jenkins</div>
                      <div className="text-[11px] text-secondary">Event Queue Architecture • Submitted 2h ago</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full sm:w-auto text-center text-[11px] font-semibold px-3 py-1.25 rounded-lg bg-primary text-white hover:bg-[#333333] transition-all cursor-pointer"
                    onClick={onInstructorInquiry}
                  >
                    Review Rubric
                  </button>
                </div>
              </div>

              {/* Announcement Dispatcher */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white border border-border-subtle rounded-xl text-xs text-secondary">
                <Bell size={16} className="text-accent-blue shrink-0" aria-hidden="true" />
                <div className="flex-grow">
                  <span className="font-semibold text-primary">Latest Broadcast: </span>
                  <span>Office hours moved to 4:00 PM EST this Thursday.</span>
                </div>
              </div>

              <div className="text-[11px] text-tertiary text-right">
                Illustrative instructor portal preview
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
