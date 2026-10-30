import React from 'react';
import { Link } from 'react-router-dom';

/**
 * LearnSpace Purpose-Driven Educational Emblem
 * Combines an Academic Graduation Cap (achievement, credentials, graduation)
 * atop an Open Book of Knowledge (curriculum, courses, structured learning).
 * 100% theme-aware using CSS tokens.
 */
export function LearnSpaceLogoIcon({ className = 'w-5 h-5', animate = true }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Academic Graduation Cap (Achievement & Credentials) */}
      <path
        d="M12 3.2L21.5 7.6L12 12L2.5 7.6L12 3.2Z"
        fill="currentColor"
        className={animate ? 'transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transform-none' : ''}
      />
      {/* Cap Skullcap Arch */}
      <path
        d="M6 9.8V12.8C6 14.5 8.7 15.6 12 15.6C15.3 15.6 18 14.5 18 12.8V9.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Tassel cord with swinging animation on hover */}
      <path
        d="M19.8 8.8V13.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className={animate ? 'origin-top transition-transform duration-300 ease-out group-hover:rotate-12 motion-reduce:transform-none' : ''}
      />
      <circle cx="19.8" cy="14.4" r="0.8" fill="currentColor" />

      {/* Open Book of Knowledge (Foundation & Curriculum) */}
      <path
        d="M3.8 17.5C6.3 16.3 9.2 16.5 11.5 17.8V21.4C9.2 20.1 6.3 19.9 3.8 21.1V17.5Z"
        fill="currentColor"
        opacity="0.9"
        className={animate ? 'transition-opacity duration-300 group-hover:opacity-100' : ''}
      />
      <path
        d="M12.5 17.8C14.8 16.5 17.7 16.3 20.2 17.5V21.1C17.7 19.9 14.8 20.1 12.5 21.4V17.8Z"
        fill="currentColor"
        opacity="0.75"
        className={animate ? 'transition-opacity duration-300 group-hover:opacity-90' : ''}
      />
      {/* Book Spine */}
      <line
        x1="12"
        y1="17.2"
        x2="12"
        y2="21.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Reusable BrandLogo component with purpose-driven icon mark
 * and kinetic slide animation on the project name when hovering over the logo.
 */
export default function BrandLogo({
  to = '/',
  brandName = 'LearnSpace',
  badge,
  subtitle,
  size = 'md',
  onClick,
  className = '',
  ariaLabel,
}) {
  const sizeMap = {
    sm: {
      chip: 'w-7 h-7 rounded-lg p-1',
      icon: 'w-4 h-4',
      title: 'text-sm font-extrabold',
      gap: 'gap-2.5',
    },
    md: {
      chip: 'w-[34px] h-[34px] sm:w-9 sm:h-9 rounded-xl p-1.5',
      icon: 'w-[18px] h-[18px] sm:w-5 sm:h-5',
      title: 'text-base sm:text-lg font-extrabold',
      gap: 'gap-3',
    },
    lg: {
      chip: 'w-11 h-11 rounded-2xl p-2.5',
      icon: 'w-6 h-6',
      title: 'text-xl font-extrabold',
      gap: 'gap-3.5',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Split "LearnSpace" into "Learn" and "Space" for kinetic staggered slide effect
  const isLearnSpace = brandName === 'LearnSpace';
  const prefix = isLearnSpace ? 'Learn' : brandName;
  const suffix = isLearnSpace ? 'Space' : '';

  const content = (
    <div
      className={`group inline-flex items-center ${currentSize.gap} no-underline cursor-pointer select-none ${className}`}
    >
      {/* Purpose-driven Logo Icon Chip */}
      <div
        className={`${currentSize.chip} bg-primary text-[var(--btn-primary-text)] border border-border-subtle/30 shadow-xs flex items-center justify-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:shadow-sm`}
        aria-hidden="true"
      >
        <LearnSpaceLogoIcon className={currentSize.icon} animate />
      </div>

      {/* Brand Title with Slide Animation on Hover */}
      <div className="flex flex-col justify-center">
        <div
          className={`flex items-center tracking-tight text-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2 motion-reduce:transform-none ${currentSize.title}`}
        >
          <span className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">
            {prefix}
          </span>
          {suffix && (
            <span className="transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-hover:text-accent">
              {suffix}
            </span>
          )}
        </div>

        {subtitle && (
          <span className="text-[10px] text-secondary font-medium tracking-wide transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5 motion-reduce:transform-none">
            {subtitle}
          </span>
        )}
      </div>

      {/* Optional Badge (e.g. "Platform", role badge, etc.) */}
      {badge && (
        <div className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2 motion-reduce:transform-none">
          {typeof badge === 'string' ? (
            <span className="text-[11px] font-semibold uppercase tracking-wider px-[7px] py-[2px] rounded-full bg-accent-sage-pale text-accent-sage-dark border border-accent-sage-soft/30">
              {badge}
            </span>
          ) : (
            badge
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="no-underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4 rounded-xl"
        aria-label={ariaLabel || `${brandName} Home`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel || brandName}
    >
      {content}
    </div>
  );
}
