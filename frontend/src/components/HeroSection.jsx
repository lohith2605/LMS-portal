import React from 'react';
import { ArrowRight, Compass, Layers, ClipboardCheck, ShieldCheck } from 'lucide-react';
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
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-neutral-800 hover-lift btn-press shadow-xs transition-all cursor-pointer"
                onClick={onExploreCourses}
              >
                <span>Explore Courses</span>
                <ArrowRight size={15} strokeWidth={1.75} className="group-hover-nudge-x" aria-hidden="true" />
              </button>
            </div>
          </Reveal>

          {/* Verified Capabilities Trust Row */}
          <Reveal triggerOnMount delayMs={320}>
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 pt-6 mt-6 border-t border-border-subtle text-xs text-secondary">
              <span className="group inline-flex items-center gap-2 font-medium hover:text-primary transition-colors">
                <span className="w-5 h-5 rounded-md bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent">
                  <Layers size={13} strokeWidth={1.75} aria-hidden="true" />
                </span>
                Structured curricula
              </span>
              <span className="group inline-flex items-center gap-2 font-medium hover:text-primary transition-colors">
                <span className="w-5 h-5 rounded-md bg-[var(--badge-success-bg)] border border-[var(--success)]/20 flex items-center justify-center text-[var(--success)]">
                  <ClipboardCheck size={13} strokeWidth={1.75} aria-hidden="true" />
                </span>
                Applied assignments
              </span>
              <span className="group inline-flex items-center gap-2 font-medium hover:text-primary transition-colors">
                <span className="w-5 h-5 rounded-md bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent">
                  <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
                </span>
                Verified progress
              </span>
            </div>
          </Reveal>

        </div>

        {/* ========================================================= */}
        {/* LOWER SHOWCASE ZONE: Wide Integrated Product Canvas       */}
        {/* ========================================================= */}
        <Reveal triggerOnMount delayMs={400}>
          <div className="w-full max-w-[1160px] mx-auto hover-lift transition-all">
            <ProductPreview />
          </div>
        </Reveal>

      </div>
    </section>
  );
}

