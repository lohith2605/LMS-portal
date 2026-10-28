import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { calendarService } from '../../services/api';

const STATUS_CONFIG = {
  overdue: {
    label: 'Overdue',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    icon: AlertTriangle,
  },
  due_soon: {
    label: 'Due Soon',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    icon: Clock,
  },
  upcoming: {
    label: 'Upcoming',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    icon: CalendarIcon,
  },
  completed: {
    label: 'Completed',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AcademicCalendar({ onOpenAssignmentSubmission = null }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, due_soon, overdue, upcoming, completed
  const [selectedCourseId, setSelectedCourseId] = useState('all');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Compute month boundaries in local & UTC
  const { monthStartISO, monthEndISO } = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    return {
      monthStartISO: firstDay.toISOString(),
      monthEndISO: lastDay.toISOString(),
    };
  }, [currentYear, currentMonth]);

  // Fetch calendar activities for the active month
  const fetchCalendarData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [calData, upData] = await Promise.all([
        calendarService.getCalendarEvents({
          startDate: monthStartISO,
          endDate: monthEndISO,
        }),
        calendarService.getUpcomingDeadlines({ limit: 5 }),
      ]);

      if (calData && Array.isArray(calData.events)) {
        setEvents(calData.events);
      }
      if (upData && Array.isArray(upData.upcoming)) {
        setUpcomingDeadlines(upData.upcoming);
      }
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to load academic calendar activities.');
    } finally {
      setIsLoading(false);
    }
  }, [monthStartISO, monthEndISO]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Distinct courses present in returned events for filtering
  const availableCourses = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      if (ev.course && ev.course._id) {
        map.set(ev.course._id.toString(), ev.course.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
      if (selectedCourseId !== 'all' && ev.course?._id !== selectedCourseId) return false;
      return true;
    });
  }, [events, statusFilter, selectedCourseId]);

  // Month grid calculation
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells = [];
    // Padding before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ isCurrentMonth: false, day: null });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const cellDate = new Date(currentYear, currentMonth, day);
      const isToday =
        new Date().toDateString() === cellDate.toDateString();
      const isSelected =
        selectedDate && selectedDate.toDateString() === cellDate.toDateString();

      // Find events matching this day
      const dayEvents = filteredEvents.filter((ev) => {
        if (!ev.dueDate) return false;
        const d = new Date(ev.dueDate);
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          d.getDate() === day
        );
      });

      cells.push({
        isCurrentMonth: true,
        day,
        date: cellDate,
        isToday,
        isSelected,
        events: dayEvents,
      });
    }

    return cells;
  }, [currentYear, currentMonth, selectedDate, filteredEvents]);

  // Events on the currently selected date
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter((ev) => {
      if (!ev.dueDate) return false;
      const d = new Date(ev.dueDate);
      return (
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate()
      );
    });
  }, [selectedDate, filteredEvents]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const monthLabel = currentDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="space-y-6">
      {/* Top Banner: Academic Calendar Header */}
      <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
              Academic Planner
            </span>
            <span className="text-xs text-tertiary">Real-Time Sync</span>
          </div>
          <h2 className="text-lg font-extrabold text-primary tracking-tight">
            Course Schedule & Deadlines
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            Track assignment milestones, monitor due dates, and manage deliverables across all enrolled tracks.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-surface-subtle hover:bg-white border border-border-subtle text-primary transition-all shadow-xs cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-surface-subtle border border-border-subtle rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-primary px-2 min-w-[120px] text-center select-none">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={fetchCalendarData}
            title="Refresh calendar"
            disabled={isLoading}
            className="p-2 rounded-xl border border-border-subtle bg-white text-secondary hover:text-primary transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchCalendarData}
            className="font-bold underline cursor-pointer ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Impending Deadlines Strip */}
      {upcomingDeadlines && upcomingDeadlines.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-800" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
              Impending Deadlines ({upcomingDeadlines.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingDeadlines.map((item) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.upcoming;
              const dueTime = new Date(item.dueDate).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dueDateShort = new Date(item.dueDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={item.id}
                  className="bg-white border border-amber-200 rounded-xl p-3 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-tertiary truncate">
                        {item.course?.title || 'Enrolled Course'}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-primary line-clamp-1 mb-1">
                      {item.title}
                    </h4>
                  </div>
                  <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between mt-2">
                    <span className="text-[11px] text-secondary font-medium">
                      {dueDateShort} at {dueTime}
                    </span>
                    <Link
                      to={item.destinationUrl}
                      className="text-xs font-bold text-accent-blue-dark hover:underline flex items-center gap-0.5"
                    >
                      <span>Submit</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border-subtle rounded-2xl p-3 shadow-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-tertiary flex items-center gap-1 mr-1 pl-1">
            <Filter size={13} />
            <span>Filter:</span>
          </span>
          {[
            { id: 'all', label: 'All', count: events.length },
            { id: 'due_soon', label: 'Due Soon', count: events.filter((e) => e.status === 'due_soon').length },
            { id: 'overdue', label: 'Overdue', count: events.filter((e) => e.status === 'overdue').length },
            { id: 'upcoming', label: 'Upcoming', count: events.filter((e) => e.status === 'upcoming').length },
            { id: 'completed', label: 'Completed', count: events.filter((e) => e.status === 'completed').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-subtle text-secondary hover:text-primary hover:bg-white border border-border-subtle'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Course Filter Dropdown */}
        {availableCourses.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Courses ({availableCourses.length})</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Layout: Calendar Grid & Selected Day Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols on lg) */}
        <div className="lg:col-span-2 bg-white border border-border-subtle rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 mb-2 text-center">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-[11px] font-extrabold uppercase tracking-wider text-tertiary py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1.5 animate-pulse">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-h-[75px] sm:min-h-[85px] p-1.5 rounded-xl border border-border-subtle bg-surface-subtle/50 flex flex-col justify-between"
                  >
                    <div className="w-5 h-5 bg-gray-200 rounded" />
                    <div className="w-12 h-3 bg-gray-200 rounded mt-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarGrid.map((cell, idx) => {
                  if (!cell.isCurrentMonth) {
                    return (
                      <div
                        key={idx}
                        className="min-h-[75px] sm:min-h-[85px] p-1.5 rounded-xl bg-surface-subtle/20 border border-transparent select-none opacity-40"
                      />
                    );
                  }

                  const hasEvents = cell.events && cell.events.length > 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`min-h-[75px] sm:min-h-[85px] p-1 sm:p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                        cell.isSelected
                          ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                          : cell.isToday
                          ? 'border-accent-blue-dark/50 bg-blue-50/20 hover:border-border-subtle hover:bg-surface-subtle'
                          : hasEvents
                          ? 'border-border-subtle bg-white hover:border-primary/50 hover:bg-surface-subtle/40'
                          : 'border-border-subtle/60 bg-white hover:bg-surface-subtle/40'
                      }`}
                    >
                      {/* Cell Day Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-extrabold w-5 h-5 flex items-center justify-center rounded-full ${
                            cell.isToday
                              ? 'bg-primary text-white'
                              : cell.isSelected
                              ? 'text-primary font-black'
                              : 'text-primary/80'
                          }`}
                        >
                          {cell.day}
                        </span>

                        {hasEvents && (
                          <span className="text-[9px] font-bold text-tertiary">
                            {cell.events.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {cell.events.slice(0, 2).map((ev) => {
                          const cfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.upcoming;
                          return (
                            <div
                              key={ev.id}
                              title={`${ev.title} (${cfg.label})`}
                              className={`px-1 py-0.5 rounded text-[9px] font-bold truncate border flex items-center gap-1 ${cfg.badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}
                        {cell.events.length > 2 && (
                          <div className="text-[9px] font-bold text-tertiary pl-1">
                            +{cell.events.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-border-subtle mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-[11px] text-secondary font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Overdue</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Due Soon</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Upcoming</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Completed</span>
              </span>
            </div>
            <span className="text-[11px] text-tertiary">
              Times displayed in your local timezone
            </span>
          </div>
        </div>

        {/* Selected Date Timeline Details (1 Col on lg) */}
        <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border-subtle mb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-tertiary">
                Selected Date
              </span>
              <h3 className="text-sm font-extrabold text-primary">
                {selectedDateLabel}
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-subtle text-primary border border-border-subtle">
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Activity' : 'Activities'}
            </span>
          </div>

          {/* Activities List for Selected Day */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[480px]">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((item) => {
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.upcoming;
                const IconComponent = cfg.icon;
                const dueTime = new Date(item.dueDate).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isCompleted = item.status === 'completed';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : item.status === 'overdue'
                        ? 'bg-rose-50/20 border-rose-200'
                        : item.status === 'due_soon'
                        ? 'bg-amber-50/20 border-amber-200'
                        : 'bg-surface-subtle/50 border-border-subtle'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-tertiary truncate">
                        {item.course?.title || 'Course'}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.badge}`}
                      >
                        <IconComponent size={10} />
                        <span>{cfg.label}</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-primary mb-1">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-xs text-secondary line-clamp-2 mb-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-secondary font-medium mb-3">
                      <Clock size={12} className="text-tertiary" />
                      <span>Due: {dueTime}</span>
                      <span className="text-tertiary">•</span>
                      <span>Max marks: {item.maxMarks}</span>
                    </div>

                    {/* Submission status details if submitted */}
                    {item.submission && (
                      <div className="p-2.5 rounded-lg bg-white border border-border-subtle mb-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-tertiary">Submission Status:</span>
                          <span className="font-bold text-primary capitalize">
                            {item.submission.status.replace('_', ' ')}
                          </span>
                        </div>
                        {item.submission.grade !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-tertiary">Awarded Grade:</span>
                            <span className="font-extrabold text-emerald-700">
                              {item.submission.grade} / {item.maxMarks}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Link */}
                    <div className="pt-2 border-t border-border-subtle flex items-center justify-end">
                      {onOpenAssignmentSubmission ? (
                        <button
                          type="button"
                          onClick={() => onOpenAssignmentSubmission(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                            isCompleted
                              ? 'bg-surface-subtle text-primary border border-border-subtle hover:bg-white'
                              : 'bg-primary text-white hover:bg-[#2b2b2b]'
                          }`}
                        >
                          <span>
                            {isCompleted
                              ? 'View Submission & Grade'
                              : item.status === 'overdue'
                              ? 'Submit Overdue Deliverable'
                              : 'Open Assignment'}
                          </span>
                          <ArrowRight size={12} />
                        </button>
                      ) : (
                        <Link
                          to={item.destinationUrl}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                            isCompleted
                              ? 'bg-surface-subtle text-primary border border-border-subtle hover:bg-white'
                              : 'bg-primary text-white hover:bg-[#2b2b2b]'
                          }`}
                        >
                          <span>
                            {isCompleted
                              ? 'View Submission & Grade'
                              : item.status === 'overdue'
                              ? 'Submit Overdue Deliverable'
                              : 'Open Assignment'}
                          </span>
                          <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary mx-auto mb-3">
                  <Inbox size={20} />
                </div>
                <h4 className="text-xs font-bold text-primary">No deadlines scheduled</h4>
                <p className="text-[11px] text-secondary mt-1 max-w-[200px] mx-auto leading-relaxed">
                  There are no assignment deliverables due on {selectedDateLabel}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
