import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Award,
  Users,
  CheckCircle2,
  XCircle,
  BarChart2,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { quizService } from '../../services/api';

export default function QuizAnalyticsModal({ quiz, quizId: propQuizId, onClose }) {
  const targetQuizId = quiz?._id || propQuizId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!targetQuizId) {
      setError('Quiz identifier is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await quizService.getQuizAnalytics(targetQuizId);
      setAnalytics(res);
    } catch (err) {
      setError(err?.normalizedMessage || 'Failed to retrieve quiz analytics and submission results.');
    } finally {
      setLoading(false);
    }
  }, [targetQuizId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const quizTitle = analytics?.quiz?.title || quiz?.title || 'Quiz Assessment';
  const passingPercentage = analytics?.quiz?.passingPercentage ?? quiz?.passingPercentage ?? 70;
  const stats = analytics?.stats || {
    totalCompleted: 0,
    passedCount: 0,
    passRate: 0,
    averagePercentage: 0,
  };
  const recentAttempts = analytics?.recentAttempts || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#171717]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-analytics-title"
    >
      <div className="bg-white border border-[#E4E4E1] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E4E4E1] flex items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cobalt-soft text-cobalt flex items-center justify-center shrink-0">
              <BarChart2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="quiz-analytics-title"
                  className="text-sm sm:text-base font-bold text-primary truncate"
                >
                  {quizTitle}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-subtle text-secondary border border-border-subtle shrink-0">
                  Pass Mark: {passingPercentage}%
                </span>
              </div>
              <p className="text-[11px] text-secondary truncate">
                Learner submission results, grade distributions, and proficiency metrics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-surface-subtle transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-secondary">Loading learner analytics and attempts...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span className="font-semibold">Unable to load analytics</span>
              </div>
              <p className="text-[11px] text-rose-700">{error}</p>
              <button
                type="button"
                onClick={fetchAnalytics}
                disabled={loading}
                className="mt-2 px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-800 hover:bg-rose-100 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Analytics Content */}
          {!loading && !error && (
            <>
              {/* Aggregate KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-surface-subtle rounded-xl border border-border-subtle">
                  <div className="flex items-center justify-between text-tertiary mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Completed</span>
                    <Users size={13} className="text-cobalt" />
                  </div>
                  <span className="text-xl font-bold text-primary block">
                    {stats.totalCompleted}
                  </span>
                  <span className="text-[10px] text-secondary mt-0.5 block">
                    {stats.totalCompleted === 1 ? 'Total attempt' : 'Total attempts'}
                  </span>
                </div>

                <div className="p-3.5 bg-surface-subtle rounded-xl border border-border-subtle">
                  <div className="flex items-center justify-between text-tertiary mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Pass Rate</span>
                    <Award size={13} className="text-emerald-600" />
                  </div>
                  <span className="text-xl font-bold text-emerald-700 block">
                    {stats.passRate}%
                  </span>
                  <span className="text-[10px] text-secondary mt-0.5 block">
                    {stats.passedCount} of {stats.totalCompleted} passed
                  </span>
                </div>

                <div className="p-3.5 bg-surface-subtle rounded-xl border border-border-subtle">
                  <div className="flex items-center justify-between text-tertiary mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Average Score</span>
                    <TrendingUp size={13} className="text-cobalt" />
                  </div>
                  <span className="text-xl font-bold text-primary block">
                    {stats.averagePercentage}%
                  </span>
                  <span className="text-[10px] text-secondary mt-0.5 block">
                    Across all submissions
                  </span>
                </div>

                <div className="p-3.5 bg-surface-subtle rounded-xl border border-border-subtle">
                  <div className="flex items-center justify-between text-tertiary mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Passing Mark</span>
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  </div>
                  <span className="text-xl font-bold text-primary block">
                    {passingPercentage}%
                  </span>
                  <span className="text-[10px] text-secondary mt-0.5 block">
                    Configured threshold
                  </span>
                </div>
              </div>

              {/* Submissions Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                    Recent Learner Submissions ({recentAttempts.length})
                  </h3>
                  <button
                    type="button"
                    onClick={fetchAnalytics}
                    disabled={loading}
                    className="text-[11px] text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={11} />
                    <span>Refresh</span>
                  </button>
                </div>

                {recentAttempts.length === 0 ? (
                  <div className="p-8 border border-dashed border-border-subtle rounded-xl text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-surface-subtle text-tertiary flex items-center justify-center mx-auto">
                      <Clock size={18} />
                    </div>
                    <p className="font-semibold text-primary">No submissions recorded yet</p>
                    <p className="text-[11px] text-secondary max-w-sm mx-auto">
                      When enrolled learners take and submit this assessment, their scores, attempt numbers, and pass/fail evaluations will be displayed here in real time.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border-subtle rounded-xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-subtle text-secondary text-[10px] uppercase font-bold tracking-wider border-b border-border-subtle">
                          <tr>
                            <th className="py-2.5 px-4">Student</th>
                            <th className="py-2.5 px-3">Attempt</th>
                            <th className="py-2.5 px-3">Score</th>
                            <th className="py-2.5 px-3">Percentage</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-4 text-right">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {recentAttempts.map((att) => {
                            const isPassed = Boolean(att.passed);
                            const submittedDate = att.submittedAt
                              ? new Date(att.submittedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—';

                            return (
                              <tr key={att.id} className="hover:bg-surface-subtle/50 transition">
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-primary">
                                    {att.studentName || 'Student'}
                                  </div>
                                  <div className="text-[10px] text-tertiary font-mono">
                                    {att.studentEmail || 'No email provided'}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-secondary font-medium">
                                  #{att.attemptNumber || 1}
                                </td>
                                <td className="py-3 px-3 text-primary font-semibold">
                                  {att.score} / {att.maxScore} <span className="text-[10px] text-tertiary font-normal">pts</span>
                                </td>
                                <td className="py-3 px-3 font-bold text-primary">
                                  {att.percentage}%
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      isPassed
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-50 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {isPassed ? (
                                      <>
                                        <CheckCircle2 size={10} className="shrink-0" />
                                        <span>Passed</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle size={10} className="shrink-0" />
                                        <span>Failed</span>
                                      </>
                                    )}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right text-secondary text-[11px] whitespace-nowrap">
                                  {submittedDate}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E4E4E1] bg-surface-subtle/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-secondary">
            {!loading && !error && recentAttempts.length > 0
              ? `Showing ${recentAttempts.length} completed ${recentAttempts.length === 1 ? 'submission' : 'submissions'}`
              : 'Objective question auto-grading engine'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-border-subtle bg-white text-xs font-semibold text-primary hover:bg-surface-subtle transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

