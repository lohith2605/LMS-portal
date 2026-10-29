import React from 'react';

export default function LoadingState({
  message = 'Loading workspace data...',
  cardsCount = 3,
}) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="w-32 h-4 bg-surface-subtle rounded-md" />
        <div className="w-64 h-8 bg-surface-subtle rounded-lg" />
        <div className="w-96 max-w-full h-4 bg-surface-subtle rounded-md" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cardsCount} gap-4`}>
        {Array.from({ length: cardsCount }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-xs"
          >
            <div className="flex justify-between items-center">
              <div className="w-24 h-3 bg-surface-subtle rounded" />
              <div className="w-6 h-6 bg-surface-subtle rounded-lg" />
            </div>
            <div className="w-16 h-7 bg-surface-subtle rounded" />
            <div className="w-36 h-3 bg-surface-subtle rounded" />
          </div>
        ))}
      </div>

      {/* Content Area Skeleton */}
      <div className="bg-surface border border-border-subtle rounded-2xl p-8 space-y-4 shadow-xs flex flex-col items-center justify-center min-h-[180px]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
        <p className="text-xs font-semibold text-secondary">{message}</p>
      </div>
    </div>
  );
}
