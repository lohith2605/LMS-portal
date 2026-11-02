import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Flame,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { learningActivityService } from '../../../services/api';
import { formatStudyDuration, formatDateKeyToReadable } from './streakFormatters';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAYS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getInitialMonthKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const getTodayDateKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function MonthlyActivityCalendar({ timezone = 'Asia/Kolkata' }) {
  const currentMonthKey = useMemo(() => getInitialMonthKey(), []);
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  const [activeMonthKey, setActiveMonthKey] = useState(currentMonthKey);
  const [monthData, setMonthData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);

  // Parse active year and month
  const [year, monthNum] = useMemo(() => {
    const [y, m] = activeMonthKey.split('-').map(Number);
    return [y, m];
  }, [activeMonthKey]);

  // Month title formatted: "November 2026"
  const monthTitle = useMemo(() => {
    const date = new Date(Date.UTC(year, monthNum - 1, 1));
    return date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    });
  }, [year, monthNum]);

  // Fetch month activity from backend
  const fetchMonthActivity = useCallback(async (mKey) => {
    try {
      setLoading(true);
      setError(null);
      const res = await learningActivityService.getMonthlyActivity(mKey, timezone);
      setMonthData(res?.days || []);
    } catch (err) {
      setError(err?.normalizedMessage || 'Unable to load activity for this month.');
    } finally {
      setLoading(false);
    }
  }, [timezone]);

  useEffect(() => {
    fetchMonthActivity(activeMonthKey);
  }, [activeMonthKey, fetchMonthActivity]);

  // Navigation handlers
  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = monthNum - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setActiveMonthKey(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = monthNum + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setActiveMonthKey(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleGoToday = () => {
    setActiveMonthKey(currentMonthKey);
    setSelectedDateKey(todayDateKey);
  };

  // Build daily lookup map
  const dailyMap = useMemo(() => {
    const map = new Map();
    monthData.forEach((item) => {
      if (item.date) {
        map.set(item.date, item);
      }
    });
    return map;
  }, [monthData]);

  // Build calendar matrix (Monday to Sunday)
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const firstDayUtc = new Date(Date.UTC(year, monthNum - 1, 1)).getUTCDay();
    const leadingEmptyCount = firstDayUtc === 0 ? 6 : firstDayUtc - 1;

    const cells = [];
    for (let i = 0; i < leadingEmptyCount; i++) {
      cells.push({ empty: true, id: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = dailyMap.get(dateKey);
      const studySeconds = record ? record.studySeconds || 0 : 0;
      const qualifyingCount = record ? record.qualifyingCount || 0 : 0;
      const hasQualifying = qualifyingCount > 0;
      const isToday = dateKey === todayDateKey;
      const isSelected = dateKey === selectedDateKey;

      // Intensity level
      let intensity = 0;
      if (studySeconds >= 2700) {
        intensity = 3; // 45m+
      } else if (studySeconds >= 900) {
        intensity = 2; // 15-45m
      } else if (studySeconds > 0) {
        intensity = 1; // 1-15m
      }

      cells.push({
        empty: false,
        id: dateKey,
        day,
        dateKey,
        studySeconds,
        qualifyingCount,
        hasQualifying,
        isToday,
        isSelected,
        intensity,
      });
    }

    return cells;
  }, [year, monthNum, dailyMap, todayDateKey, selectedDateKey]);

  // Selected date info
  const selectedInfo = useMemo(() => {
    if (!selectedDateKey) return null;
    const record = dailyMap.get(selectedDateKey);
    return {
      dateKey: selectedDateKey,
      studySeconds: record ? record.studySeconds || 0 : 0,
      qualifyingCount: record ? record.qualifyingCount || 0 : 0,
      hasQualifying: record ? (record.qualifyingCount || 0) > 0 : false,
    };
  }, [selectedDateKey, dailyMap]);

  return (
    <div className="bg-white border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Navigation Header */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-cobalt" />
            <h3 className="text-sm font-bold text-primary">{monthTitle}</h3>
          </div>

          <div className="flex items-center gap-1.5">
            {activeMonthKey !== currentMonthKey && (
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-cobalt hover:bg-cobalt-soft border border-cobalt-border transition cursor-pointer"
              >
                Today
              </button>
            )}

            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-subtle text-secondary hover:text-primary transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-subtle text-secondary hover:text-primary transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchMonthActivity(activeMonthKey)}
              className="text-rose-700 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Calendar Matrix */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs rounded-xl flex items-center justify-center z-10">
              <RefreshCw size={18} className="animate-spin text-cobalt" />
            </div>
          )}

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
            {WEEKDAYS_FULL.map((d, i) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-tertiary py-1"
                title={d}
              >
                <span className="sm:hidden">{WEEKDAYS[i]}</span>
                <span className="hidden sm:inline">{d.slice(0, 2)}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell) => {
              if (cell.empty) {
                return (
                  <div
                    key={cell.id}
                    className="aspect-square rounded-lg bg-transparent"
                    aria-hidden="true"
                  />
                );
              }

              // Color styles based on activity intensity
              let cellBg = 'bg-slate-100/70 text-secondary hover:bg-slate-200/80';
              if (cell.intensity === 3) {
                cellBg = 'bg-cobalt text-white shadow-2xs font-bold hover:bg-cobalt-hover';
              } else if (cell.intensity === 2) {
                cellBg = 'bg-cobalt/40 text-slate-900 font-bold hover:bg-cobalt/50';
              } else if (cell.intensity === 1) {
                cellBg = 'bg-blue-100 text-cobalt font-semibold hover:bg-blue-200';
              }

              return (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => setSelectedDateKey(cell.dateKey)}
                  aria-pressed={cell.isSelected}
                  aria-label={`${cell.dateKey}: ${formatStudyDuration(cell.studySeconds)}, ${
                    cell.qualifyingCount
                  } completions`}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer text-xs ${cellBg} ${
                    cell.isToday ? 'ring-2 ring-cobalt ring-offset-1' : ''
                  } ${
                    cell.isSelected ? 'border-2 border-slate-900 shadow-xs' : 'border border-transparent'
                  }`}
                >
                  <span className="leading-none">{cell.day}</span>

                  {/* Indicator for streak qualifying day */}
                  {cell.hasQualifying && (
                    <div className="absolute top-0.5 right-0.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          cell.intensity === 3 ? 'bg-amber-300' : 'bg-amber-500'
                        }`}
                        title="Streak qualified"
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Date Detail Footer */}
      <div className="mt-4 pt-3.5 border-t border-border-subtle space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <Clock size={13} className="text-cobalt" />
            <span>
              {selectedInfo ? formatDateKeyToReadable(selectedInfo.dateKey) : 'Select a date'}
            </span>
          </div>

          <div className="text-right">
            <span className="font-mono font-bold text-primary">
              {selectedInfo ? formatStudyDuration(selectedInfo.studySeconds, true) : '0m'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1 text-secondary">
            {selectedInfo?.hasQualifying ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 size={12} />
                <span>Streak criteria met ({selectedInfo.qualifyingCount} qualified)</span>
              </span>
            ) : (
              <span className="text-tertiary">No streak activity recorded</span>
            )}
          </div>

          {selectedInfo?.hasQualifying && (
            <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-[10px]">
              <Flame size={11} className="fill-amber-500 text-amber-500" />
              <span>Qualified</span>
            </span>
          )}
        </div>

        {/* Understated Legend */}
        <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] text-tertiary">
          <span>Less</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-slate-100/70 border border-border-subtle" title="0m" />
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-100" title="1-15m" />
            <div className="w-2.5 h-2.5 rounded-sm bg-cobalt/40" title="15-45m" />
            <div className="w-2.5 h-2.5 rounded-sm bg-cobalt" title="45m+" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
