import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { learningActivityService } from '../../../services/api';
import LearningStreakHero from './LearningStreakHero';
import SupportingStatsRow from './SupportingStatsRow';
import WeeklyActivityChart from './WeeklyActivityChart';
import MonthlyActivityCalendar from './MonthlyActivityCalendar';
import StreakMilestones from './StreakMilestones';

export default function LearningStreakSection({ user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timezone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await learningActivityService.getSummary(timezone);
      setSummary(res || null);
    } catch (err) {
      setError(err?.normalizedMessage || 'Unable to load your learning activity summary.');
    } finally {
      setLoading(false);
    }
  }, [timezone]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <section className="space-y-6" aria-label="Learning Consistency and Streaks">
      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchSummary}
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
