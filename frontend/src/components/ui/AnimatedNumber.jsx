import React, { useEffect, useState } from 'react';

/**
 * AnimatedNumber component that counts smoothly from 0 to target value
 * over ~800ms using requestAnimationFrame with ease-out cubic-bezier.
 *
 * Honors prefers-reduced-motion and skips animation for zero.
 */
export default function AnimatedNumber({
  value = 0,
  duration = 800,
  className = '',
}) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(() => (numericValue === 0 ? 0 : 0));

  useEffect(() => {
    if (numericValue === 0) {
      setDisplayValue(0);
      return;
    }

    // Respect reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(numericValue);
      return;
    }

    let startTime = null;
    let animationFrameId = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: 1 - (1 - t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easeProgress * numericValue);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(numericValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [numericValue, duration]);

  // If original value had special suffix like "+" or "%"
  const suffix = typeof value === 'string' && isNaN(value) ? value.replace(/^[0-9.]+/, '') : '';

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}
