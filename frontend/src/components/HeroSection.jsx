import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import ProductPreview from './ProductPreview';

export default function HeroSection({ onExploreCourses, onHowItWorks }) {
  return (
    <section className="pt-10 md:pt-16 pb-14 md:pb-20 relative" aria-label="Hero Introduction">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-center">
          {/* Left Column: Typography & Actions */}
          <div className="flex flex-col gap-6 max-w-full lg:max-w-[580px]">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-blue-dark">
              <span className="bg-accent-blue-pale px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" aria-hidden="true" />
                LEARNING, WITH DIRECTION
              </span>
            </div>

            <h1 className="text-[clamp(2.35rem,4.8vw,3.75rem)] font-extrabold tracking-tight leading-[1.1] text-primary">
              Make progress on what matters.
            </h1>

            <p className="text-[clamp(1.05rem,1.4vw,1.2rem)] text-secondary leading-relaxed max-w-full lg:max-w-[520px]">
              Discover practical courses, build valuable skills, and keep every step of your learning journey organized in one place.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-[#2a2a2a] hover:-translate-y-0.5 shadow-sm hover:shadow-card transition-all cursor-pointer"
                onClick={onExploreCourses}
              >
                <span>Explore Courses</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-white text-primary border border-border-medium hover:bg-surface-subtle hover:-translate-y-0.5 transition-all cursor-pointer"
                onClick={onHowItWorks}
              >
                <span>How It Works</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-sage" aria-hidden="true" />
              <span>Your learning journey, organized.</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-4 border-t border-border-subtle text-xs text-secondary flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-accent-sage-dark" aria-hidden="true" />
                Structured curricula
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-accent-sage-dark" aria-hidden="true" />
                Applied assignments
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-accent-sage-dark" aria-hidden="true" />
                Verified progress
              </span>
            </div>
          </div>

          {/* Right Column: Realistic LMS Product Window Preview */}
          <div className="relative w-full">
            <ProductPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
