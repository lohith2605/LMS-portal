import React from 'react';

/**
 * Reusable IconChip component matching LearnSpace's minimal, warm design system.
 * Stroke width: 1.75 across all icons.
 * Sits in a rounded chip: 40x40 / 44x44, radius 12, theme tokens.
 *
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {'neutral'|'accent'|'success'|'warning'|'danger'} tone - Semantic color tone
 * @param {'sm'|'md'|'lg'} size - Chip size (sm: 32px, md: 40px, lg: 44px)
 * @param {boolean} animate - Micro-interaction on hover / mount
 * @param {string} className - Additional CSS classes
 */
export default function IconChip({
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  animate = false,
  className = '',
  ...props
}) {
  if (!Icon) return null;

  const toneStyles = {
    neutral: 'bg-surface-subtle text-primary border-border-subtle',
    accent: 'bg-accent-subtle text-accent border-accent/30',
    success: 'bg-[var(--badge-success-bg)] text-[var(--success)] border-[var(--success)]/25',
    warning: 'bg-[var(--banner-warning-bg)] text-[var(--warning)] border-[var(--warning)]/30',
    danger: 'bg-[var(--badge-danger-bg)] text-[var(--danger)] border-[var(--danger)]/25',
  };

  const sizeStyles = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl', // 40x40, radius 12
    lg: 'w-11 h-11 rounded-xl', // 44x44, radius 12
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const animationClasses = animate
    ? 'transition-all duration-250 ease-out group-hover:scale-105 group-hover:rotate-1 animate-icon-pop'
    : 'transition-all duration-200 ease-out';

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 border shadow-2xs ${
        sizeStyles[size] || sizeStyles.md
      } ${toneStyles[tone] || toneStyles.neutral} ${animationClasses} ${className}`}
      {...props}
    >
      <Icon
        size={iconSizes[size] || 20}
        strokeWidth={1.75}
        aria-hidden="true"
        className="shrink-0"
      />
    </div>
  );
}
