import React, { useState, useEffect, useCallback } from 'react';
import { Flame, RefreshCw, AlertCircle, Globe } from 'lucide-react';
import { learningActivityService } from '../../../services/api';
import LearningStreakHero from './LearningStreakHero';
import SupportingStatsRow from './SupportingStatsRow';
import WeeklyActivityChart from './WeeklyActivityChart';
import MonthlyActivityCalendar from './MonthlyActivityCalendar';
import StreakMilestones from './StreakMilestones';

export default function LearningStreakSection({ user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const timezone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  const fetchSummary = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await learningActivityService.getSummary(timezone);
      setSummary(res || null);
    } catch (err) {
      setError(err?.normalizedMessage || 'Unable to load your learning activity summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timezone]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <section className="space-y-6" aria-label="Learning Consistency and Streaks">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
              <Flame size={15} className="fill-amber-500" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">
              Study Streaks & Active Learning Time
            </h2>
          </div>
          <p className="text-xs text-secondary mt-1">
            Build a lasting learning habit with daily activity tracking, streaks, and milestone achievements
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {summary?.timezone && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] text-tertiary">
              <Globe size={11} className="text-secondary" />
              <span>{summary.timezone}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchSummary(true)}
            disabled={loading || refreshing}
            aria-label="Refresh Learning Summary"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-xs font-semibold text-primary transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin text-cobalt' : 'text-secondary'} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchSummary(false)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 1. Visual Anchor: Learning Streak Hero */}
      <LearningStreakHero summary={summary} loading={loading} />

      {/* 2. Supporting Statistics Row (4 compact metrics, no current streak duplication) */}
      <SupportingStatsRow summary={summary} loading={loading} />

      {/* 3. Lower Section: 2-column layout with Weekly Activity + Milestones on left, Monthly Heatmap on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <WeeklyActivityChart
            dailySummaries={summary?.dailySummaries || []}
            weekStudySeconds={summary?.weekStudySeconds || 0}
          />

          <StreakMilestones
            currentStreak={summary?.currentStreak || 0}
            todayQualified={Boolean(summary?.todayQualified)}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <MonthlyActivityCalendar timezone={timezone} />
        </div>
      </div>
    </section>
  );
}
