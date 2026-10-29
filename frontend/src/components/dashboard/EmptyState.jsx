import React from 'react';
import { Link } from 'react-router-dom';
import IconChip from '../ui/IconChip';

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
      className={`bg-surface border border-border-subtle rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xs ${className}`}
    >
      {Icon && (
        <div className="mb-4 animate-float-slow">
          <IconChip
            icon={Icon}
            tone="neutral"
            size="lg"
            className="w-14 h-14 rounded-2xl shadow-xs"
          />
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
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-neutral-800 hover-lift btn-press transition-all"
              >
                {actionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-neutral-800 hover-lift btn-press transition-all cursor-pointer"
              >
                {actionLabel}
              </button>
            )
          )}

          {secondaryActionLabel && (
            secondaryHref ? (
              <Link
                to={secondaryHref}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold hover-lift btn-press transition-all"
              >
                {secondaryActionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold hover-lift btn-press transition-all cursor-pointer"
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

