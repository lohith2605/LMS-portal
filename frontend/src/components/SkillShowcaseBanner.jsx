import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  Cpu,
  Code2,
  TrendingUp,
  Award,
  Terminal,
  Layers,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/**
 * Single Floating Glassmorphic Skill Sticker
 */
function SkillSticker({
  icon: Icon,
  title,
  subtitle,
  glowTone = 'blue',
  animationClass = 'animate-float-sticker-a',
  className = '',
}) {
  const toneMap = {
    amber: 'ring-amber-400/30 shadow-amber-500/20 text-amber-200',
    cyan: 'ring-cyan-400/30 shadow-cyan-500/20 text-cyan-200',
    purple: 'ring-purple-400/30 shadow-purple-500/20 text-purple-200',
    blue: 'ring-blue-400/30 shadow-blue-500/20 text-blue-200',
    emerald: 'ring-emerald-400/30 shadow-emerald-500/20 text-emerald-200',
    sage: 'ring-[#9FB895]/30 shadow-[#9FB895]/20 text-[#D2E0CB]',
  };

  const selectedTone = toneMap[glowTone] || toneMap.blue;

  return (
    <div
      className={`group/sticker relative ${animationClass} ${className}`}
      tabIndex={0}
      role="tooltip"
      aria-label={`${title}: ${subtitle}`}
    >
      {/* Ambient background glow ring */}
      <div
        className={`absolute inset-0 rounded-full blur-md opacity-40 group-hover/sticker:opacity-80 transition-opacity duration-300 pointer-events-none ${
          glowTone === 'amber'
            ? 'bg-amber-400'
            : glowTone === 'cyan'
            ? 'bg-cyan-400'
            : glowTone === 'emerald'
            ? 'bg-emerald-400'
            : 'bg-indigo-400'
        }`}
      />

      {/* Glassmorphic Sticker Disc */}
      <div
        className={`relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full glass-sticker flex items-center justify-center ring-2 sm:ring-4 cursor-pointer select-none ${selectedTone}`}
      >
        <Icon
          size={24}
          strokeWidth={1.75}
          className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 drop-shadow-[0_2px_10px_rgba(255,255,255,0.7)] transition-transform duration-300 group-hover/sticker:scale-115"
          aria-hidden="true"
        />
      </div>

      {/* Hover Flyout Skill Tag */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/sticker:opacity-100 group-focus/sticker:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/sticker:translate-x-0 hidden sm:flex flex-col items-end whitespace-nowrap z-30">
        <div className="px-3 py-1.5 rounded-xl bg-neutral-950/90 text-white border border-white/20 backdrop-blur-md shadow-elevated text-right">
          <span className="block text-xs font-bold leading-tight tracking-tight">
            {title}
          </span>
          {subtitle && (
            <span className="block text-[10px] text-white/70 leading-tight">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SkillShowcaseBanner — Homepage Hero Feature Carousel
 * Featuring rich skill banners with purpose-driven titles and floating glassmorphic stickers.
 */
export default function SkillShowcaseBanner({ onExploreCourses, onGetStarted }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [direction, setDirection] = useState('next'); // 'next' | 'prev'
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const slideCount = 3;

  const slides = [
    {
      id: 'ai-track',
      eyebrow: 'AI & Machine Learning',
      title: 'Learn AI from the companies and minds building it',
      subtitle:
        'Courses and certified learning paths in Generative AI, PyTorch, Neural Networks, and Prompt Architecture — designed for every level and role.',
      cta: 'Explore AI Courses',
      badge: 'Most Popular Track',
      gradientClass:
        'from-[#0A0D14] via-[#0F1626] to-[#162035]',
      accentColor: '#38BDF8',
      image: '/banners/ai-banner.jpg',
      imageAlt: 'Learner studying artificial intelligence with laptop and digital tablet',
      stickers: [
        {
          icon: Sparkles,
          title: 'Generative AI',
          subtitle: 'LLMs & Diffusion',
          glowTone: 'amber',
          animationClass: 'animate-float-sticker-a',
          position: 'top-2 right-4 sm:top-4 sm:right-6',
        },
        {
          icon: Brain,
          title: 'Neural Networks',
          subtitle: 'Deep Learning',
          glowTone: 'cyan',
          animationClass: 'animate-float-sticker-b',
          position: 'top-1/2 -translate-y-1/2 -right-1 sm:right-2',
        },
        {
          icon: Cpu,
          title: 'Applied AI',
          subtitle: 'Model Fine-Tuning',
          glowTone: 'purple',
          animationClass: 'animate-float-sticker-c',
          position: 'bottom-3 right-5 sm:bottom-6 sm:right-8',
        },
      ],
    },
    {
      id: 'career-growth',
      eyebrow: 'Career Advancement',
      title: 'Start, switch, or accelerate your tech career',
      subtitle:
        'Master high-demand full-stack development, cloud architecture, and modern DevOps with real-world projects and mentor-reviewed assignments.',
      cta: 'Join for Free',
      badge: 'Industry Verified',
      gradientClass:
        'from-[#0E1F3D] via-[#1A3365] to-[#254687]',
      accentColor: '#60A5FA',
      image: '/banners/career-banner.jpg',
      imageAlt: 'Tech professional smiling with tablet ready to advance software career',
      stickers: [
        {
          icon: Code2,
          title: 'Full-Stack Mastery',
          subtitle: 'React & Node.js',
          glowTone: 'blue',
          animationClass: 'animate-float-sticker-a',
          position: 'top-3 right-4 sm:top-5 sm:right-6',
        },
        {
          icon: TrendingUp,
          title: 'Career Velocity',
          subtitle: 'Skill Benchmarks',
          glowTone: 'emerald',
          animationClass: 'animate-float-sticker-b',
          position: 'top-1/2 -translate-y-1/2 -right-1 sm:right-2',
        },
        {
          icon: Award,
          title: 'Verified Certificate',
          subtitle: 'Academic Credential',
          glowTone: 'amber',
          animationClass: 'animate-float-sticker-c',
          position: 'bottom-4 right-5 sm:bottom-6 sm:right-8',
        },
      ],
    },
    {
      id: 'cloud-devops',
      eyebrow: 'Production Engineering',
      title: 'Architect resilient systems & enterprise clouds',
      subtitle:
        'From microservices and distributed database tuning to Kubernetes clusters and security benchmarks — engineered for modern tech stacks.',
      cta: 'Explore Cloud Tracks',
      badge: 'Capstone Labs',
      gradientClass:
        'from-[#0D1815] via-[#132822] to-[#1C3A32]',
      accentColor: '#4ADE80',
      image: '/banners/ai-banner.jpg',
      imageAlt: 'Cloud architect analyzing telemetry and real-time distributed clusters',
      stickers: [
        {
          icon: Terminal,
          title: 'Hands-on Sandbox',
          subtitle: 'Terminal Labs',
          glowTone: 'emerald',
          animationClass: 'animate-float-sticker-a',
          position: 'top-2 right-4 sm:top-4 sm:right-6',
        },
        {
          icon: Layers,
          title: 'Microservices',
          subtitle: 'Distributed Systems',
          glowTone: 'sage',
          animationClass: 'animate-float-sticker-b',
          position: 'top-1/2 -translate-y-1/2 -right-1 sm:right-2',
        },
        {
          icon: ShieldCheck,
          title: 'Cloud Security',
          subtitle: 'Zero-Trust Protocol',
          glowTone: 'cyan',
          animationClass: 'animate-float-sticker-c',
          position: 'bottom-3 right-5 sm:bottom-6 sm:right-8',
        },
      ],
    },
  ];

  // Listen to OS/browser reduced-motion accessibility preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => setPrefersReducedMotion(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Derive pause state: paused ONLY on pointer hover or keyboard focus
  const isPaused = isHovered || isFocused;

  // Auto-advance slides every 5.0 seconds when not paused
  // Uses setInterval so it reliably ticks every 5 seconds without dependent state lags
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setDirection('next');
      setActiveSlide((prev) => (prev + 1) % slideCount);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, resetKey, slideCount]);

  const handlePrev = (e) => {
    e?.currentTarget?.blur();
    setIsFocused(false);
    setDirection('prev');
    setActiveSlide((prev) => (prev - 1 + slideCount) % slideCount);
    setResetKey((k) => k + 1);
  };

  const handleNext = (e) => {
    e?.currentTarget?.blur();
    setIsFocused(false);
    setDirection('next');
    setActiveSlide((prev) => (prev + 1) % slideCount);
    setResetKey((k) => k + 1);
  };

  const goToSlide = (idx, e) => {
    e?.currentTarget?.blur();
    setIsFocused(false);
    if (idx === activeSlide) {
      setResetKey((k) => k + 1);
      return;
    }
    setDirection(idx > activeSlide ? 'next' : 'prev');
    setActiveSlide(idx);
    setResetKey((k) => k + 1);
  };

  const handleFocus = (e) => {
    // Only pause for intentional keyboard Tab navigation (:focus-visible), never for mouse clicks
    if (e.target?.matches?.(':focus-visible')) {
      setIsFocused(true);
    }
  };

  const handleBlur = (e) => {
    // Only unpause if focus has left the carousel container completely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsFocused(false);
    }
  };

  const current = slides[activeSlide];

  return (
    <section
      className="max-w-[1240px] mx-auto px-4 sm:px-6 my-10 sm:my-14"
      aria-label="Skill Showcase & Featured Tracks"
      aria-roledescription="carousel"
    >
      {/* Screen Reader Live Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {activeSlide + 1} of {slideCount}: {current.eyebrow} - {current.title}
      </div>

      {/* Banner Card Container */}
      <div
        id={`carousel-slide-${current.id}`}
        role="region"
        aria-roledescription="slide"
        aria-label={`Slide ${activeSlide + 1} of ${slideCount}: ${current.eyebrow}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
        onTouchCancel={() => setIsHovered(false)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`relative rounded-3xl overflow-hidden border border-border-subtle/50 shadow-elevated bg-gradient-to-br ${current.gradientClass} text-white transition-all duration-700`}
      >
        {/* Subtle Ambient Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 items-center min-h-[420px] sm:min-h-[460px] lg:min-h-[480px]">
          {/* ========================================================= */}
          {/* LEFT: Text Content, CTA & Carousel Indicators             */}
          {/* ========================================================= */}
          <div className="col-span-1 lg:col-span-7 p-6 sm:p-10 lg:p-14 z-10 flex flex-col justify-between h-full">
            {/* Animated Slide Content Panel */}
            <div
              key={`content-${activeSlide}`}
              className={
                prefersReducedMotion
                  ? ''
                  : direction === 'next'
                  ? 'animate-carousel-slide-next'
                  : 'animate-carousel-slide-prev'
              }
            >
              {/* Eyebrow & Badge */}
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
                  {current.eyebrow}
                </span>
                <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider hidden sm:inline-block">
                  {current.badge}
                </span>
              </div>

              {/* Main Headline */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-extrabold text-white leading-tight tracking-tight mb-4">
                {current.title}
              </h2>

              {/* Description */}
              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-xl mb-6 sm:mb-8 font-normal">
                {current.subtitle}
              </p>

              {/* Action Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={activeSlide === 1 ? onGetStarted : onExploreCourses}
                  className="px-6 py-3 rounded-full bg-white text-neutral-900 hover:bg-neutral-100 font-bold text-sm sm:text-base inline-flex items-center gap-2 shadow-card hover-lift btn-press cursor-pointer group/cta transition-all focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label={current.cta}
                >
                  <span>{current.cta}</span>
                  <ArrowRight
                    size={16}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-hover/cta:translate-x-1"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {/* Bottom: Carousel Pagination & Controls */}
            <div className="flex items-center justify-between pt-8 sm:pt-10 mt-6 border-t border-white/10">
              {/* Slide Indicator Dots */}
              <div
                className="flex items-center gap-2"
                role="tablist"
                aria-label="Skill Banner Slides"
              >
                {slides.map((slide, idx) => {
                  const isActive = activeSlide === idx;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={(e) => goToSlide(idx, e)}
                      role="tab"
                      id={`carousel-tab-${slide.id}`}
                      aria-selected={isActive}
                      aria-controls={`carousel-slide-${slide.id}`}
                      aria-label={`Go to slide ${idx + 1} of ${slideCount}: ${slide.eyebrow}`}
                      className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer overflow-hidden relative focus:outline-none focus:ring-2 focus:ring-white/60 ${
                        isActive
                          ? 'w-8 bg-white/30 shadow-xs'
                          : 'w-2.5 bg-white/35 hover:bg-white/60'
                      }`}
                    >
                      {isActive && (
                        <span
                          key={`progress-${activeSlide}-${resetKey}-${isPaused}`}
                          className={`absolute inset-0 rounded-full bg-white ${
                            isPaused
                              ? 'w-full'
                              : 'animate-carousel-progress'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Slide Counter & Arrow Buttons */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs text-white/60 font-medium mr-2 tabular-nums"
                  aria-hidden="true"
                >
                  0{activeSlide + 1} / 0{slideCount}
                </span>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous slide"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next slide"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT: Visual Artwork & Floating Glass Skill Stickers     */}
          {/* ========================================================= */}
          <div className="col-span-1 lg:col-span-5 relative h-full flex items-center justify-center p-6 lg:p-8 min-h-[320px] sm:min-h-[380px] lg:min-h-full overflow-hidden">
            {/* Visual Container */}
            <div
              key={`visual-${activeSlide}`}
              className={`relative w-full max-w-md lg:max-w-none aspect-4/3 sm:aspect-16/10 lg:aspect-square flex items-center justify-center ${
                prefersReducedMotion
                  ? ''
                  : direction === 'next'
                  ? 'animate-carousel-slide-next'
                  : 'animate-carousel-slide-prev'
              }`}
            >
              {/* Graphic Mask / Portal */}
              <div className="relative w-full h-full rounded-2xl lg:rounded-3xl overflow-hidden border border-white/15 shadow-elevated">
                <img
                  src={current.image}
                  alt={current.imageAlt}
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  loading="eager"
                />
                {/* Subtle gradient vignette to blend with banner background */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none lg:block hidden" />
              </div>

              {/* Floating Glassmorphic Stickers Layer (Matches exact visual from user request) */}
              <div className="absolute inset-0 pointer-events-auto z-20">
                {current.stickers.map((sticker, idx) => (
                  <SkillSticker
                    key={`${current.id}-sticker-${idx}`}
                    icon={sticker.icon}
                    title={sticker.title}
                    subtitle={sticker.subtitle}
                    glowTone={sticker.glowTone}
                    animationClass={sticker.animationClass}
                    className={`absolute ${sticker.position}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
