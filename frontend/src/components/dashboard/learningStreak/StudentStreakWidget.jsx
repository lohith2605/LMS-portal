import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, CheckCircle2, Sparkles } from 'lucide-react';
import { learningActivityService } from '../../../services/api';

/**
 * Interactive Student Learning Streak Flame Widget
 *
 * Sits inside the student dashboard welcome banner.
 * Displays a muted gray flame until the daily learning goal is satisfied,
 * transitioning to vibrant warm orange once qualified for the day's streak.
 */
export default function StudentStreakWidget({
  timezone,
  onNavigate,
  className = '',
}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCelebrating, setIsCelebrating] = useState(false);

  // Store previous qualified state to detect in-session qualification transitions
  const prevQualifiedRef = useRef(null);

  const resolvedTz =
    timezone ||
    (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    'Asia/Kolkata';

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const res = await learningActivityService.getSummary(resolvedTz);
      if (res) {
        setSummary(res);

        const isTodayQualified = Boolean(res.todayQualified || res.isGoalCompleted);

        // Detect in-session transition from incomplete -> complete
        if (
          prevQualifiedRef.current === false &&
          isTodayQualified === true
        ) {
          const todayKey = res.lastQualifiedDate || new Date().toISOString().slice(0, 10);
          const storageKey = `learnspace_celebrated_streak_${todayKey}`;
          const alreadyCelebrated = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey);

          if (!alreadyCelebrated) {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(storageKey, 'true');
            }
            setIsCelebrating(true);
            setTimeout(() => {
              setIsCelebrating(false);
            }, 2500);
          }
        }

        prevQualifiedRef.current = isTodayQualified;
      }
    } catch (err) {
      setError(err?.normalizedMessage || 'Unable to load streak.');
    } finally {
      setLoading(false);
    }
  }, [resolvedTz]);

  useEffect(() => {
    fetchSummary();

    // Listen for custom activity update events (e.g. after lesson completion or heartbeat)
    const handleActivityUpdated = () => {
      fetchSummary();
    };

    // Re-fetch when tab returns to focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSummary();
      }
    };

    window.addEventListener('learnspace:activity-updated', handleActivityUpdated);
    window.addEventListener('focus', handleActivityUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('learnspace:activity-updated', handleActivityUpdated);
      window.removeEventListener('focus', handleActivityUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSummary]);

  // Loading skeleton state
  if (loading) {
    return (
      <div
        className={`bg-white/95 border border-border-subtle rounded-2xl p-3 sm:px-4 sm:py-3 shadow-xs animate-pulse flex items-center gap-3 w-full sm:w-auto min-w-0 sm:min-w-[230px] ${className}`}
        aria-hidden="true"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="w-16 h-4 bg-slate-100 rounded" />
          <div className="w-28 h-2.5 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  // Error fallback
  if (error && !summary) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onNavigate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate?.();
          }
        }}
        title="View learning progress and streak history"
        className={`group bg-white/95 border border-border-subtle hover:border-border-medium rounded-2xl p-3 sm:px-4 sm:py-3 shadow-xs flex items-center gap-3 cursor-pointer transition ${className}`}
      >
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 border border-slate-200/80 flex items-center justify-center shrink-0">
          <Flame size={18} className="fill-slate-300" />
        </div>
        <div>
          <div className="text-xs font-bold text-primary">Daily Streak</div>
          <div className="text-[11px] text-secondary">View learning progress &rarr;</div>
        </div>
      </div>
    );
  }

  const currentStreak = summary?.currentStreak ?? 0;
  const todayStudySeconds = summary?.todayStudySeconds ?? 0;
  const dailyGoalSeconds = summary?.dailyGoalSeconds ?? 900; // 15 mins
  const dailyGoalMinutes = summary?.dailyGoalMinutes ?? Math.round(dailyGoalSeconds / 60);
  const todayStudyMinutes = Math.floor(todayStudySeconds / 60);

  const isTodayQualified = Boolean(summary?.todayQualified || summary?.isGoalCompleted);

  // Compute goal progress percentage
  const goalProgressPct = Math.min(100, Math.round((todayStudySeconds / dailyGoalSeconds) * 100));

  // Determine label and accessible description
  let statusText = '';
  let subText = '';

  if (isTodayQualified) {
    statusText = 'Streak secured for today';
    subText = 'Streak secured for today!';
  } else if (todayStudyMinutes > 0) {
    statusText = `${todayStudyMinutes} of ${dailyGoalMinutes} minutes completed today`;
    subText = `${todayStudyMinutes} / ${dailyGoalMinutes} min today`;
  } else if (currentStreak === 0) {
    statusText = 'Start your first daily streak';
    subText = 'Start your first streak';
  } else {
    statusText = `Current streak is ${currentStreak} days. Complete today's learning goal.`;
    subText = "Complete today's learning goal";
  }

  const accessibleLabel = `Current learning streak: ${currentStreak} ${
    currentStreak === 1 ? 'day' : 'days'
  }. ${statusText}. Click to view learning progress.`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate?.();
        }
      }}
      aria-label={accessibleLabel}
      title="Click to view learning progress and streak history"
      className={`group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-cobalt/40 rounded-2xl bg-white border transition-all duration-300 p-3 sm:px-4 sm:py-3 shadow-xs hover:shadow-card hover:border-border-medium hover-lift select-none w-full sm:w-auto min-w-0 sm:min-w-[230px] ${
        isTodayQualified
          ? 'border-amber-200/80 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30'
          : 'border-border-subtle'
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        {/* Flame Bubble */}
        <div
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 ${
            isTodayQualified
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-500 border-amber-200/80 shadow-xs shadow-amber-500/10'
              : 'bg-slate-100 text-slate-400 border-slate-200/80'
          }`}
        >
          {/* Flame Icon */}
          <Flame
            size={20}
            strokeWidth={1.8}
            className={`transition-all duration-500 ${
              isTodayQualified
                ? 'text-amber-500 fill-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)] motion-safe:animate-pulse'
                : 'text-slate-400 fill-slate-300/80'
            }`}
          />

          {/* Celebratory Sparks on first qualification */}
          {isCelebrating && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 text-amber-500 animate-bounce motion-reduce:hidden"
            >
              <Sparkles size={12} className="fill-amber-400 text-amber-500" />
            </span>
          )}
        </div>

        {/* Text and Metrics */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-primary leading-none">
                {currentStreak}
              </span>
              <span className="text-xs font-semibold text-secondary leading-none">
                {currentStreak === 1 ? 'day streak' : 'days streak'}
              </span>
            </div>

            {/* Locked-in Pill when qualified today */}
            {isTodayQualified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md leading-none">
                <CheckCircle2 size={10} className="text-emerald-600" />
                <span>Locked in</span>
              </span>
            )}
          </div>

          {/* Subtitle / Progress */}
          <div className="mt-1">
            <p className="text-[11px] text-secondary font-medium truncate leading-tight">
              {subText}
            </p>

            {/* Subtle Progress Bar when study in-progress but not completed yet */}
            {!isTodayQualified && todayStudyMinutes > 0 && (
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1.5 border border-slate-200/50">
                <div
                  className="bg-cobalt h-full rounded-full transition-all duration-500"
                  style={{ width: `${goalProgressPct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

