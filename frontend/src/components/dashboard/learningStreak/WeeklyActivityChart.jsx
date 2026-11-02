import React, { useState } from 'react';
import { BarChart2, Flame, CheckCircle2 } from 'lucide-react';
import { formatStudyDuration, formatDateKeyToReadable } from './streakFormatters';

export default function WeeklyActivityChart({ dailySummaries = [], weekStudySeconds = 0 }) {
  const [activeHoverIndex, setActiveHoverIndex] = useState(null);

  // Normalize to 7 days
  const days = Array.isArray(dailySummaries) && dailySummaries.length > 0
    ? dailySummaries
    : [
        { day: 'Mon', date: '', studySeconds: 0, qualifyingCount: 0, isToday: false },
        { day: 'Tue', date: '', studySeconds: 0, qualifyingCount: 0, isToday: false },
        { day: 'Wed', date: '', studySeconds: 0, qualifyingCount: 0, isToday: false },
        { day: 'Thu', date: '', studySeconds: 0, qualifyingCount: 0, isToday: false },
        { day: 'Fri', date: '', studySeconds: 0, qualifyingCount: 0, isToday: false },
        { day: 'Sat', date: '', studySeconds: 0, qualifyingCount: 0, isToday: false },
        { day: 'Sun', date: '', studySeconds: 0, qualifyingCount: 0, isToday: false },
      ];

  // Baseline at least 1 hour (3600s) or maximum study day
  const maxStudySeconds = Math.max(...days.map((d) => d.studySeconds || 0), 3600);

  return (
    <div className="bg-white border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-cobalt" />
            <h3 className="text-sm font-bold text-primary">Weekly Learning Activity</h3>
          </div>
          <p className="text-[11px] text-secondary mt-0.5">
            Active study time and streak qualifications across the current week
          </p>
        </div>

        <div className="self-start sm:self-auto">
          <span className="text-xs font-bold text-cobalt bg-cobalt-soft px-3 py-1 rounded-xl border border-cobalt-border">
            {formatStudyDuration(weekStudySeconds)} logged this week
          </span>
        </div>
      </div>

      {/* Compact Chart Area */}
      <div className="relative pt-6 pb-2">
        {/* Subtle reference baseline at 50% and 100% */}
        <div className="absolute inset-x-0 top-6 border-b border-dashed border-border-subtle/60 text-[9px] font-mono text-tertiary text-right pr-1">
          {formatStudyDuration(maxStudySeconds)}
        </div>
        <div className="absolute inset-x-0 top-[calc(5rem*0.5+1.5rem)] border-b border-dashed border-border-subtle/40 text-[9px] font-mono text-tertiary text-right pr-1">
          {formatStudyDuration(Math.round(maxStudySeconds / 2))}
        </div>

        {/* 7 Bars Grid - Compact 28 (112px) height */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3.5 items-end h-28 pt-4">
          {days.map((day, idx) => {
            const studySeconds = day.studySeconds || 0;
            const hasQualifying = (day.qualifyingCount || 0) > 0;
            const isToday = Boolean(day.isToday);
            const isHovered = activeHoverIndex === idx;

            // Height calculation: minimum 4% so even 0-second days have an understated base marker
            const heightPercent = maxStudySeconds > 0
              ? Math.max(studySeconds > 0 ? 8 : 4, Math.round((studySeconds / maxStudySeconds) * 100))
              : 4;

            return (
              <div
                key={day.date || day.day || idx}
                className="flex flex-col items-center h-full justify-end group cursor-pointer relative"
                onMouseEnter={() => setActiveHoverIndex(idx)}
                onMouseLeave={() => setActiveHoverIndex(null)}
                tabIndex={0}
                role="region"
                aria-label={`${day.day}: ${formatStudyDuration(studySeconds)} active, ${
                  day.qualifyingCount || 0
                } qualifying completions`}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 z-30 px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-medium shadow-xl pointer-events-none whitespace-nowrap text-center animate-in fade-in zoom-in-95 duration-150">
                    <div className="font-bold text-slate-100">
                      {day.day} • {day.date ? formatDateKeyToReadable(day.date) : ''}
                    </div>
                    <div className="text-cobalt-border text-[10px] mt-0.5 font-mono">
                      {formatStudyDuration(studySeconds, true)} active
                    </div>
                    {hasQualifying ? (
                      <div className="text-emerald-400 text-[10px] font-semibold mt-0.5 flex items-center justify-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>Streak Qualified ({day.qualifyingCount})</span>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[10px] mt-0.5">
                        No streak qualifying activity
                      </div>
                    )}
                    <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                  </div>
                )}

                {/* Qualifying Activity Indicator */}
                <div className="h-4 flex items-center justify-center mb-1">
                  {hasQualifying ? (
                    <Flame
                      size={12}
                      className={isToday ? 'text-cobalt fill-cobalt' : 'text-amber-500 fill-amber-500'}
                    />
                  ) : null}
                </div>

                {/* Bar */}
                <div className="w-full flex justify-center">
                  <div
                    className={`w-6 sm:w-8 max-w-full rounded-t-lg transition-all duration-300 ${
                      isToday
                        ? studySeconds > 0
                          ? 'bg-cobalt shadow-xs ring-2 ring-cobalt/40 ring-offset-1'
                          : 'bg-cobalt/40 border border-cobalt/60'
                        : studySeconds > 0
                        ? 'bg-slate-700 group-hover:bg-cobalt'
                        : 'bg-slate-200 group-hover:bg-slate-300'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Day & Date Labels */}
                <div className="mt-2 text-center w-full">
                  <span
                    className={`block text-[11px] font-bold ${
                      isToday ? 'text-cobalt font-black' : 'text-primary'
                    }`}
                  >
                    {day.day}
                  </span>
                  <span
                    className={`block text-[9px] font-mono leading-tight ${
                      isToday ? 'text-cobalt font-bold' : 'text-tertiary'
                    }`}
                  >
                    {day.date ? day.date.slice(8) : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Understated Legend */}
      <div className="pt-3 mt-2 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-[11px] text-tertiary">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-cobalt" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
            <span>Active Study</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={11} className="text-amber-500 fill-amber-500" />
            <span>Streak Qualified</span>
          </div>
        </div>

        <span className="text-[10px] text-tertiary hidden sm:inline">
          Hover for duration & completions
        </span>
      </div>
    </div>
  );
}
