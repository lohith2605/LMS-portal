import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Sparkles,
  MessageSquareQuote,
} from 'lucide-react';
import { reviewService } from '../services/api';
import Reveal from './ui/Reveal';

/**
 * Fallback avatar generator with initial letters and deterministically styled background
 */
function AvatarWithFallback({ name, avatarUrl, size = 'md' }) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (n) => {
    if (!n) return 'VS';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses =
    size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-[11px]';

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={`${name || 'Student'}'s profile avatar`}
        className={`${sizeClasses} rounded-full object-cover border border-border-subtle shrink-0`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-cobalt-soft border border-cobalt-border text-cobalt flex items-center justify-center font-bold tracking-wider shrink-0 select-none shadow-2xs`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

/**
 * StarRating Component: displays 1 to 5 filled stars
 */
function StarRating({ rating = 5, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1" aria-label={`Rating: ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((starVal) => {
        const isFilled = starVal <= rating;
        return (
          <Star
            key={starVal}
            size={size}
            className={
              isFilled
                ? 'fill-amber-400 text-amber-400'
                : 'text-border-subtle fill-transparent'
            }
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export default function TestimonialsCarousel({ onSelectCourse }) {
  const [testimonials, setTestimonials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const touchStartXRef = useRef(null);

  // Load real student reviews from the database
  useEffect(() => {
    let isMounted = true;

    async function loadTestimonials() {
      try {
        setLoading(true);
        const data = await reviewService.getTestimonials({ limit: 12 });
        if (isMounted && data && Array.isArray(data.testimonials)) {
          setTestimonials(data.testimonials);
        }
      } catch (err) {
        console.warn('Testimonials could not be loaded from API, falling back to empty state:', err.message);
        if (isMounted) setTestimonials([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTestimonials();

    return () => {
      isMounted = false;
    };
  }, []);

  const count = testimonials.length;

  // Deriving pause state: paused strictly on hover or keyboard focus
  const isPaused = isHovered || isFocused;

  // Autoplay effect: advance every 6.0 seconds when not paused and when 2+ reviews exist
  useEffect(() => {
    if (isPaused || count <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, 6000);

    return () => clearInterval(timer);
  }, [isPaused, resetKey, count]);

  const handlePrev = (e) => {
    e?.currentTarget?.blur();
    setIsFocused(false);
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + count) % count);
    setResetKey((k) => k + 1);
  };

  const handleNext = (e) => {
    e?.currentTarget?.blur();
    setIsFocused(false);
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % count);
    setResetKey((k) => k + 1);
  };

  const goToSlide = (idx, e) => {
    e?.currentTarget?.blur();
    setIsFocused(false);
    if (idx === currentIndex) {
      setResetKey((k) => k + 1);
      return;
    }
    setCurrentIndex(idx);
    setResetKey((k) => k + 1);
  };

  // Keyboard navigation on carousel container
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (diff > 50) {
      handlePrev();
    } else if (diff < -50) {
      handleNext();
    }
    touchStartXRef.current = null;
  };

  // Helper to format date
  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Left and Right neighbor indices for desktop 3-card presentation
  const prevIndex = (currentIndex - 1 + count) % count;
  const nextIndex = (currentIndex + 1) % count;

  return (
    <section
      id="testimonials"
      className="py-10 sm:py-12 lg:py-16 border-t border-border-subtle bg-surface-subtle/50 relative scroll-mt-20 overflow-hidden"
      aria-label="Student Testimonials"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={(e) => {
        if (e.target?.matches?.(':focus-visible')) setIsFocused(true);
      }}
      onBlurCapture={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        {/* ========================================================= */}
        {/* TOP EDITORIAL HEADER                                      */}
        {/* ========================================================= */}
        <Reveal triggerOnMount delayMs={0}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 sm:pb-6 border-b border-border-subtle">
            <div className="max-w-2xl">
              {/* Eyebrow Label */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cobalt-soft border border-cobalt-border text-[11px] font-bold uppercase tracking-wider text-cobalt mb-2.5 shadow-2xs">
                <Sparkles size={11} strokeWidth={1.75} className="text-cobalt animate-sparkle" />
                <span>Real Student Stories</span>
              </div>

              {/* Headline */}
              <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight text-primary leading-snug">
                Loved by learners advancing real careers.
              </h2>

              {/* Supporting Statement */}
              <p className="text-xs sm:text-sm text-secondary mt-1.5 leading-relaxed max-w-xl">
                Discover genuine reviews from enrolled students completing structured modules, interactive labs, and verified certifications.
              </p>
            </div>

            {/* Desktop Carousel Controls */}
            {count > 1 && (
              <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-mono font-semibold text-secondary mr-1">
                  {String(currentIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-secondary hover:text-primary hover:border-cobalt hover:bg-surface-elevated transition-all shadow-2xs hover-lift focus:outline-none focus:ring-2 focus:ring-cobalt"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-secondary hover:text-primary hover:border-cobalt hover:bg-surface-elevated transition-all shadow-2xs hover-lift focus:outline-none focus:ring-2 focus:ring-cobalt"
                  aria-label="Next testimonial"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </Reveal>

        {/* ========================================================= */}
        {/* CAROUSEL BODY                                             */}
        {/* ========================================================= */}
        <div className="my-6 sm:my-8 relative">
          {loading ? (
            /* Loading Skeleton State */
            <div className="max-w-[510px] mx-auto p-5 sm:p-6 rounded-xl bg-surface border border-border-subtle shadow-xs animate-pulse space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-24 bg-surface-subtle rounded-md" />
                <div className="h-4 w-20 bg-surface-subtle rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-surface-subtle rounded-md" />
              <div className="h-4 w-1/2 bg-surface-subtle rounded-md" />
              <div className="flex items-center gap-2.5 pt-3 border-t border-border-subtle">
                <div className="w-8 h-8 bg-surface-subtle rounded-full" />
                <div className="space-y-1">
                  <div className="h-3.5 w-24 bg-surface-subtle rounded-md" />
                  <div className="h-2.5 w-16 bg-surface-subtle rounded-md" />
                </div>
              </div>
            </div>
          ) : count === 0 ? (
            /* Tasteful Authentic Empty State */
            <div className="text-center py-8 px-5 rounded-xl bg-surface border border-border-subtle max-w-md mx-auto shadow-xs">
              <div className="w-10 h-10 rounded-full bg-cobalt-soft border border-cobalt-border text-cobalt flex items-center justify-center mx-auto mb-3">
                <MessageSquareQuote size={20} />
              </div>
              <h3 className="text-base font-bold text-primary mb-1">Authentic Student Stories</h3>
              <p className="text-xs sm:text-sm text-secondary">
                Verified student course reviews and testimonials will appear here as enrolled learners complete their coursework and share their feedback.
              </p>
            </div>
          ) : (
            /* Active 3-Card Center-Focused Presentation */
            <div className="relative">
              <div className="flex items-center justify-center gap-3 lg:gap-4">
                {/* Left Peek Neighbor Card (Visible on desktop when count >= 3) */}
                {count >= 3 && (
                  <div
                    onClick={() => goToSlide(prevIndex)}
                    className="hidden lg:block w-[220px] xl:w-[240px] shrink-0 p-4 rounded-xl bg-surface/75 border border-border-subtle/80 opacity-40 hover:opacity-75 transition-all duration-300 scale-95 cursor-pointer select-none filter blur-[0.5px] hover:blur-none shadow-2xs"
                    aria-hidden="true"
                  >
                    <div className="flex justify-between items-center mb-2.5">
                      <StarRating rating={testimonials[prevIndex].rating} size={12} />
                    </div>
                    <p className="text-xs text-secondary italic line-clamp-3 mb-3 leading-relaxed">
                      &ldquo;{testimonials[prevIndex].reviewText}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 pt-2.5 border-t border-border-subtle/60">
                      <AvatarWithFallback
                        name={testimonials[prevIndex].student?.name}
                        avatarUrl={testimonials[prevIndex].student?.avatar}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-[11px] font-bold text-primary truncate">
                          {testimonials[prevIndex].student?.name}
                        </p>
                        <p className="text-[10px] text-tertiary truncate">
                          {testimonials[prevIndex].course?.title || 'Verified Learner'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Active Centered Card */}
                {testimonials[currentIndex] && (
                  <div
                    className="w-full max-w-md sm:max-w-lg lg:max-w-[510px] bg-surface rounded-xl p-5 sm:p-6 border border-cobalt-border shadow-md shadow-cobalt/10 ring-1 ring-focus-ring/30 relative transition-all duration-300 z-10"
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Testimonial ${currentIndex + 1} of ${count}`}
                  >
                    {/* Top Row: Stars, Completion Badge & Quote Watermark */}
                    <div className="flex items-center justify-between gap-3 mb-3.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <StarRating rating={testimonials[currentIndex].rating} size={14} />
                        {testimonials[currentIndex].student?.isCourseCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cobalt bg-cobalt-soft border border-cobalt-border px-2 py-0.5 rounded-full shadow-2xs">
                            <CheckCircle2 size={11} className="text-cobalt shrink-0" />
                            Verified Graduate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-secondary bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded-full">
                            Verified Student
                          </span>
                        )}
                      </div>

                      <Quote
                        size={22}
                        className="text-cobalt/30 shrink-0 select-none"
                        aria-hidden="true"
                      />
                    </div>

                    {/* Middle: Review Quote Body */}
                    <div className="mb-4 sm:mb-5">
                      <p className="text-sm sm:text-[15px] text-primary font-medium italic leading-relaxed sm:leading-relaxed">
                        &ldquo;{testimonials[currentIndex].reviewText}&rdquo;
                      </p>
                    </div>

                    {/* Bottom Row: Student Profile & Course Metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-border-subtle">
                      {/* Student Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarWithFallback
                          name={testimonials[currentIndex].student?.name}
                          avatarUrl={testimonials[currentIndex].student?.avatar}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-primary leading-tight truncate max-w-[140px] sm:max-w-[180px]">
                            {testimonials[currentIndex].student?.name || 'Verified Student'}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-secondary mt-0.5">
                            <span className="capitalize">
                              {testimonials[currentIndex].student?.role || 'Learner'}
                            </span>
                            {testimonials[currentIndex].createdAt && (
                              <>
                                <span>&bull;</span>
                                <span className="whitespace-nowrap">{formatDate(testimonials[currentIndex].createdAt)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Course Pill */}
                      {testimonials[currentIndex].course && (
                        <div className="shrink-0 max-w-full sm:max-w-[200px]">
                          {onSelectCourse ? (
                            <button
                              type="button"
                              onClick={() => onSelectCourse(testimonials[currentIndex].course)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-elevated border border-border-subtle text-[11px] font-semibold text-secondary hover:text-primary transition-all group cursor-pointer max-w-full"
                              title={`View ${testimonials[currentIndex].course.title}`}
                            >
                              <BookOpen size={12} className="text-secondary group-hover:text-primary shrink-0" />
                              <span className="truncate">{testimonials[currentIndex].course.title}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle border border-border-subtle text-[11px] font-medium text-secondary max-w-full">
                              <BookOpen size={12} className="text-secondary shrink-0" />
                              <span className="truncate">{testimonials[currentIndex].course.title}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Right Peek Neighbor Card (Visible on desktop when count >= 3) */}
                {count >= 3 && (
                  <div
                    onClick={() => goToSlide(nextIndex)}
                    className="hidden lg:block w-[220px] xl:w-[240px] shrink-0 p-4 rounded-xl bg-surface/75 border border-border-subtle/80 opacity-40 hover:opacity-75 transition-all duration-300 scale-95 cursor-pointer select-none filter blur-[0.5px] hover:blur-none shadow-2xs"
                    aria-hidden="true"
                  >
                    <div className="flex justify-between items-center mb-2.5">
                      <StarRating rating={testimonials[nextIndex].rating} size={12} />
                    </div>
                    <p className="text-xs text-secondary italic line-clamp-3 mb-3 leading-relaxed">
                      &ldquo;{testimonials[nextIndex].reviewText}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 pt-2.5 border-t border-border-subtle/60">
                      <AvatarWithFallback
                        name={testimonials[nextIndex].student?.name}
                        avatarUrl={testimonials[nextIndex].student?.avatar}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-[11px] font-bold text-primary truncate">
                          {testimonials[nextIndex].student?.name}
                        </p>
                        <p className="text-[10px] text-tertiary truncate">
                          {testimonials[nextIndex].course?.title || 'Verified Learner'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Arrow Controls (shown below card on small screens) */}
              {count > 1 && (
                <div className="flex sm:hidden items-center justify-between mt-4 px-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-secondary hover:text-primary transition-all shadow-2xs"
                    aria-label="Previous testimonial"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-mono font-semibold text-secondary">
                    {String(currentIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-secondary hover:text-primary transition-all shadow-2xs"
                    aria-label="Next testimonial"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Pagination Dots / Indicators */}
              {count > 1 && (
                <div
                  className="flex items-center justify-center gap-1.5 mt-5 sm:mt-6"
                  role="tablist"
                  aria-label="Testimonial slides"
                >
                  {testimonials.map((_, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`Go to testimonial ${idx + 1}`}
                        onClick={(e) => goToSlide(idx, e)}
                        className={`h-1.5 transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-cobalt ${
                          isActive
                            ? 'w-6 bg-cobalt'
                            : 'w-1.5 bg-border-subtle hover:bg-secondary/40'
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
