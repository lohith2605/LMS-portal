import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import Reveal from './ui/Reveal';
import campusHeroBg from '../assets/Bright Collaborative University Library Commons.png';

export default function HeroSection({ onExploreCourses, onHowItWorks: _onHowItWorks }) {
  return (
    <section
      className="py-16 sm:py-24 lg:py-32 relative isolate overflow-hidden flex items-center justify-center min-h-[560px] sm:min-h-[640px]"
      aria-label="Hero Introduction"
    >
      {/* ========================================================= */}
      {/* CAMPUS BACKGROUND PHOTOGRAPH — FULLY VISIBLE & VIBRANT   */}
      {/* ========================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {/* Real photographic university campus/library background with preserved natural colors */}
        <img
          src={campusHeroBg}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          onError={(e) => {
            // Browser URL fallback if spaces in dev asset URL are rejected by browser
            e.currentTarget.src = '/hero-campus.png';
          }}
          className="w-full h-full object-cover object-[center_32%] select-none contrast-[1.08] saturate-[1.18] brightness-[0.98] dark:brightness-[0.45] dark:contrast-[1.2] dark:saturate-[1.1]"
        />

        {/* Minimal soft feathering ONLY at the very bottom boundary to merge smoothly with the next section */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-page to-transparent" />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full relative z-10">
        {/* ========================================================= */}
        {/* TOP EDITORIAL ZONE: Intentional Area with Restrained Backing */}
        {/* ========================================================= */}
        <div className="max-w-3xl mx-auto rounded-3xl bg-white/75 dark:bg-page/80 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm px-6 py-8 sm:px-10 sm:py-9 text-center">
          {/* Eyebrow Badge */}
          <Reveal triggerOnMount delayMs={0}>
            <div className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-blue-dark mb-4 cursor-default">
              <span className="bg-surface/90 backdrop-blur-md border border-accent-blue/25 px-3.5 py-1 rounded-full inline-flex items-center gap-2 shadow-2xs hover:border-accent-blue/45 transition-colors">
                <Compass
                  size={14}
                  strokeWidth={1.75}
                  className="text-accent-blue group-hover-wobble"
                  aria-hidden="true"
                />
                <span>LEARNING, WITH DIRECTION</span>
              </span>
            </div>
          </Reveal>

          {/* Master Headline — Crisp, sharp, zero blur/excessive shadow */}
          <Reveal triggerOnMount delayMs={80}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-primary">
              Make progress on what matters.
            </h1>
          </Reveal>

          {/* Supporting Narrative */}
          <Reveal triggerOnMount delayMs={160}>
            <p className="text-base sm:text-lg lg:text-[19px] text-secondary leading-relaxed max-w-2xl mx-auto mt-4 sm:mt-5 font-medium">
              Discover practical courses, build valuable skills, and keep every step of your learning
              journey organized in one place.
            </p>
          </Reveal>

          {/* Action CTAs */}
          <Reveal triggerOnMount delayMs={240}>
            <div className="flex items-center justify-center w-full mt-7 sm:mt-8">
              <button
                type="button"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed hover-lift btn-press shadow-md shadow-cobalt/25 transition-all cursor-pointer"
                onClick={onExploreCourses}
              >
                <span>Explore Courses</span>
                <ArrowRight
                  size={15}
                  strokeWidth={1.75}
                  className="group-hover-nudge-x"
                  aria-hidden="true"
                />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
