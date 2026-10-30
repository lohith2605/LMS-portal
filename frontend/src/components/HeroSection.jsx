import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import ProductPreview from './ProductPreview';
import Reveal from './ui/Reveal';

export default function HeroSection({ onExploreCourses, onHowItWorks }) {
  return (
    <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 lg:pb-24 relative overflow-hidden" aria-label="Hero Introduction">
      {/* Soft subtle themed ambient backdrop glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] bg-gradient-to-b from-accent-blue-pale/25 via-accent-sage-pale/15 to-transparent blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        
        {/* ========================================================= */}
        {/* TOP EDITORIAL ZONE: Primary Focus & Value Proposition     */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          
          {/* Eyebrow Badge */}
          <Reveal triggerOnMount delayMs={0}>
            <div className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-blue-dark mb-5 cursor-default">
              <span className="bg-accent-blue-pale border border-accent-blue/20 px-3.5 py-1 rounded-full inline-flex items-center gap-2 shadow-2xs hover:border-accent-blue/40 transition-colors">
                <Compass size={14} strokeWidth={1.75} className="text-accent-blue group-hover-wobble" aria-hidden="true" />
                <span>LEARNING, WITH DIRECTION</span>
              </span>
            </div>
          </Reveal>

          {/* Master Headline */}
          <Reveal triggerOnMount delayMs={80}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-primary">
              Make progress on what matters.
            </h1>
          </Reveal>

          {/* Supporting Narrative */}
          <Reveal triggerOnMount delayMs={160}>
            <p className="text-base sm:text-lg lg:text-[19px] text-secondary leading-relaxed max-w-2xl mt-4 sm:mt-5">
              Discover practical courses, build valuable skills, and keep every step of your learning journey organized in one place.
            </p>
          </Reveal>

          {/* Action CTAs */}
          <Reveal triggerOnMount delayMs={240}>
            <div className="flex items-center justify-center w-full mt-7 sm:mt-8">
              <button
                type="button"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed hover-lift btn-press shadow-sm shadow-cobalt/20 transition-all cursor-pointer"
                onClick={onExploreCourses}
              >
                <span>Explore Courses</span>
                <ArrowRight size={15} strokeWidth={1.75} className="group-hover-nudge-x" aria-hidden="true" />
              </button>
            </div>
          </Reveal>
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

