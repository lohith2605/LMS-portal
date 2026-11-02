import React, { useState, useEffect } from 'react';
import { Flame, ArrowRight, CheckCircle2 } from 'lucide-react';
import { learningActivityService } from '../../../services/api';

export default function OverviewStreakCard({ onNavigateToProgress, timezone }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

    learningActivityService
      .getSummary(tz)
      .then((res) => {
        if (isMounted) setSummary(res || null);
      })
      .catch(() => {
        // Quiet fallback; keep Overview resilient
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [timezone]);

  if (loading) {
    return (
      <div className="bg-white border border-border-subtle rounded-2xl p-3.5 sm:px-5 sm:py-3 shadow-xs animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-xl" />
          <div className="space-y-1.5">
            <div className="w-36 h-3 bg-slate-100 rounded-md" />
            <div className="w-48 h-2.5 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="w-28 h-7 bg-slate-100 rounded-xl hidden sm:block" />
      </div>
    );
  }

  const currentStreak = summary?.currentStreak ?? 0;
  const todayQualified = Boolean(summary?.todayQualified);

  return (
    <div className="bg-white border border-border-subtle rounded-2xl p-3.5 sm:px-5 sm:py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-medium transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${
            currentStreak > 0
              ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 text-amber-600 border-amber-500/25'
              : 'bg-surface-subtle text-secondary border-border-subtle'
          }`}
        >
          <Flame size={18} className={currentStreak > 0 ? 'fill-amber-500 text-amber-500' : 'text-slate-400'} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-primary">
              {currentStreak > 0
                ? `${currentStreak}-${currentStreak === 1 ? 'Day' : 'Day'} Learning Streak`
                : 'Daily Learning Habit'}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                todayQualified
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : currentStreak > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-surface-subtle text-secondary border-border-subtle'
              }`}
            >
              {todayQualified ? (
                <>
                  <CheckCircle2 size={10} className="text-emerald-600" />
                  <span>Active Today</span>
                </>
              ) : currentStreak > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Extend Today</span>
                </>
              ) : (
                <span>Start Habit</span>
              )}
            </span>
          </div>

          <p className="text-[11px] text-secondary mt-0.5 truncate">
            {todayQualified
              ? "Today's learning goal is satisfied. Keep up the great momentum!"
              : currentStreak > 0
              ? 'Streak is active from yesterday. Study or finish a lesson to extend it!'
              : 'Complete any lesson or study session today to start your streak.'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onNavigateToProgress}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-cobalt-soft hover:border-cobalt-border text-xs font-semibold text-primary hover:text-cobalt transition-all shadow-xs cursor-pointer group shrink-0 self-start sm:self-auto"
      >
        <span>View Learning Progress</span>
        <ArrowRight size={13} className="text-secondary group-hover:text-cobalt group-hover-nudge-x transition-all" />
      </button>
    </div>
  );
}

