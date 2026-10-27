import React from 'react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryHref,
  className = '',
}) {
  return (
    <div
      className={`bg-white border border-border-subtle rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xs ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary mb-4">
          <Icon size={22} />
        </div>
      )}

      <h3 className="text-base sm:text-lg font-bold text-primary mb-1.5">
        {title}
      </h3>

      {description && (
        <p className="text-xs sm:text-sm text-secondary max-w-md mx-auto leading-relaxed mb-6">
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            actionHref ? (
              <Link
                to={actionHref}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all"
              >
                {actionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer"
              >
                {actionLabel}
              </button>
            )
          )}

          {secondaryActionLabel && (
            secondaryHref ? (
              <Link
                to={secondaryHref}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition-all"
              >
                {secondaryActionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition-all cursor-pointer"
              >
                {secondaryActionLabel}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
