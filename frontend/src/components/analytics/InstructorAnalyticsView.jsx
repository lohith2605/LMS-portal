import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BookOpen,
  Users,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { analyticsService } from '../../services/api';

export default function InstructorAnalyticsView() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
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
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-border-subtle rounded-3xl p-10 text-center animate-pulse">
        <div className="w-10 h-10 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Aggregating teaching analytics across your courses...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-950">
        <AlertCircle size={32} className="mx-auto text-rose-600 mb-3" />
        <h3 className="text-sm font-bold mb-1">Could not load teaching analytics</h3>
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
    overview,
    courseStatusBreakdown,
    progressDistribution,
    assignmentStats,
    quizStats,
    coursesPerformance,
  } = analytics;

  const totalCohort = progressDistribution.total || 1;
  const p0To25 = Math.round((progressDistribution.tier0To25 / totalCohort) * 100);
  const p26To50 = Math.round((progressDistribution.tier26To50 / totalCohort) * 100);
  const p51To75 = Math.round((progressDistribution.tier51To75 / totalCohort) * 100);
  const p76To100 = Math.round((progressDistribution.tier76To100 / totalCohort) * 100);

  return (
    <div className="space-y-8">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Learners</span>
            <Users size={16} className="text-accent-blue-dark" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {overview.totalLearners}
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            {overview.totalEnrollments} course enrollments
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
          <p className="text-[11px] text-tertiary mt-1">
            {overview.completedEnrollments} completed • {overview.activeEnrollments} active
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Grading</span>
            <Clock size={16} className={overview.pendingGrading > 0 ? 'text-amber-600' : 'text-slate-400'} />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {overview.pendingGrading}
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            Submissions awaiting review
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Courses Owned</span>
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {overview.totalCourses}
          </div>
          <p className="text-[11px] text-tertiary mt-1">
            {overview.publishedCourses} published • {courseStatusBreakdown.draft} draft
          </p>
        </div>
      </div>

      {/* Cohort Progress Distribution */}
      <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-primary tracking-tight">
              Cohort Progress Distribution
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Breakdown of all enrolled students across your courses by lesson completion tier
            </p>
          </div>
          <span className="text-xs font-bold text-secondary bg-slate-100 px-3 py-1 rounded-full">
            {progressDistribution.total} Total Learners
          </span>
        </div>

        {/* Segmented Distribution Bar */}
        <div className="h-4 w-full bg-slate-100 rounded-full flex overflow-hidden mb-6">
          <div
            title={`0-25%: ${progressDistribution.tier0To25} students`}
            style={{ width: `${progressDistribution.total > 0 ? (progressDistribution.tier0To25 / progressDistribution.total) * 100 : 25}%` }}
            className="bg-rose-400 h-full transition-all duration-500"
          />
          <div
            title={`26-50%: ${progressDistribution.tier26To50} students`}
            style={{ width: `${progressDistribution.total > 0 ? (progressDistribution.tier26To50 / progressDistribution.total) * 100 : 25}%` }}
            className="bg-amber-400 h-full transition-all duration-500"
          />
          <div
            title={`51-75%: ${progressDistribution.tier51To75} students`}
            style={{ width: `${progressDistribution.total > 0 ? (progressDistribution.tier51To75 / progressDistribution.total) * 100 : 25}%` }}
            className="bg-sky-400 h-full transition-all duration-500"
          />
          <div
            title={`76-100%: ${progressDistribution.tier76To100} students`}
            style={{ width: `${progressDistribution.total > 0 ? (progressDistribution.tier76To100 / progressDistribution.total) * 100 : 25}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
          />
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="text-xs font-bold text-rose-900">0% – 25%</span>
            </div>
            <div className="text-xl font-extrabold text-rose-950">
              {progressDistribution.tier0To25}
              <span className="text-xs font-normal text-rose-700 ml-1">
                ({progressDistribution.total > 0 ? p0To25 : 0}%)
              </span>
            </div>
            <span className="text-[10px] text-rose-700 block mt-0.5">Early Stage</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-amber-900">26% – 50%</span>
            </div>
            <div className="text-xl font-extrabold text-amber-950">
              {progressDistribution.tier26To50}
              <span className="text-xs font-normal text-amber-700 ml-1">
                ({progressDistribution.total > 0 ? p26To50 : 0}%)
              </span>
            </div>
            <span className="text-[10px] text-amber-700 block mt-0.5">Underway</span>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span className="text-xs font-bold text-sky-900">51% – 75%</span>
            </div>
            <div className="text-xl font-extrabold text-sky-950">
              {progressDistribution.tier51To75}
              <span className="text-xs font-normal text-sky-700 ml-1">
                ({progressDistribution.total > 0 ? p51To75 : 0}%)
              </span>
            </div>
            <span className="text-[10px] text-sky-700 block mt-0.5">Advanced</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-900">76% – 100%</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-950">
              {progressDistribution.tier76To100}
              <span className="text-xs font-normal text-emerald-700 ml-1">
                ({progressDistribution.total > 0 ? p76To100 : 0}%)
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Near Completion</span>
          </div>
        </div>
      </div>

      {/* Assessment Velocity & Quiz Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assignment Velocity */}
        <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" />
              <span>Assignment Velocity</span>
            </h3>
            <span className="text-xs text-secondary font-semibold">
              {assignmentStats.totalAssignments} Created
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Total Submissions
              </span>
              <span className="text-lg font-extrabold text-primary">
                {assignmentStats.totalSubmissions}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Class Avg Grade
              </span>
              <span className="text-lg font-extrabold text-primary">
                {assignmentStats.gradedSubmissions > 0 ? `${assignmentStats.averageGrade}%` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="text-xs text-secondary space-y-1">
            <div className="flex justify-between">
              <span>Graded Submissions:</span>
              <span className="font-semibold text-primary">{assignmentStats.gradedSubmissions}</span>
            </div>
            <div className="flex justify-between">
              <span>Submissions Awaiting Grading:</span>
              <span className="font-semibold text-amber-600">{assignmentStats.pendingGrading}</span>
            </div>
          </div>
        </div>

        {/* Quiz Pass Rate & Performance */}
        <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <HelpCircle size={16} className="text-amber-600" />
              <span>Quiz Mastery</span>
            </h3>
            <span className="text-xs text-secondary font-semibold">
              {quizStats.totalQuizzes} Quizzes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Pass Rate
              </span>
              <span className="text-lg font-extrabold text-emerald-600">
                {quizStats.totalAttempts > 0 ? `${quizStats.passRate}%` : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-border-subtle rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Average Score
              </span>
              <span className="text-lg font-extrabold text-primary">
                {quizStats.totalAttempts > 0 ? `${quizStats.averageScore}%` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="text-xs text-secondary space-y-1">
            <div className="flex justify-between">
              <span>Passed Attempts:</span>
              <span className="font-semibold text-primary">{quizStats.passedAttempts}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Attempts:</span>
              <span className="font-semibold text-primary">{quizStats.totalAttempts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Course Performance Comparison Table */}
      <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
        <h3 className="text-base font-extrabold text-primary tracking-tight mb-1">
          Course Portfolio Performance
        </h3>
        <p className="text-xs text-secondary mb-6">
          Real enrollment metrics and completion performance for each course you teach
        </p>

        {coursesPerformance.length === 0 ? (
          <div className="text-center py-8 text-secondary text-xs">
            No courses found. Create your first course to begin tracking analytics.
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
                {coursesPerformance.map((course) => (
                  <tr key={course.courseId} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-primary">{course.title}</div>
                      <div className="text-[10px] text-tertiary">{course.category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          course.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : course.status === 'draft'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
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
                      {course.completionRate}%
                    </td>
                    <td className="py-3.5 pl-4 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-accent-blue h-full rounded-full"
                            style={{ width: `${course.averageProgress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-primary">
                          {course.averageProgress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
