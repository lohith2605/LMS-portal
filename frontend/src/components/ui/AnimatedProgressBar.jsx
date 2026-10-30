import React, { useEffect, useState } from 'react';

/**
 * AnimatedProgressBar component
 * Animates width from 0% to target percentage on entrance (700ms ease-out)
 * with an optional soft shimmer sweep while in progress.
 */
export default function AnimatedProgressBar({
  progress = 0,
  inProgress = true,
  height = 'h-2',
  colorClass = 'bg-accent',
  trackClass = 'bg-border-subtle',
  ariaLabel = 'Progress bar',
  className = '',
}) {
  const [currentWidth, setCurrentWidth] = useState(0);

  useEffect(() => {
    // Check reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrentWidth(progress);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentWidth(progress);
    }, 50);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div
      className={`w-full ${height} ${trackClass} rounded-full overflow-hidden relative ${className}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] relative overflow-hidden`}
        style={{ width: `${Math.min(100, Math.max(0, currentWidth))}%` }}
      >
        {/* Soft shimmer sweep animation */}
        {inProgress && progress > 0 && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full animate-shimmer"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
