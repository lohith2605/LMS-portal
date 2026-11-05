import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import campusHeroBg from '../assets/Bright Collaborative University Library Commons.png';

export default function HeroSection({ onExploreCourses, onHowItWorks: _onHowItWorks }) {
  const shouldReduceMotion = useReducedMotion();
  // Respect reduced-motion accessibility by eliminating vestibular translation (y/scale),
  // while ensuring smooth opacity fade always visibly plays so normal browser settings never skip animations.
  const isReduced = shouldReduceMotion === true;

  // Staggered easing curve matching the design system
  const easeCurve = [0.16, 1, 0.3, 1];

  return (
    <section
      className="relative isolate overflow-hidden flex flex-col justify-center items-center py-12 sm:py-16 md:py-20 min-h-[540px] sm:min-h-[580px] md:min-h-[620px] lg:h-[calc(100svh-72px)] lg:max-h-[820px]"
      aria-label="Hero Introduction"
    >
      {/* ========================================================= */}
      {/* CAMPUS BACKGROUND PHOTOGRAPH — CINEMATIC & STUDENT-FOCUSED */}
      {/* ========================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {/* Real photographic campus background anchored and sized to prominently reveal students and tables in initial viewport */}
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
          className="absolute inset-x-0 bottom-0 w-full min-w-full h-[125%] sm:h-[130%] md:h-[135%] lg:h-[138%] max-w-none object-cover object-[28%_bottom] sm:object-[40%_bottom] md:object-bottom lg:object-bottom select-none dark:brightness-[0.6] dark:contrast-[1.1] dark:saturate-[0.95]"
        />

        {/* Subtle localized upper wash: ensures headline contrast in sky without any box or card */}
        <div
          className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-white/35 via-white/15 to-transparent dark:from-black/60 dark:via-black/30 dark:to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Ultra-soft micro-feathering at the very bottom boundary so students and tables remain crisp */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-page to-transparent pointer-events-none" />
      </div>

      {/* ========================================================= */}
      {/* EDITORIAL CONTENT: Directly Integrated Into the Scene     */}
      {/* ========================================================= */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full relative z-10 text-center flex flex-col items-center justify-center my-auto">
        {/* Eyebrow Badge */}
        <motion.div
          initial={{ opacity: 0, y: isReduced ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: easeCurve }}
        >
          <div className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cobalt mb-5 sm:mb-6 md:mb-7 cursor-default">
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
        </motion.div>

        {/* Master Headline — Crisp, high-impact, editorial line breaks */}
        <motion.div
          initial={{ opacity: 0, y: isReduced ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: easeCurve }}
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[62px] font-extrabold tracking-tight leading-[1.08] text-slate-900 dark:text-white max-w-2xl mx-auto drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Make progress on what matters.
          </h1>
        </motion.div>

        {/* Supporting Narrative — Balanced width, clear legibility */}
        <motion.div
          initial={{ opacity: 0, y: isReduced ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: easeCurve }}
        >
          <p className="text-base sm:text-lg lg:text-[19px] text-slate-700 dark:text-slate-200 leading-relaxed max-w-xl mx-auto mt-5 sm:mt-6 md:mt-7 font-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
            Discover practical courses, build valuable skills, and keep every step of your learning
            journey organized in one place.
          </p>
        </motion.div>

        {/* Action CTA */}
        <motion.div
          initial={{ opacity: 0, scale: isReduced ? 1 : 0.95, y: isReduced ? 0 : 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.85, ease: easeCurve }}
          className="flex items-center justify-center w-full mt-8 sm:mt-9 md:mt-10"
        >
          <motion.button
            type="button"
            whileHover={isReduced ? undefined : { scale: 1.03 }}
            whileTap={isReduced ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm sm:text-base font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-md shadow-cobalt/25 hover:shadow-lg hover:shadow-cobalt/35 transition-all cursor-pointer"
            onClick={onExploreCourses}
          >
            <span>Explore Courses</span>
            <ArrowRight
              size={16}
              strokeWidth={2}
              className="group-hover-nudge-x transition-transform duration-200 ease-out group-hover:translate-x-1"
              aria-hidden="true"
            />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
