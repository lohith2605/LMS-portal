import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BookOpen,
  Award,
  FileText,
  Clock,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { analyticsService } from '../../services/api';

export default function StudentAnalyticsView() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getStudentAnalytics();
      setAnalytics(res?.data || null);
    } catch (err) {
      setError(err?.normalizedMessage || 'Unable to load your learning analytics.');
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
          Calculating your learning analytics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-950">
        <AlertCircle size={32} className="mx-auto text-rose-600 mb-3" />
        <h3 className="text-sm font-bold mb-1">Could not load analytics</h3>
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

  const { overview, courses, assignments, quizzes, certificates, recentActivities } = analytics;

  return (
    <div className="space-y-8">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Learning</span>
            <BookOpen size={16} className="text-accent-blue-dark" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {overview.activeCourses}
            <span className="text-xs font-normal text-secondary ml-1.5">
              / {overview.totalEnrolled} total
            </span>
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            {overview.completedCourses} completed courses
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Progress</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {overview.averageCourseProgress}%
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overview.averageCourseProgress}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Assignments</span>
            <FileText size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {assignments.submissionRate}%
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            {assignments.submittedCount} submitted • Avg grade {assignments.averageGrade}%
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Certificates</span>
            <Award size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {certificates.total}
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            Official verified credentials
          </p>
        </div>
      </div>

      {/* Course-by-Course Progress Breakdown */}
      <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-extrabold text-primary tracking-tight">
              Course Progress & Lesson Completion
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Detailed tracking calculated directly from verified completed lessons
            </p>
          </div>
          <span className="text-xs font-bold text-secondary bg-slate-100 px-2.5 py-1 rounded-full">
            {courses.breakdown.length} Enrolled
          </span>
        </div>

        {courses.breakdown.length === 0 ? (
          <div className="text-center py-8 text-secondary text-xs">
            You are not currently enrolled in any courses. Explore the catalog to begin learning!
          </div>
        ) : (
          <div className="space-y-4">
            {courses.breakdown.map((item) => (
              <div
                key={item.enrollmentId}
                className="p-4 rounded-2xl border border-border-subtle bg-slate-50/50 hover:bg-slate-50 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{item.courseTitle}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-subtle text-secondary border border-border-subtle">
                        {item.category}
                      </span>
                      {item.status === 'completed' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-tertiary mt-0.5">
                      Completed {item.completedLessonsCount} of {item.totalLessons} published lessons
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-primary">
                      {item.progressPercent}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.progressPercent === 100 ? 'bg-emerald-500' : 'bg-accent-blue'
                    }`}
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment & Quiz Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assignments Card */}
        <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" />
              <span>Assignment Metrics</span>
            </h3>
            <span className="text-[11px] font-semibold text-secondary">
              {assignments.submittedCount} / {assignments.totalAssigned} Submitted
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Submission Rate
              </span>
              <span className="text-lg font-extrabold text-primary">
                {assignments.submissionRate}%
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Average Grade
              </span>
              <span className="text-lg font-extrabold text-primary">
                {assignments.gradedCount > 0 ? `${assignments.averageGrade}%` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="text-xs text-secondary space-y-1">
            <div className="flex justify-between">
              <span>Graded Submissions:</span>
              <span className="font-semibold text-primary">{assignments.gradedCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Grading:</span>
              <span className="font-semibold text-primary">{assignments.pendingGradingCount}</span>
            </div>
          </div>
        </div>

        {/* Quizzes Card */}
        <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <HelpCircle size={16} className="text-amber-600" />
              <span>Quiz Performance</span>
            </h3>
            <span className="text-[11px] font-semibold text-secondary">
              {quizzes.quizzesPassed} / {quizzes.quizzesAttempted} Quizzes Passed
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Best Score
              </span>
              <span className="text-lg font-extrabold text-emerald-600">
                {quizzes.totalAttempts > 0 ? `${quizzes.bestScore}%` : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Latest Score
              </span>
              <span className="text-lg font-extrabold text-primary">
                {quizzes.totalAttempts > 0 ? `${quizzes.latestScore}%` : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Average Score
              </span>
              <span className="text-lg font-extrabold text-primary">
                {quizzes.totalAttempts > 0 ? `${quizzes.averageScore}%` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="text-xs text-secondary">
            <span>Total Completed Attempts: </span>
            <span className="font-semibold text-primary">{quizzes.totalAttempts}</span>
          </div>
        </div>
      </div>

      {/* Authentic Recent Activity Timeline */}
      <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
        <h3 className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
          <Clock size={16} className="text-secondary" />
          <span>Recent Learning Activity</span>
        </h3>
        <p className="text-xs text-secondary mb-6">
          Real-time record of your course progress, submissions, quiz attempts, and certificates
        </p>

        {recentActivities.length === 0 ? (
          <div className="text-center py-6 text-xs text-secondary">
            No learning activity recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle bg-slate-50/40"
              >
                <div className="p-2 rounded-lg bg-white border border-border-subtle text-primary shrink-0 mt-0.5">
                  {act.type === 'course_access' && <BookOpen size={14} className="text-accent-blue" />}
                  {act.type === 'assignment_submission' && <FileText size={14} className="text-indigo-600" />}
                  {act.type === 'quiz_completion' && <HelpCircle size={14} className="text-amber-600" />}
                  {act.type === 'certificate_earned' && <Award size={14} className="text-emerald-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-primary">{act.title}</span>
                    <span className="text-[11px] text-tertiary">
                      {new Date(act.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {act.metadata?.percentage !== undefined && (
                    <span className="text-[11px] text-secondary">
                      Score: {act.metadata.percentage}% • {act.metadata.passed ? 'Passed' : 'Needs Review'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
