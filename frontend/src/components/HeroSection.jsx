import React, { useState, useEffect } from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import campusHeroBg from '../assets/Bright Collaborative University Library Commons.png';

// Global session memory to prevent unnecessary replay of typewriter animation
// during routine in-app navigation or ordinary component re-renders.
let hasHeroAnimatedGlobally = false;

const HEADING_TEXT = 'Make progress on what matters.';

// Statically pre-indexed words and character offsets for pure, deterministic typewriter rendering
const HEADING_DATA = [
  {
    word: 'Make',
    chars: [
      { char: 'M', index: 0 },
      { char: 'a', index: 1 },
      { char: 'k', index: 2 },
      { char: 'e', index: 3 },
    ],
    spaceIndex: 4,
  },
  {
    word: 'progress',
    chars: [
      { char: 'p', index: 5 },
      { char: 'r', index: 6 },
      { char: 'o', index: 7 },
      { char: 'g', index: 8 },
      { char: 'r', index: 9 },
      { char: 'e', index: 10 },
      { char: 's', index: 11 },
      { char: 's', index: 12 },
    ],
    spaceIndex: 13,
  },
  {
    word: 'on',
    chars: [
      { char: 'o', index: 14 },
      { char: 'n', index: 15 },
    ],
    spaceIndex: 16,
  },
  {
    word: 'what',
    chars: [
      { char: 'w', index: 17 },
      { char: 'h', index: 18 },
      { char: 'a', index: 19 },
      { char: 't', index: 20 },
    ],
    spaceIndex: 21,
  },
  {
    word: 'matters.',
    chars: [
      { char: 'm', index: 22 },
      { char: 'a', index: 23 },
      { char: 't', index: 24 },
      { char: 't', index: 25 },
      { char: 'e', index: 26 },
      { char: 'r', index: 27 },
      { char: 's', index: 28 },
      { char: '.', index: 29 },
    ],
    spaceIndex: null,
  },
];

const TOTAL_CHARS = 30;

export default function HeroSection({ onExploreCourses, onHowItWorks: _onHowItWorks }) {
  const shouldReduceMotion = useReducedMotion();
  const isReduced = shouldReduceMotion === true;

  // Track if this is the initial entrance sequence
  const [isFirstPlay] = useState(() => !hasHeroAnimatedGlobally && !isReduced);

  // Typewriter character reveal count (0 to 30)
  const [revealedCount, setRevealedCount] = useState(() => (isFirstPlay ? 0 : TOTAL_CHARS));

  useEffect(() => {
    if (!isFirstPlay) {
      setRevealedCount(TOTAL_CHARS);
      return;
    }

    // Mark as animated globally so navigating away and returning does not repeat typewriter
    hasHeroAnimatedGlobally = true;

    let intervalId = null;
    // Delay start until badge has popped in (~450ms)
    const startDelayTimer = setTimeout(() => {
      let count = 0;
      intervalId = setInterval(() => {
        count += 1;
        setRevealedCount(count);
        if (count >= TOTAL_CHARS) {
          clearInterval(intervalId);
        }
      }, 40); // 40ms per character (natural typing speed in 35-50ms range)
    }, 450);

    return () => {
      clearTimeout(startDelayTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isFirstPlay]);

  // Cubic bezier easing matching the design system
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
      {/* EDITORIAL CONTENT: Balanced, Centered & Highly Readable   */}
      {/* ========================================================= */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full relative z-10 text-center flex flex-col items-center justify-center my-auto">
        {/* 1. Eyebrow Badge — Smooth pop-in with gentle spring */}
        <motion.div
          initial={isFirstPlay ? { opacity: 0, scale: 0.82 } : { opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            isFirstPlay
              ? {
                  type: 'spring',
                  stiffness: 260,
                  damping: 22,
                  mass: 0.8,
                  delay: 0.12,
                }
              : { duration: 0 }
          }
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

        {/* 2. Master Headline — Typewriter character-by-character reveal (Zero layout shift, fully accessible) */}
        <h1
          className="text-3xl sm:text-5xl md:text-6xl lg:text-[62px] font-extrabold tracking-tight leading-[1.08] text-slate-900 dark:text-white max-w-2xl mx-auto drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          aria-label={HEADING_TEXT}
        >
          {/* Accessible announcement for screen readers as a unified heading */}
          <span className="sr-only">{HEADING_TEXT}</span>

          {/* Visual progressive typewriter reveal */}
          <span aria-hidden="true">
            {HEADING_DATA.map((item, wordIndex) => (
              <span key={wordIndex} className="inline-block whitespace-nowrap">
                {item.chars.map(({ char, index }) => (
                  <span
                    key={index}
                    className="inline-block transition-opacity duration-75"
                    style={{
                      opacity: index < revealedCount ? 1 : 0,
                    }}
                  >
                    {char}
                  </span>
                ))}
                {item.spaceIndex !== null && (
                  <span
                    key={`space-${wordIndex}`}
                    className="inline-block transition-opacity duration-75"
                    style={{
                      opacity: item.spaceIndex < revealedCount ? 1 : 0,
                    }}
                  >
                    &nbsp;
                  </span>
                )}
              </span>
            ))}
          </span>
        </h1>

        {/* 3. Supporting Narrative — Translucent readable backdrop pill */}
        <motion.div
          initial={isFirstPlay ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            isFirstPlay
              ? { duration: 0.55, delay: 1.65, ease: easeCurve }
              : { duration: 0 }
          }
          className="mt-5 sm:mt-6 md:mt-7 max-w-xl mx-auto"
        >
          <p className="inline-block px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-white/70 dark:border-white/10 shadow-xs text-base sm:text-lg lg:text-[19px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            Discover practical courses, build valuable skills, and keep every step of your learning
            journey organized in one place.
          </p>
        </motion.div>

        {/* 4. Action CTA — Smooth pop-in with upward spring */}
        <motion.div
          initial={
            isFirstPlay
              ? { opacity: 0, scale: 0.88, y: 16 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={
            isFirstPlay
              ? {
                  type: 'spring',
                  stiffness: 240,
                  damping: 20,
                  mass: 0.9,
                  delay: 2.1,
                }
              : { duration: 0 }
          }
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
