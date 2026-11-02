import React from 'react';
import { Target, Check, Flame, Trophy, Sparkles } from 'lucide-react';

const MILESTONES = [
  { target: 3, title: 'Spark Starter', label: '3 Days', shortDesc: 'Habit kickstart' },
  { target: 7, title: 'Consistency Champion', label: '7 Days', shortDesc: 'One full week' },
  { target: 14, title: 'Habit Builder', label: '14 Days', shortDesc: 'Two weeks steady' },
  { target: 30, title: 'Mastery Month', label: '30 Days', shortDesc: 'One full month' },
  { target: 100, title: 'Century Scholar', label: '100 Days', shortDesc: 'Elite mastery' },
];

export default function StreakMilestones({ currentStreak = 0, todayQualified = false }) {
  // Find next unreached milestone
  const nextMilestone = MILESTONES.find((m) => m.target > currentStreak) || null;
  const daysRemaining = nextMilestone ? nextMilestone.target - currentStreak : 0;

  return (
    <div className="bg-white border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-cobalt" />
          <h3 className="text-sm font-bold text-primary">Milestone Learning Path</h3>
        </div>

        {nextMilestone ? (
          <span className="text-[11px] font-bold text-cobalt bg-cobalt-soft px-3 py-1 rounded-xl border border-cobalt-border">
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} to {nextMilestone.label}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
            <Trophy size={12} />
            <span>All Targets Reached!</span>
          </span>
        )}
      </div>

      {/* Connected Journey Track */}
      <div className="py-2">
        <div className="relative">
          {/* Horizontal Background Track Line */}
          <div
            aria-hidden="true"
            className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-slate-200"
          />

          {/* Milestones Horizontal Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-2">
            {MILESTONES.map((m) => {
              const isCompleted = currentStreak >= m.target;
              const isNext = nextMilestone && nextMilestone.target === m.target;

              return (
                <div
                  key={m.target}
                  className={`flex flex-col sm:items-center text-left sm:text-center group transition-all ${
                    isNext ? 'scale-[1.02]' : ''
                  }`}
                >
                  {/* Node Icon on Track */}
                  <div className="relative z-10 flex sm:justify-center mb-2">
                    {isCompleted ? (
                      <div
                        className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs ring-4 ring-white"
                        title={`Completed! Target: ${m.label}`}
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                    ) : isNext ? (
                      <div
                        className="w-8 h-8 rounded-full bg-cobalt text-white flex items-center justify-center shadow-xs ring-4 ring-cobalt/20 animate-pulse"
                        title={`In progress! ${daysRemaining} days left`}
                      >
                        <Flame size={14} className="fill-white" />
                      </div>
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 text-tertiary flex items-center justify-center text-xs font-bold ring-4 ring-white"
                        title={`Target: ${m.label}`}
                      >
                        <span className="text-[11px] font-mono text-tertiary">{m.target}</span>
                      </div>
                    )}
                  </div>

                  {/* Milestone Details */}
                  <div className="space-y-0.5">
                    <span
                      className={`block text-xs font-bold ${
                        isCompleted
                          ? 'text-emerald-700'
                          : isNext
                          ? 'text-cobalt'
                          : 'text-primary'
                      }`}
                    >
                      {m.label}
                    </span>

                    <span className="block text-[11px] font-semibold text-secondary truncate">
                      {m.title}
                    </span>

                    <span className="block text-[10px] text-tertiary leading-tight">
                      {isCompleted ? 'Achieved' : isNext ? `${daysRemaining}d left` : m.shortDesc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Context Callout */}
      <div className="mt-5 pt-3.5 border-t border-border-subtle flex items-center justify-between text-xs text-secondary">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500 shrink-0" />
          <span>
            {todayQualified
              ? 'Great pace! Daily study locks in consecutive progress toward each milestone.'
              : 'Complete your daily learning to continue advancing toward the next achievement.'}
          </span>
        </div>

        <span className="font-mono text-[11px] font-bold text-primary shrink-0 hidden md:inline">
          {currentStreak}d record
        </span>
      </div>
    </div>
  );
}
