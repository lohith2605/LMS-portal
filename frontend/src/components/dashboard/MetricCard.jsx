import React from 'react';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeType = 'default',
  className = '',
  onClick,
}) {
  const badgeStyles = {
    sage: 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0]/40',
    blue: 'bg-accent-blue-pale text-accent-blue-dark border-[#637D91]/30',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    default: 'bg-surface-subtle text-secondary border-border-subtle',
  };

  const CardWrapper = onClick ? 'button' : 'div';

  return (
    <CardWrapper
      onClick={onClick}
      className={`text-left bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs hover:border-border-medium transition-all ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-primary">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
          {value}
        </span>
        {badge && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              badgeStyles[badgeType] || badgeStyles.default
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-secondary mt-1.5 leading-relaxed truncate">
          {subtitle}
        </p>
      )}
    </CardWrapper>
  );
}
