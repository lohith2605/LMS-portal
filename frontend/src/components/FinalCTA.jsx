import React from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export default function FinalCTA({ onExploreCourses, onGetStarted }) {
  return (
    <section className="pt-14 md:pt-16 pb-16 md:pb-20 bg-page border-t border-border-subtle" aria-label="Final Call to Action">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        <div className="bg-surface-subtle border border-border-subtle rounded-2xl md:rounded-3xl py-10 md:py-16 px-5 sm:px-8 text-center flex flex-col items-center gap-5 shadow-sm relative overflow-hidden">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-blue-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" aria-hidden="true" />
            <span>Ready When You Are</span>
          </div>

          <h2 className="text-[clamp(2rem,3.8vw,3rem)] font-extrabold tracking-tight text-primary leading-[1.15] max-w-[680px]">
            Your next step starts here.
          </h2>

          <p className="text-base text-secondary leading-relaxed max-w-[520px]">
            Build a learning routine that helps you move forward, one lesson at a time. No distractions, no fluff.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-3 flex-wrap justify-center w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6.5 py-3 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-neutral-800 hover:-translate-y-0.5 shadow-sm hover:shadow-card transition-all cursor-pointer"
              onClick={onExploreCourses}
            >
              <span>Explore Courses</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>

            <button
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6.5 py-3 text-sm font-semibold rounded-xl bg-surface text-primary border border-border-subtle hover:bg-surface-subtle hover:border-border-medium hover:-translate-y-0.5 shadow-xs transition-all cursor-pointer"
              onClick={onGetStarted}
            >
              <span>Get Started</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="text-xs text-tertiary mt-2">
            Early cohort enrollment opens soon • Preview courses anytime
          </div>
        </div>
      </div>
    </section>
  );
}
