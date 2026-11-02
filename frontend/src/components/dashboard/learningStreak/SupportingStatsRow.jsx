import React from 'react';
import { Clock, BarChart3, Trophy, CheckCircle2 } from 'lucide-react';
import { formatStudyDuration } from './streakFormatters';

export default function SupportingStatsRow({ summary, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-xs animate-pulse space-y-2.5"
          >
            <div className="w-16 h-3 bg-slate-100 rounded-md" />
            <div className="w-24 h-7 bg-slate-100 rounded-lg" />
            <div className="w-28 h-2.5 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  const todayStudySeconds = summary?.todayStudySeconds ?? 0;
  const weekStudySeconds = summary?.weekStudySeconds ?? 0;
  const longestStreak = summary?.longestStreak ?? 0;
  const todayQualified = Boolean(summary?.todayQualified);
  const todayQualifyingCount = summary?.todayQualifyingCount ?? (todayQualified ? 1 : 0);

  const stats = [
    {
      id: 'today-study',
      label: 'Study Time Today',
      value: formatStudyDuration(todayStudySeconds),
      subtitle: todayStudySeconds > 0 ? 'Verified active learning' : 'No study logged yet',
      icon: Clock,
      iconClass: 'bg-cobalt-soft text-cobalt border border-cobalt-border/50',
    },
    {
      id: 'week-study',
      label: 'Study This Week',
      value: formatStudyDuration(weekStudySeconds),
      subtitle: 'Verified weekly volume',
      icon: BarChart3,
      iconClass: 'bg-cobalt-soft text-cobalt border border-cobalt-border/50',
    },
    {
      id: 'longest-streak',
      label: 'Longest Streak',
      value: `${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`,
      subtitle: 'Personal best all-time',
      icon: Trophy,
      iconClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    },
    {
      id: 'today-completed',
      label: 'Completed Today',
      value: `${todayQualifyingCount} ${todayQualifyingCount === 1 ? 'activity' : 'activities'}`,
      subtitle: todayQualifyingCount > 0 ? 'Streak criteria satisfied' : '1 lesson to qualify',
      icon: CheckCircle2,
      iconClass: todayQualifyingCount > 0
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-surface-subtle text-secondary border border-border-subtle',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className="bg-white border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-border-medium transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary truncate">
                {stat.label}
              </span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${stat.iconClass}`}>
                <Icon size={14} />
              </div>
            </div>

            <div className="my-1">
              <div className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                {stat.value}
              </div>
            </div>

            <p className="text-[11px] text-tertiary truncate">
              {stat.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}

