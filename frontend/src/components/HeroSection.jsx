import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import Reveal from './ui/Reveal';
import campusHeroBg from '../assets/Bright Collaborative University Library Commons.png';

export default function HeroSection({ onExploreCourses, onHowItWorks: _onHowItWorks }) {
  return (
    <section
      className="relative isolate overflow-hidden flex flex-col justify-start pt-14 sm:pt-18 md:pt-20 lg:pt-24 pb-44 sm:pb-52 md:pb-60 lg:pb-72 min-h-[600px] sm:min-h-[660px] md:min-h-[720px] lg:min-h-[760px]"
      aria-label="Hero Introduction"
    >
      {/* ========================================================= */}
      {/* CAMPUS BACKGROUND PHOTOGRAPH — CINEMATIC & STUDENT-FOCUSED */}
      {/* ========================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {/* Real photographic campus background with natural daylight color and crisp student focus */}
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
          className="w-full h-full object-cover object-[28%_bottom] sm:object-[40%_bottom] md:object-[center_bottom] lg:object-[center_82%] select-none dark:brightness-[0.6] dark:contrast-[1.1] dark:saturate-[0.95]"
        />

        {/* Subtle localized upper wash: ensures headline contrast in sky without any box or card */}
        <div
          className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-white/35 via-white/15 to-transparent dark:from-black/60 dark:via-black/30 dark:to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Ultra-soft micro-feathering at the very bottom boundary so students and tables remain crisp */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-page to-transparent pointer-events-none" />
      </div>

      {/* ========================================================= */}
      {/* EDITORIAL CONTENT: Directly Integrated Into the Scene     */}
      {/* ========================================================= */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full relative z-10 text-center">
        {/* Eyebrow Badge */}
        <Reveal triggerOnMount delayMs={0}>
          <div className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cobalt mb-3 sm:mb-4 cursor-default">
            <span className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-cobalt/25 px-3.5 py-1 rounded-full inline-flex items-center gap-2 shadow-2xs hover:border-cobalt/45 transition-colors">
              <Compass
                size={14}
                strokeWidth={2}
                className="text-cobalt group-hover-wobble"
                aria-hidden="true"
              />
              <span>LEARNING, WITH DIRECTION</span>
            </span>
          </div>
        </Reveal>

        {/* Master Headline — Crisp, high-impact, editorial line breaks */}
        <Reveal triggerOnMount delayMs={80}>
          <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl lg:text-[62px] font-extrabold tracking-tight leading-[1.12] sm:leading-[1.08] text-slate-900 dark:text-white max-w-2xl mx-auto drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Make progress on what matters.
          </h1>
        </Reveal>

        {/* Supporting Narrative — Balanced width, clear legibility */}
        <Reveal triggerOnMount delayMs={160}>
          <p className="text-sm sm:text-lg lg:text-[19px] text-slate-700 dark:text-slate-200 leading-relaxed max-w-xl mx-auto mt-3 sm:mt-4.5 font-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
            Discover practical courses, build valuable skills, and keep every step of your learning
            journey organized in one place.
          </p>
        </Reveal>

        {/* Action CTA */}
        <Reveal triggerOnMount delayMs={240}>
          <div className="flex items-center justify-center w-full mt-6 sm:mt-7">
            <button
              type="button"
              className="group w-full xs:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed hover-lift btn-press shadow-md shadow-cobalt/25 transition-all cursor-pointer"
              onClick={onExploreCourses}
            >
              <span>Explore Courses</span>
              <ArrowRight
                size={16}
                strokeWidth={2}
                className="group-hover-nudge-x"
                aria-hidden="true"
              />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
