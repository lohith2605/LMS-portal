import React from 'react';
import { ArrowRight, CheckCircle2, Compass } from 'lucide-react';
import ProductPreview from './ProductPreview';

export default function HeroSection({ onExploreCourses, onHowItWorks }) {
  return (
    <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 lg:pb-24 relative overflow-hidden" aria-label="Hero Introduction">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        
        {/* ========================================================= */}
        {/* TOP EDITORIAL ZONE: Primary Focus & Value Proposition     */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4A6376] mb-5">
            <span className="bg-[#E9EFF2] border border-[#637D91]/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <Compass size={13} className="text-[#637D91]" />
              <span>LEARNING, WITH DIRECTION</span>
            </span>
          </div>

          {/* Master Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-[#171717]">
            Make progress on what matters.
          </h1>

          {/* Supporting Narrative */}
          <p className="text-base sm:text-lg lg:text-[19px] text-[#686868] leading-relaxed max-w-2xl mt-4 sm:mt-5">
            Discover practical courses, build valuable skills, and keep every step of your learning journey organized in one place.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mt-7 sm:mt-8">
            <button
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.25 text-sm font-semibold rounded-xl bg-[#171717] text-white hover:bg-[#2b2b2b] hover:-translate-y-0.5 shadow-xs transition-all cursor-pointer"
              onClick={onExploreCourses}
            >
              <span>Explore Courses</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>

            <button
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.25 text-sm font-semibold rounded-xl bg-white text-[#171717] border border-[#E4E4E1] hover:bg-[#F8F8F6] hover:-translate-y-0.5 shadow-2xs transition-all cursor-pointer"
              onClick={onHowItWorks}
            >
              <span>How It Works</span>
            </button>
          </div>

          {/* Verified Capabilities Checklist */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6 mt-6 border-t border-[#E4E4E1] text-xs text-[#686868]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-[#5F7158]" aria-hidden="true" />
              Structured curricula
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-[#5F7158]" aria-hidden="true" />
              Applied assignments
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-[#5F7158]" aria-hidden="true" />
              Verified progress
            </span>
          </div>

        </div>

        {/* ========================================================= */}
        {/* LOWER SHOWCASE ZONE: Wide Integrated Product Canvas       */}
        {/* ========================================================= */}
        <div className="w-full max-w-[1160px] mx-auto">
          <ProductPreview />
        </div>

      </div>
    </section>
  );
}
