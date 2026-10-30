import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Failed to load workspace data',
  message = 'An unexpected network error occurred while fetching information.',
  onRetry,
}) {
  return (
    <div className="bg-surface border border-red-200/80 rounded-2xl p-8 sm:p-10 text-center shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={22} />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-primary mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-secondary max-w-md mx-auto leading-relaxed mb-6">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
}
