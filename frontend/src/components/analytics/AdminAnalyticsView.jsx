import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  BookOpen,
  Award,
  Star,
  FileText,
  HelpCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { analyticsService } from '../../services/api';

export default function AdminAnalyticsView() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getAdminAnalytics();
      setAnalytics(res?.data || null);
    } catch (err) {
      setError(err?.normalizedMessage || 'Unable to load platform analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-border-subtle rounded-3xl p-10 text-center animate-pulse">
        <div className="w-10 h-10 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Aggregating platform-wide telemetry & analytics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-950">
        <AlertCircle size={32} className="mx-auto text-rose-600 mb-3" />
        <h3 className="text-sm font-bold mb-1">Could not load platform analytics</h3>
        <p className="text-xs text-rose-700 mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const {
    users,
    courses,
    enrollments,
    assessments,
    qualityAndCredentials,
    trends30Days,
  } = analytics;

  // Find max value in 30-day trends for relative chart heights
  const maxTrendVal = Math.max(
    1,
    ...trends30Days.map((t) => Math.max(t.registrations || 0, t.enrollments || 0))
  );

  return (
    <div className="space-y-8">
      {/* Platform Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <Users size={16} className="text-accent-blue-dark" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {users.byRole.total}
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            {users.byRole.student} students • {users.byRole.instructor} instructors
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Courses</span>
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {courses.byStatus.total}
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            {courses.byStatus.published} published • {courses.byStatus.draft} draft
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Platform Completion</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {enrollments.completionRate}%
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            {enrollments.completed} of {enrollments.active + enrollments.completed} active enrollments
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Course Rating</span>
            <Star size={16} className="text-amber-500 fill-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {qualityAndCredentials.averageRating.toFixed(1)}
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            {qualityAndCredentials.totalReviews} verified student reviews
          </p>
        </div>
      </div>

      {/* 30-Day Growth & Enrollment Trends (CSS Chart) */}
      <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-extrabold text-primary tracking-tight">
              30-Day Activity & Growth Trends
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Daily user registrations and course enrollments recorded across the platform
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
              <span className="text-secondary">Enrollments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-secondary">Registrations</span>
            </div>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="h-48 w-full flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-border-subtle overflow-x-auto">
          {trends30Days.map((point) => {
            const enrHeight = Math.round((point.enrollments / maxTrendVal) * 100);
            const regHeight = Math.round((point.registrations / maxTrendVal) * 100);
            const dateShort = point.date.slice(5); // MM-DD

            return (
              <div
                key={point.date}
                className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                  <div>{point.date}</div>
                  <div>Enrollments: {point.enrollments}</div>
                  <div>Registrations: {point.registrations}</div>
                </div>

                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  {/* Enrollments Bar */}
                  <div
                    style={{ height: `${Math.max(4, enrHeight)}%` }}
                    className="w-1.5 sm:w-2 bg-accent-blue rounded-t transition-all group-hover:bg-accent-blue-dark"
                  />
                  {/* Registrations Bar */}
                  <div
                    style={{ height: `${Math.max(4, regHeight)}%` }}
                    className="w-1.5 sm:w-2 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600"
                  />
                </div>
                <span className="text-[9px] text-tertiary mt-2 hidden sm:block">
                  {dateShort}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Breakdown */}
        <div className="bg-white border border-border-subtle rounded-3xl p-6 shadow-xs">
          <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <Users size={16} className="text-accent-blue-dark" />
            <span>User Demographics</span>
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Students:</span>
              <span className="font-bold text-primary">{users.byRole.student}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Instructors:</span>
              <span className="font-bold text-primary">{users.byRole.instructor}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Admins:</span>
              <span className="font-bold text-primary">{users.byRole.admin}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Active Accounts:</span>
              <span className="font-bold text-emerald-600">{users.byStatus.active}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-secondary">Pending Approval:</span>
              <span className="font-bold text-amber-600">{users.byStatus.pending}</span>
            </div>
          </div>
        </div>

        {/* Course Portfolio Breakdown */}
        <div className="bg-white border border-border-subtle rounded-3xl p-6 shadow-xs">
          <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-600" />
            <span>Course Catalog Status</span>
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Published Courses:</span>
              <span className="font-bold text-emerald-600">{courses.byStatus.published}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Draft Courses:</span>
              <span className="font-bold text-primary">{courses.byStatus.draft}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Pending Moderation:</span>
              <span className="font-bold text-amber-600">{courses.byStatus.pending_review}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Rejected Courses:</span>
              <span className="font-bold text-rose-600">{courses.byStatus.rejected}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-secondary">Archived Courses:</span>
              <span className="font-bold text-slate-500">{courses.byStatus.archived}</span>
            </div>
          </div>
        </div>

        {/* Assessment & Quality Summary */}
        <div className="bg-white border border-border-subtle rounded-3xl p-6 shadow-xs">
          <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <Award size={16} className="text-amber-600" />
            <span>Assessments & Credentials</span>
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Total Assignments:</span>
              <span className="font-bold text-primary">{assessments.totalAssignments}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Submissions Graded:</span>
              <span className="font-bold text-primary">{assessments.gradedSubmissions}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Total Quizzes:</span>
              <span className="font-bold text-primary">{assessments.totalQuizzes}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-secondary">Quiz Pass Rate:</span>
              <span className="font-bold text-emerald-600">{assessments.passRate}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-secondary">Certificates Issued:</span>
              <span className="font-bold text-indigo-600">{qualityAndCredentials.totalCertificatesIssued}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
