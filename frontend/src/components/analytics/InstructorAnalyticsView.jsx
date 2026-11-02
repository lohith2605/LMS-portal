import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  BookOpen,
  Users,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  HelpCircle,
  Award,
  CheckCircle2,
  ArrowRight,
  Search,
  Layers,
  ChevronRight,
  BarChart3,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import { analyticsService } from '../../services/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'assignments', label: 'Assignment Velocity', icon: FileText },
  { id: 'quizzes', label: 'Quiz Mastery', icon: HelpCircle },
  { id: 'courses', label: 'Course Performance', icon: BookOpen },
];

export default function InstructorAnalyticsView({ onSelectDashboardTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = searchParams.get('analyticsView') || 'overview';
  const validViews = ['overview', 'assignments', 'quizzes', 'courses'];
  const [activeTab, setActiveTab] = useState(validViews.includes(initialView) ? initialView : 'overview');

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters for Course Performance Tab
  const [courseSearch, setCourseSearch] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState('all');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getInstructorAnalytics();
      setAnalytics(res?.data || null);
    } catch (err) {
      setError(err?.normalizedMessage || 'Unable to load your instructor analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Keep state in sync if URL query parameter changes
  useEffect(() => {
    const viewParam = searchParams.get('analyticsView');
    if (viewParam && validViews.includes(viewParam) && viewParam !== activeTab) {
      setActiveTab(viewParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tabId === 'overview') {
          next.delete('analyticsView');
        } else {
          next.set('analyticsView', tabId);
        }
        return next;
      },
      { replace: true }
    );
  };

  // Filter courses performance list
  const filteredCourses = useMemo(() => {
    if (!analytics?.coursesPerformance) return [];
    return analytics.coursesPerformance.filter((course) => {
      const matchesSearch =
        !courseSearch.trim() ||
        course.title.toLowerCase().includes(courseSearch.toLowerCase().trim()) ||
        (course.category && course.category.toLowerCase().includes(courseSearch.toLowerCase().trim()));
      const matchesStatus =
        courseStatusFilter === 'all' || course.status === courseStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [analytics?.coursesPerformance, courseSearch, courseStatusFilter]);

  if (loading) {
    return (
      <div className="bg-white border border-border-subtle rounded-3xl p-10 text-center animate-pulse shadow-xs">
        <div className="w-9 h-9 border-2 border-cobalt/25 border-t-cobalt rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Aggregating teaching telemetry across your courses...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-7 text-center text-rose-950 shadow-xs">
        <AlertCircle size={30} className="mx-auto text-rose-600 mb-2.5" />
        <h3 className="text-sm font-bold mb-1">Could not load teaching analytics</h3>
        <p className="text-xs text-rose-700 mb-4 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} />
          <span>Retry telemetry</span>
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const {
    overview,
    courseStatusBreakdown,
    progressDistribution,
    assignmentStats,
    quizStats,
    coursesPerformance,
  } = analytics;

  const totalCohort = progressDistribution?.total || 0;
  const p0To25 = totalCohort > 0 ? Math.round((progressDistribution.tier0To25 / totalCohort) * 100) : 0;
  const p26To50 = totalCohort > 0 ? Math.round((progressDistribution.tier26To50 / totalCohort) * 100) : 0;
  const p51To75 = totalCohort > 0 ? Math.round((progressDistribution.tier51To75 / totalCohort) * 100) : 0;
  const p76To100 = totalCohort > 0 ? Math.round((progressDistribution.tier76To100 / totalCohort) * 100) : 0;

  // Assignment velocity helpers
  const totalSubmissions = assignmentStats?.totalSubmissions || 0;
  const gradedSubmissions = assignmentStats?.gradedSubmissions || 0;
  const pendingGradingCount = assignmentStats?.pendingGrading || 0;
  const gradingTurnaroundRate =
    totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : null;

  // Quiz mastery helpers
  const totalQuizAttempts = quizStats?.totalAttempts || 0;
  const passedQuizAttempts = quizStats?.passedAttempts || 0;
  const failedQuizAttempts = Math.max(0, totalQuizAttempts - passedQuizAttempts);
  const quizPassRate = totalQuizAttempts > 0 ? `${quizStats.passRate}%` : 'N/A';
  const quizAverageScore = totalQuizAttempts > 0 ? `${quizStats.averageScore}%` : 'N/A';

  return (
    <div className="space-y-6">
      {/* Analytics Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
            Course Analytics
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-0.5">
            Teaching telemetry, student progression, and evaluation metrics across your curriculum.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchAnalytics}
            title="Refresh analytics data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-border-subtle hover:border-border-medium text-secondary hover:text-primary text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="border-b border-border-subtle pb-px">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            // Optional badge counts
            let badgeText = null;
            if (tab.id === 'assignments' && pendingGradingCount > 0) {
              badgeText = `${pendingGradingCount} pending`;
            } else if (tab.id === 'courses' && coursesPerformance.length > 0) {
              badgeText = coursesPerformance.length;
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cobalt text-white shadow-sm shadow-cobalt/25'
                    : 'bg-white border border-border-subtle text-secondary hover:text-primary hover:bg-surface-subtle'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.25 : 1.75} />
                <span>{tab.label}</span>
                {badgeText && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.id === 'assignments'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-surface-subtle text-secondary border border-border-subtle'
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: OVERVIEW                                             */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Learners</span>
                <Users size={16} className="text-cobalt" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {overview.totalLearners}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                {overview.totalEnrollments} total enrollment{overview.totalEnrollments === 1 ? '' : 's'}
              </p>
            </div>

            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Completion Rate</span>
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {overview.completionRate}%
              </div>
              <p className="text-[11px] text-secondary mt-1">
                {overview.completedEnrollments} completed • {overview.activeEnrollments} active
              </p>
            </div>

            <div
              onClick={() => handleTabChange('assignments')}
              className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs hover:border-border-medium hover-lift transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending Grading</span>
                <Clock
                  size={16}
                  className={overview.pendingGrading > 0 ? 'text-amber-600' : 'text-slate-400'}
                />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {overview.pendingGrading}
              </div>
              <p className="text-[11px] text-secondary mt-1 flex items-center justify-between">
                <span>Submissions to review</span>
                <ArrowRight size={12} className="text-secondary" />
              </p>
            </div>

            <div
              onClick={() => handleTabChange('courses')}
              className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs hover:border-border-medium hover-lift transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Courses Portfolio</span>
                <BookOpen size={16} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {overview.totalCourses}
              </div>
              <p className="text-[11px] text-secondary mt-1 flex items-center justify-between">
                <span>{overview.publishedCourses} published • {courseStatusBreakdown.draft || 0} drafts</span>
                <ArrowRight size={12} className="text-secondary" />
              </p>
            </div>
          </div>

          {/* Cohort Progress Distribution */}
          <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-primary tracking-tight">
                  Cohort Progress Distribution
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Breakdown of enrolled learners across your courses by lesson completion tier
                </p>
              </div>
              <span className="text-xs font-semibold text-secondary bg-surface-subtle border border-border-subtle px-3 py-1 rounded-full self-start sm:self-auto">
                {progressDistribution.total} Total Enrollments
              </span>
            </div>

            {/* Segmented Distribution Bar */}
            <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden mb-5">
              <div
                title={`0-25%: ${progressDistribution.tier0To25} learners`}
                style={{ width: `${progressDistribution.total > 0 ? (progressDistribution.tier0To25 / progressDistribution.total) * 100 : 0}%` }}
                className="bg-rose-400 h-full transition-all duration-500"
              />
              <div
                title={`26-50%: ${progressDistribution.tier26To50} learners`}
                style={{ width: `${progressDistribution.total > 0 ? (progressDistribution.tier26To50 / progressDistribution.total) * 100 : 0}%` }}
                className="bg-amber-400 h-full transition-all duration-500"
              />
              <div
                title={`51-75%: ${progressDistribution.tier51To75} learners`}
                style={{ width: `${progressDistribution.total > 0 ? (progressDistribution.tier51To75 / progressDistribution.total) * 100 : 0}%` }}
                className="bg-sky-400 h-full transition-all duration-500"
              />
              <div
                title={`76-100%: ${progressDistribution.tier76To100} learners`}
                style={{ width: `${progressDistribution.total > 0 ? (progressDistribution.tier76To100 / progressDistribution.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
              />
            </div>

            {/* Tier Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[11px] font-bold text-rose-900">0% – 25%</span>
                </div>
                <div className="text-lg font-extrabold text-rose-950">
                  {progressDistribution.tier0To25}
                  <span className="text-xs font-normal text-rose-700 ml-1.5">
                    ({progressDistribution.total > 0 ? p0To25 : 0}%)
                  </span>
                </div>
                <span className="text-[10px] text-rose-700 block mt-0.5">Early Stage</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-bold text-amber-900">26% – 50%</span>
                </div>
                <div className="text-lg font-extrabold text-amber-950">
                  {progressDistribution.tier26To50}
                  <span className="text-xs font-normal text-amber-700 ml-1.5">
                    ({progressDistribution.total > 0 ? p26To50 : 0}%)
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 block mt-0.5">Underway</span>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-[11px] font-bold text-sky-900">51% – 75%</span>
                </div>
                <div className="text-lg font-extrabold text-sky-950">
                  {progressDistribution.tier51To75}
                  <span className="text-xs font-normal text-sky-700 ml-1.5">
                    ({progressDistribution.total > 0 ? p51To75 : 0}%)
                  </span>
                </div>
                <span className="text-[10px] text-sky-700 block mt-0.5">Advanced</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-900">76% – 100%</span>
                </div>
                <div className="text-lg font-extrabold text-emerald-950">
                  {progressDistribution.tier76To100}
                  <span className="text-xs font-normal text-emerald-700 ml-1.5">
                    ({progressDistribution.total > 0 ? p76To100 : 0}%)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 block mt-0.5">Near Completion</span>
              </div>
            </div>
          </div>

          {/* Deep-dive Navigation Cards (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Assignment Velocity */}
            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-cobalt" />
                    <h4 className="text-xs font-bold text-primary">Assignment Velocity</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-secondary">
                    {assignmentStats.totalAssignments} created
                  </span>
                </div>

                <div className="space-y-2 py-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-secondary">Total Submissions:</span>
                    <span className="font-bold text-primary">{assignmentStats.totalSubmissions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Class Average Grade:</span>
                    <span className="font-bold text-primary">
                      {assignmentStats.gradedSubmissions > 0 ? `${assignmentStats.averageGrade}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Awaiting Review:</span>
                    <span className="font-bold text-amber-600">{assignmentStats.pendingGrading}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange('assignments')}
                className="mt-4 pt-3 border-t border-border-subtle text-xs font-semibold text-accent-blue-dark hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>View Assignment Velocity</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Card 2: Quiz Mastery */}
            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={15} className="text-amber-600" />
                    <h4 className="text-xs font-bold text-primary">Quiz Mastery</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-secondary">
                    {quizStats.totalQuizzes} quizzes
                  </span>
                </div>

                <div className="space-y-2 py-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-secondary">Pass Rate:</span>
                    <span className="font-bold text-emerald-600">{quizPassRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Average Score:</span>
                    <span className="font-bold text-primary">{quizAverageScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Total Attempts:</span>
                    <span className="font-bold text-primary">{quizStats.totalAttempts}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange('quizzes')}
                className="mt-4 pt-3 border-t border-border-subtle text-xs font-semibold text-accent-blue-dark hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>View Quiz Mastery</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Card 3: Course Performance */}
            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <BookOpen size={15} className="text-indigo-600" />
                    <h4 className="text-xs font-bold text-primary">Course Performance</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-secondary">
                    {coursesPerformance.length} courses
                  </span>
                </div>

                <div className="space-y-2 py-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-secondary">Total Enrollments:</span>
                    <span className="font-bold text-primary">{overview.totalEnrollments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Active Students:</span>
                    <span className="font-bold text-primary">{overview.activeEnrollments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Portfolio Completion:</span>
                    <span className="font-bold text-primary">{overview.completionRate}%</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTabChange('courses')}
                className="mt-4 pt-3 border-t border-border-subtle text-xs font-semibold text-accent-blue-dark hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>View Course Performance</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ASSIGNMENT VELOCITY                                  */}
      {/* ============================================================ */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Header Context & Action */}
          <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-cobalt" />
                <h3 className="text-base font-extrabold text-primary tracking-tight">
                  Assignment Velocity & Evaluation Telemetry
                </h3>
              </div>
              <p className="text-xs text-secondary">
                Track student assignment volume, turnaround velocity, and grading benchmarks across all courses.
              </p>
            </div>

            {onSelectDashboardTab && (
              <button
                type="button"
                onClick={() => onSelectDashboardTab('reviews')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm shadow-cobalt/20"
              >
                <span>Open Submissions & Grading</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Submissions</span>
                <FileText size={16} className="text-cobalt" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {totalSubmissions}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                Across {assignmentStats.totalAssignments} authored assignment(s)
              </p>
            </div>

            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Class Average Grade</span>
                <Award size={16} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {assignmentStats.gradedSubmissions > 0 ? `${assignmentStats.averageGrade}%` : 'N/A'}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                {assignmentStats.gradedSubmissions > 0
                  ? `Computed from ${assignmentStats.gradedSubmissions} graded submission(s)`
                  : 'No graded submissions yet'}
              </p>
            </div>

            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Review</span>
                <Clock
                  size={16}
                  className={pendingGradingCount > 0 ? 'text-amber-600' : 'text-slate-400'}
                />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {pendingGradingCount}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                {pendingGradingCount > 0 ? 'Action required in grading queue' : 'Zero backlog'}
              </p>
            </div>

            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Graded Submissions</span>
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {gradedSubmissions}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                {gradingTurnaroundRate !== null ? `${gradingTurnaroundRate}% turnaround rate` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Grading Velocity Visualizer & Turnaround Breakdown */}
          <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              Grading Turnaround Telemetry
            </h4>

            {totalSubmissions > 0 ? (
              <div className="space-y-4">
                <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden">
                  <div
                    title={`Graded: ${gradedSubmissions} submissions`}
                    style={{ width: `${(gradedSubmissions / totalSubmissions) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                  <div
                    title={`Pending Review: ${pendingGradingCount} submissions`}
                    style={{ width: `${(pendingGradingCount / totalSubmissions) * 100}%` }}
                    className="bg-amber-400 h-full transition-all duration-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 bg-surface-subtle border border-border-subtle rounded-xl">
                    <span className="text-[11px] text-secondary block">Evaluated Submissions</span>
                    <div className="text-base font-bold text-primary mt-0.5">
                      {gradedSubmissions} / {totalSubmissions}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                      {gradingTurnaroundRate}% reviewed
                    </span>
                  </div>

                  <div className="p-3.5 bg-surface-subtle border border-border-subtle rounded-xl">
                    <span className="text-[11px] text-secondary block">Grading Backlog</span>
                    <div className="text-base font-bold text-amber-600 mt-0.5">
                      {pendingGradingCount}
                    </div>
                    <span className="text-[10px] text-secondary block mt-0.5">
                      {pendingGradingCount > 0 ? 'Requires attention' : 'All submissions clear'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-surface-subtle border border-border-subtle rounded-xl">
                    <span className="text-[11px] text-secondary block">Class Average</span>
                    <div className="text-base font-bold text-primary mt-0.5">
                      {assignmentStats.gradedSubmissions > 0 ? `${assignmentStats.averageGrade}%` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-secondary block mt-0.5">
                      Across published modules
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText size={24} className="mx-auto text-secondary mb-2 opacity-60" />
                <p className="text-xs font-bold text-primary">No assignment submissions recorded yet</p>
                <p className="text-[11px] text-secondary mt-1 max-w-sm mx-auto">
                  When learners submit assignment code or documents, grading turnaround and class averages will automatically compile here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: QUIZ MASTERY                                         */}
      {/* ============================================================ */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          {/* Header Context & Action */}
          <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle size={16} className="text-amber-600" />
                <h3 className="text-base font-extrabold text-primary tracking-tight">
                  Quiz Mastery & Student Comprehension
                </h3>
              </div>
              <p className="text-xs text-secondary">
                Analyze pass rates, average test scores, and student attempt frequency across interactive assessments.
              </p>
            </div>

            {onSelectDashboardTab && (
              <button
                type="button"
                onClick={() => onSelectDashboardTab('assessments')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm shadow-cobalt/20"
              >
                <span>Manage Quizzes</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pass Rate</span>
                <Award size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">
                {quizPassRate}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                {totalQuizAttempts > 0
                  ? `${passedQuizAttempts} of ${totalQuizAttempts} attempts passed`
                  : 'No attempts recorded'}
              </p>
            </div>

            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Average Score</span>
                <TrendingUp size={16} className="text-cobalt" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {quizAverageScore}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                {totalQuizAttempts > 0 ? 'Mean score across all attempts' : 'Awaiting quiz attempts'}
              </p>
            </div>

            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Attempts</span>
                <HelpCircle size={16} className="text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {totalQuizAttempts}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                Across {quizStats.totalQuizzes} authored quiz(zes)
              </p>
            </div>

            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-secondary mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Passed vs Unpassed</span>
                <CheckCircle2 size={16} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {passedQuizAttempts} <span className="text-sm font-normal text-secondary">/ {failedQuizAttempts}</span>
              </div>
              <p className="text-[11px] text-secondary mt-1">
                Passed attempts vs unpassed attempts
              </p>
            </div>
          </div>

          {/* Pass/Fail Visualizer & Attempt Telemetry */}
          <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              Quiz Attempt Telemetry
            </h4>

            {totalQuizAttempts > 0 ? (
              <div className="space-y-4">
                <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden">
                  <div
                    title={`Passed: ${passedQuizAttempts} attempts (${quizStats.passRate}%)`}
                    style={{ width: `${quizStats.passRate}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                  <div
                    title={`Unpassed: ${failedQuizAttempts} attempts`}
                    style={{ width: `${100 - quizStats.passRate}%` }}
                    className="bg-rose-400 h-full transition-all duration-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 bg-surface-subtle border border-border-subtle rounded-xl">
                    <span className="text-[11px] text-secondary block">Pass Rate Benchmark</span>
                    <div className="text-base font-bold text-emerald-600 mt-0.5">
                      {quizPassRate}
                    </div>
                    <span className="text-[10px] text-secondary block mt-0.5">
                      {passedQuizAttempts} passing submissions
                    </span>
                  </div>

                  <div className="p-3.5 bg-surface-subtle border border-border-subtle rounded-xl">
                    <span className="text-[11px] text-secondary block">Average Class Score</span>
                    <div className="text-base font-bold text-primary mt-0.5">
                      {quizAverageScore}
                    </div>
                    <span className="text-[10px] text-secondary block mt-0.5">
                      Across all quiz attempts
                    </span>
                  </div>

                  <div className="p-3.5 bg-surface-subtle border border-border-subtle rounded-xl">
                    <span className="text-[11px] text-secondary block">Attempts per Quiz</span>
                    <div className="text-base font-bold text-primary mt-0.5">
                      {quizStats.totalQuizzes > 0
                        ? (totalQuizAttempts / quizStats.totalQuizzes).toFixed(1)
                        : '0.0'}
                    </div>
                    <span className="text-[10px] text-secondary block mt-0.5">
                      Engagement ratio
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <HelpCircle size={24} className="mx-auto text-secondary mb-2 opacity-60" />
                <p className="text-xs font-bold text-primary">No quiz attempts recorded yet</p>
                <p className="text-[11px] text-secondary mt-1 max-w-sm mx-auto">
                  When students complete assessments in your published curriculum, score distributions and pass rates will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: COURSE PERFORMANCE                                    */}
      {/* ============================================================ */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {/* Header Context & Summary Strip */}
          <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={16} className="text-indigo-600" />
                <h3 className="text-base font-extrabold text-primary tracking-tight">
                  Course Portfolio Performance
                </h3>
              </div>
              <p className="text-xs text-secondary">
                Detailed enrollment numbers, completion ratios, and pacing metrics for each course you teach.
              </p>
            </div>

            {onSelectDashboardTab && (
              <button
                type="button"
                onClick={() => onSelectDashboardTab('courses')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-subtle border border-border-subtle hover:border-border-medium text-secondary hover:text-primary text-xs font-semibold transition cursor-pointer self-start sm:self-auto shrink-0"
              >
                <span>Manage Course Studio</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>

          {/* Quick Portfolio Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border border-border-subtle rounded-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Total Courses
              </span>
              <span className="text-lg font-extrabold text-primary mt-0.5 block">
                {coursesPerformance.length}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-border-subtle rounded-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Published
              </span>
              <span className="text-lg font-extrabold text-emerald-600 mt-0.5 block">
                {overview.publishedCourses}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-border-subtle rounded-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Total Enrollments
              </span>
              <span className="text-lg font-extrabold text-primary mt-0.5 block">
                {overview.totalEnrollments}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-border-subtle rounded-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Avg Completion Rate
              </span>
              <span className="text-lg font-extrabold text-cobalt mt-0.5 block">
                {overview.completionRate}%
              </span>
            </div>
          </div>

          {/* Course Search & Filter Strip */}
          <div className="bg-white border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Filter by course title or category..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-subtle border border-border-subtle focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt transition"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['all', 'published', 'draft', 'pending_review'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setCourseStatusFilter(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition cursor-pointer ${
                      courseStatusFilter === status
                        ? 'bg-cobalt text-white shadow-xs'
                        : 'bg-surface-subtle text-secondary hover:text-primary hover:bg-slate-100'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Courses Performance Table */}
            {filteredCourses.length === 0 ? (
              <div className="text-center py-10 text-secondary text-xs">
                {coursesPerformance.length === 0
                  ? 'No courses found in your portfolio. Create your first course to begin tracking analytics.'
                  : 'No courses match your filter criteria.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-secondary">
                      <th className="pb-3 pr-4">Course</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4 text-center">Enrollments</th>
                      <th className="pb-3 px-4 text-center">Completed</th>
                      <th className="pb-3 px-4 text-center">Completion Rate</th>
                      <th className="pb-3 pl-4">Avg Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-xs">
                    {filteredCourses.map((course) => {
                      const statusStyles = {
                        published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        draft: 'bg-slate-100 text-slate-700 border-slate-200',
                        pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
                        rejected: 'bg-rose-50 text-rose-700 border-rose-200',
                      }[course.status] || 'bg-surface-subtle text-secondary border-border-subtle';

                      return (
                        <tr key={course.courseId} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 pr-4">
                            <div className="font-bold text-primary truncate max-w-xs sm:max-w-md">
                              {course.title}
                            </div>
                            <div className="text-[10px] text-secondary mt-0.5">
                              {course.category || 'General'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyles}`}
                            >
                              {course.status.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-semibold text-primary">
                            {course.totalEnrollments}
                          </td>

                          <td className="py-3.5 px-4 text-center text-secondary">
                            {course.completedStudents}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-primary">
                            {course.totalEnrollments > 0 ? `${course.completionRate}%` : '0%'}
                          </td>

                          <td className="py-3.5 pl-4 min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-border-subtle/40">
                                <div
                                  className="bg-cobalt h-full rounded-full transition-all duration-300"
                                  style={{ width: `${course.averageProgress}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-primary min-w-[34px] text-right">
                                {course.averageProgress}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
