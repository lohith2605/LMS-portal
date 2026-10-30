import React, { useEffect, useRef, useState } from 'react';

/**
 * Reveal component that animates its children into view (fade + rise: opacity 0 -> 1, translateY 12px -> 0)
 * either immediately on mount or when scrolled into view via IntersectionObserver.
 *
 * @param {number} delayMs - Stagger delay in milliseconds (e.g. 60ms * index)
 * @param {boolean} triggerOnMount - If true, triggers immediately without waiting for scroll
 * @param {string} className - Additional CSS classes
 */
export default function Reveal({
  children,
  delayMs = 0,
  triggerOnMount = false,
  className = '',
  as: Component = 'div',
  ...props
}) {
  const [isVisible, setIsVisible] = useState(triggerOnMount);
  const elementRef = useRef(null);

  useEffect(() => {
    if (triggerOnMount) {
      setIsVisible(true);
      return;
    }

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '40px' }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [triggerOnMount]);

  return (
    <Component
      ref={elementRef}
      className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-3'
      } ${className}`}
      style={{
        transitionDelay: `${delayMs}ms`,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
