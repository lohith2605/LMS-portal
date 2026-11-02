import React from 'react';
import { Flame, CheckCircle2, Sparkles, Trophy } from 'lucide-react';
import { formatStudyDuration } from './streakFormatters';

const MILESTONES = [
  { target: 3, title: 'Spark Starter', label: '3d' },
  { target: 7, title: 'Consistency Champion', label: '7d' },
  { target: 14, title: 'Habit Builder', label: '14d' },
  { target: 30, title: 'Mastery Month', label: '30d' },
  { target: 100, title: 'Century Scholar', label: '100d' },
];

export default function LearningStreakHero({ summary, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs animate-pulse">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="w-28 h-6 bg-slate-100 rounded-full" />
            <div className="w-48 h-12 bg-slate-100 rounded-xl" />
            <div className="w-80 h-4 bg-slate-100 rounded-md" />
          </div>
          <div className="w-full lg:w-72 h-16 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const currentStreak = summary?.currentStreak ?? 0;
  const todayQualified = Boolean(summary?.todayQualified);
  const dailySummaries = Array.isArray(summary?.dailySummaries) ? summary.dailySummaries : [];

  // Next milestone calculation
  const nextMilestone = MILESTONES.find((m) => m.target > currentStreak) || null;
  const prevMilestoneTarget = [...MILESTONES].reverse().find((m) => m.target <= currentStreak)?.target || 0;
  const daysToNext = nextMilestone ? nextMilestone.target - currentStreak : 0;
  const milestoneProgress = nextMilestone
    ? Math.min(
        100,
        Math.max(
          5,
          Math.round(
            ((currentStreak - prevMilestoneTarget) / (nextMilestone.target - prevMilestoneTarget)) * 100
          )
        )
      )
    : 100;

  // Contextual encouragement
  const getContextualHeadline = () => {
    if (currentStreak === 0) {
      return 'Ignite your learning habit';
    }
    if (todayQualified) {
      if (currentStreak === 1) return 'Day 1 locked in! You are on the board.';
      if (currentStreak >= 30) return 'Unstoppable consistency!';
      if (currentStreak >= 7) return 'Magnificent momentum!';
      return 'Today is locked in!';
    }
    if (currentStreak > 0) {
      return `Keep your ${currentStreak}-day streak alive`;
    }
    return 'Daily Learning Consistency';
  };

  const getContextualMessage = () => {
    if (currentStreak === 0) {
      return 'Complete a lesson or study session today to start your first daily streak.';
    }
    if (todayQualified) {
      return `You have already satisfied today's streak requirement. Come back tomorrow to keep building toward your next goal.`;
    }
    return `Your streak is protected from yesterday. Study for at least a few minutes or complete a lesson today to extend it to ${currentStreak + 1} days!`;
  };

  return (
    <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
      {/* Decorative ambient tint in the corner */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 bg-cobalt-soft/50 rounded-full blur-3xl opacity-60"
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
        {/* Left: Main Streak Identity */}
        <div className="space-y-3 flex-1 min-w-0">
          {/* Top Status Capsule */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs ${
                todayQualified
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : currentStreak > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-surface-subtle text-secondary border-border-subtle'
              }`}
            >
              {todayQualified ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Streak Active Today</span>
                </>
              ) : currentStreak > 0 ? (
                <>
                  <Flame size={13} className="text-amber-500 fill-amber-500 animate-pulse" />
                  <span>Active • Ready for Today</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-tertiary" />
                  <span>Start Your Habit</span>
                </>
              )}
            </div>

            {nextMilestone && (
              <span className="text-[11px] font-semibold text-secondary hidden sm:inline-flex items-center gap-1">
                <Trophy size={12} className="text-amber-500" />
                <span>
                  {daysToNext} {daysToNext === 1 ? 'day' : 'days'} to {nextMilestone.title}
                </span>
              </span>
            )}
          </div>

          {/* Large Hero Streak Metric */}
          <div className="flex items-baseline gap-2.5 pt-0.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-500/5 text-amber-600 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Flame size={28} className={currentStreak > 0 ? 'fill-amber-500' : 'text-slate-400'} />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-primary tracking-tight">
                {currentStreak}
              </span>
              <span className="text-base sm:text-lg font-bold text-secondary">
                {currentStreak === 1 ? 'day streak' : 'days streak'}
              </span>
            </div>
          </div>

          {/* Contextual Guidance */}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-primary">
              {getContextualHeadline()}
            </h3>
            <p className="text-xs text-secondary mt-0.5 max-w-xl leading-relaxed">
              {getContextualMessage()}
            </p>
          </div>
        </div>

        {/* Right: Inline 7-Day Activity Capsule Row + Next Milestone Bar */}
        <div className="lg:w-80 shrink-0 bg-surface-subtle/70 border border-border-subtle rounded-2xl p-4 sm:p-4.5 space-y-3.5">
          {/* Header of the 7-day capsule */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-primary">This Week's Activity</span>
            <span className="font-medium text-tertiary">Mon – Sun</span>
          </div>

          {/* 7 Day Pills */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {dailySummaries.length > 0 ? (
              dailySummaries.map((day, idx) => {
                const isToday = Boolean(day.isToday);
                const hasQualifying = (day.qualifyingCount || 0) > 0;
                const hasStudy = (day.studySeconds || 0) > 0;

                return (
                  <div
                    key={day.date || day.day || idx}
                    className={`flex flex-col items-center justify-between py-2 rounded-xl transition-all ${
                      isToday
                        ? 'bg-cobalt text-white shadow-xs ring-2 ring-cobalt/30'
                        : hasQualifying
                        ? 'bg-white border border-emerald-200 text-emerald-800'
                        : hasStudy
                        ? 'bg-white border border-cobalt-border text-cobalt'
                        : 'bg-white/60 border border-border-subtle text-tertiary'
                    }`}
                    title={`${day.day}: ${day.studySeconds ? formatStudyDuration(day.studySeconds) : '0m'} active, ${
                      day.qualifyingCount || 0
                    } qualifying`}
                  >
                    <span
                      className={`text-[10px] font-bold ${
                        isToday ? 'text-white' : hasQualifying ? 'text-emerald-700' : 'text-secondary'
                      }`}
                    >
                      {day.day ? day.day.slice(0, 1) : '•'}
                    </span>

                    <div className="h-4 flex items-center justify-center my-0.5">
                      {hasQualifying ? (
                        <Flame
                          size={11}
                          className={isToday ? 'text-white fill-white' : 'text-amber-500 fill-amber-500'}
                        />
                      ) : hasStudy ? (
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-cobalt'}`}
                        />
                      ) : (
                        <div
                          className={`w-1 h-1 rounded-full ${isToday ? 'bg-white/60' : 'bg-slate-300'}`}
                        />
                      )}
                    </div>

                    <span
                      className={`text-[9px] font-mono leading-none ${
                        isToday ? 'text-white/90' : 'text-tertiary'
                      }`}
                    >
                      {day.date ? day.date.slice(8) : ''}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="col-span-7 py-2 text-center text-xs text-tertiary">
                No activity records for this week
              </div>
            )}
          </div>

          {/* Next milestone progress line */}
          {nextMilestone && (
            <div className="pt-2 border-t border-border-subtle/80 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-secondary">
                  Target: {nextMilestone.target} days ({nextMilestone.title})
                </span>
                <span className="font-bold text-cobalt">{daysToNext}d left</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cobalt transition-all duration-500"
                  style={{ width: `${milestoneProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
