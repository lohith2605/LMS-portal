import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Clock,
  Award,
  Calendar,
  CheckCircle2,
  UploadCloud,
  Play,
  CalendarCheck,
} from 'lucide-react';
import CourseCard from './CourseCard';
import ResumeLearningCard from './ResumeLearningCard';
import GettingStartedChecklist from './GettingStartedChecklist';

// Helper for relative deadline badges
const getRelativeDeadline = (dueDate) => {
  if (!dueDate) return { text: 'Scheduled', badgeClass: 'bg-surface-subtle text-secondary border-border-subtle' };
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return {
      text: 'Overdue',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    };
  }
  if (diffDays <= 0 || (diffDays === 1 && due.getDate() === now.getDate())) {
    return {
      text: 'Due today',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    };
  }
  if (diffDays === 1) {
    return {
      text: 'Due tomorrow',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    };
  }
  return {
    text: `Due in ${diffDays} days`,
    badgeClass: 'bg-cobalt-soft text-cobalt border-cobalt-border',
  };
};

// Helper for relative time in recent activity
const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const past = new Date(timestamp);
  const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Helper for activity icon and tone
const getActivityMeta = (type) => {
  switch (type) {
    case 'certificate_issued':
      return {
        icon: Award,
        colorClass: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
      };
    case 'grade_published':
      return {
        icon: CheckCircle2,
        colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
      };
    case 'assignment_submission':
      return {
        icon: UploadCloud,
        colorClass: 'text-cobalt bg-cobalt-soft border-cobalt-border',
      };
    case 'lesson_access':
    default:
      return {
        icon: Play,
        colorClass: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
      };
  }
};

export default function StudentOverviewTab({
  data,
  user,
  setActiveTab,
  onOpenAssignmentModal,
}) {
  const overview = data?.overview || {};
  const enrolledCourses = data?.enrolledCourses || [];
  const upcomingDeadlines = data?.upcomingDeadlines || [];
  const recentActivity = data?.recentActivity || [];
  const resumeLearning = data?.resumeLearning || null;

  return (
    <div className="space-y-6">
      {/* Compact Inline Stats Row */}
      <div className="flex items-center gap-3 sm:gap-6 py-2.5 px-4 bg-surface border border-border-subtle rounded-2xl shadow-2xs overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('learning')}
          className="flex items-center gap-2 shrink-0 hover:text-cobalt transition-colors cursor-pointer text-left"
          title="Filter to enrolled courses"
        >
          <span className="w-2 h-2 rounded-full bg-cobalt" />
          <span className="text-secondary font-medium">Enrolled:</span>
          <strong className="text-primary font-bold">{overview.enrolledCount ?? 0}</strong>
        </button>

        <span className="text-border-subtle shrink-0">|</span>

        <button
          type="button"
          onClick={() => setActiveTab('learning')}
          className="flex items-center gap-2 shrink-0 hover:text-cobalt transition-colors cursor-pointer text-left"
          title="Filter to courses in progress"
        >
          <span className="w-2 h-2 rounded-full bg-blue-secondary" />
          <span className="text-secondary font-medium">In Progress:</span>
          <strong className="text-primary font-bold">{overview.inProgressCount ?? 0}</strong>
        </button>

        <span className="text-border-subtle shrink-0">|</span>

        <button
          type="button"
          onClick={() => setActiveTab('learning')}
          className="flex items-center gap-2 shrink-0 hover:text-cobalt transition-colors cursor-pointer text-left"
          title="Filter to not started courses"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-secondary font-medium">Not Started:</span>
          <strong className="text-primary font-bold">{overview.notStartedCount ?? 0}</strong>
        </button>

        <span className="text-border-subtle shrink-0">|</span>

        <button
          type="button"
          onClick={() => setActiveTab('learning')}
          className="flex items-center gap-2 shrink-0 hover:text-cobalt transition-colors cursor-pointer text-left"
          title="Filter to completed courses"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-secondary font-medium">Completed:</span>
          <strong className="text-primary font-bold">{overview.completedCount ?? 0}</strong>
        </button>

        {overview.completedCount > 0 && (
          <>
            <span className="text-border-subtle shrink-0">|</span>
            <button
              type="button"
              onClick={() => setActiveTab('certificates')}
              className="flex items-center gap-2 shrink-0 hover:text-cobalt transition-colors cursor-pointer text-left"
              title="View earned certificates"
            >
              <Award size={13} className="text-accent-sage-dark" />
              <span className="text-secondary font-medium">Certificates:</span>
              <strong className="text-primary font-bold">{overview.completedCount}</strong>
            </button>
          </>
        )}
      </div>

      {/* Two-Column Layout: 2/3 Main Column + 1/3 Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column (2/3) */}
        <section className="lg:col-span-8 space-y-6">
          {/* Top Resume Strip */}
          <ResumeLearningCard
            resumeLearning={resumeLearning}
            hasEnrollments={enrolledCourses.length > 0}
            setActiveTab={setActiveTab}
          />

          {/* Enrolled Courses or Getting Started Checklist */}
          {enrolledCourses.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-primary tracking-tight">
                    My Courses
                  </h2>
                  <p className="text-xs text-secondary">
                    Active curriculum tracks and course progress
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('learning')}
                  className="group text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All ({enrolledCourses.length})</span>
                  <ArrowRight size={13} className="group-hover-nudge-x" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {enrolledCourses
                  .filter((enr) => enr && enr.course)
                  .slice(0, 4)
                  .map((enr) => (
                    <CourseCard
                      key={enr.id}
                      course={enr.course}
                      enrollment={enr}
                      variant="enrolled"
                      onViewCertificate={() => setActiveTab('certificates')}
                    />
                  ))}
              </div>
            </div>
          ) : (
            /* 4c. No Enrollments: Getting Started Checklist + Recommended Courses */
            <GettingStartedChecklist
              user={user}
              enrolledCourses={enrolledCourses}
              setActiveTab={setActiveTab}
            />
          )}
        </section>

        {/* Right Rail (1/3) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* 4a. Upcoming Deadlines Panel */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-accent-blue-dark" />
                <h3 className="text-sm font-bold text-primary">Upcoming Deadlines</h3>
              </div>
              <span className="text-[11px] font-semibold text-secondary">
                {upcomingDeadlines.length} scheduled
              </span>
            </div>

            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.slice(0, 4).map((item) => {
                  const relativeDeadline = getRelativeDeadline(item.dueDate);

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (onOpenAssignmentModal) {
                          onOpenAssignmentModal(item);
                        } else {
                          setActiveTab('assignments');
                        }
                      }}
                      className="p-3 bg-surface-subtle border border-border-subtle rounded-xl text-xs space-y-1.5 hover:border-cobalt/40 transition-all cursor-pointer group"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (onOpenAssignmentModal) onOpenAssignmentModal(item);
                          else setActiveTab('assignments');
                        }
                      }}
                      aria-label={`Open assignment: ${item.title}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-primary line-clamp-1 group-hover:text-cobalt transition-colors">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${relativeDeadline.badgeClass}`}
                        >
                          {relativeDeadline.text}
                        </span>
                      </div>

                      {item.courseTitle && (
                        <p className="text-[11px] text-secondary truncate">
                          {item.courseTitle}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-tertiary pt-1 border-t border-border-subtle">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Calendar size={11} />
                          <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                        </span>
                        {item.maxMarks && (
                          <span className="font-semibold text-primary">
                            {item.maxMarks} pts
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setActiveTab('assignments')}
                  className="w-full py-2 rounded-xl bg-surface-subtle hover:bg-border-subtle border border-border-subtle text-xs font-semibold text-primary transition-all text-center cursor-pointer mt-2 block"
                >
                  View All Assignments
                </button>
              </div>
            ) : (
              /* 4c. No Deadlines: Friendly Message & Calendar Link */
              <div className="text-center py-6 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-cobalt mx-auto">
                  <CalendarCheck size={18} />
                </div>
                <p className="text-xs font-semibold text-primary">
                  No upcoming deadlines
                </p>
                <p className="text-[11px] text-secondary max-w-xs mx-auto">
                  You are completely caught up on scheduled deliverables.
                </p>
                {enrolledCourses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('calendar')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cobalt hover:underline cursor-pointer pt-2"
                  >
                    <span>View Academic Calendar</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4b. Recent Activity Timeline Panel */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-accent-sage-dark" />
                <h3 className="text-sm font-bold text-primary">Recent Activity</h3>
              </div>
              <span className="text-[11px] font-semibold text-secondary">Timeline</span>
            </div>

            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((act, idx) => {
                  const meta = getActivityMeta(act.type);
                  const Icon = meta.icon;
                  const relativeTime = getRelativeTime(act.timestamp);

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-surface-subtle border border-border-subtle rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${meta.colorClass}`}
                        >
                          <Icon size={13} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-primary font-medium leading-snug">
                            {act.text}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-tertiary mt-1">
                            <span className="truncate max-w-[140px] text-secondary">
                              {act.courseTitle}
                            </span>
                            <span className="shrink-0">{relativeTime}</span>
                          </div>

                          {act.link && (
                            <Link
                              to={act.link}
                              className="text-[11px] font-semibold text-cobalt hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              <span>View details</span>
                              <ArrowRight size={10} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs font-semibold text-primary mb-1">
                  No recent activity logged
                </p>
                <p className="text-[11px] text-secondary max-w-xs mx-auto">
                  Your lesson access, assessment submissions, and milestones will appear here in chronological order.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
