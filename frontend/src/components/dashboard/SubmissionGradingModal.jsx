import React, { useState } from 'react';
import {
  X,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileDown,
  RotateCcw,
  Send,
  User,
  History,
} from 'lucide-react';
import { assignmentService } from '../../services/api';

export default function SubmissionGradingModal({
  submission,
  onClose,
  onGraded,
}) {
  const [grade, setGrade] = useState(
    submission?.grade !== null && submission?.grade !== undefined ? submission.grade : ''
  );
  const [feedback, setFeedback] = useState(submission?.feedback || '');
  const [isGradePublished, setIsGradePublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [returning, setReturning] = useState(false);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const maxMarks = submission?.assignment?.maxMarks || 100;
  const latePenalty = submission?.assignment?.latePenaltyPercent || 0;

  const handleGrade = async (e) => {
    e.preventDefault();
    const gradeNum = Number(grade);
    if (isNaN(gradeNum) || gradeNum < 0) {
      setError('Please enter a valid non-negative mark.');
      return;
    }
    if (gradeNum > maxMarks) {
      setError(`Awarded mark cannot exceed the maximum of ${maxMarks}.`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await assignmentService.gradeSubmission(submission._id, {
        grade: gradeNum,
        feedback,
        isGradePublished,
      });
      if (onGraded) onGraded(res.submission);
      onClose();
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to grade submission.');
    } finally {
      setSaving(false);
    }
  };

  const handleReturnForRevision = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback explaining why this submission is being returned for revision.');
      return;
    }

    try {
      setReturning(true);
      setError(null);
      const res = await assignmentService.returnSubmissionForRevision(submission._id, {
        feedback,
      });
      if (onGraded) onGraded(res.submission);
      onClose();
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to return submission for revision.');
    } finally {
      setReturning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#171717]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-border-subtle rounded-3xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-sage-pale text-accent-sage-dark flex items-center justify-center">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">Evaluate Student Deliverable</h2>
              <p className="text-xs text-secondary">
                {submission?.assignment?.title} • Max {maxMarks} pts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-border-subtle transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Profile Card */}
          <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                {submission?.student?.name ? submission.student.name[0] : 'S'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary">{submission?.student?.name}</h4>
                <p className="text-[11px] text-secondary">{submission?.student?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-secondary px-2.5 py-1 rounded-lg bg-white border border-border-subtle">
                Version #{submission?.version || 1}
              </span>

              {submission?.isLate ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                  <Clock size={12} /> Late Submission {latePenalty > 0 ? `(-${latePenalty}%)` : ''}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={12} /> On Time
                </span>
              )}

              <span className="text-[11px] text-tertiary">
                {new Date(submission?.submittedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Submitted Deliverables: Written Text */}
          {submission?.submissionText && (
            <div className="space-y-2">
              <h4 className="font-bold text-primary uppercase text-[10px] tracking-wider text-secondary flex items-center gap-1.5">
                <FileText size={13} />
                <span>Written Response</span>
              </h4>
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle text-primary whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {submission.submissionText}
              </div>
            </div>
          )}

          {/* Submitted Deliverables: Files */}
          {submission?.submittedFiles && submission.submittedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-primary uppercase text-[10px] tracking-wider text-secondary flex items-center gap-1.5">
                <FileDown size={13} />
                <span>Attached Files ({submission.submittedFiles.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {submission.submittedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-primary truncate">{file.originalName}</p>
                      <p className="text-[10px] text-tertiary">
                        {Math.round(file.fileSize / 1024)} KB • {file.mimeType}
                      </p>
                    </div>
                    <a
                      href={assignmentService.getFileDownloadUrl(file.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-cobalt text-white text-[11px] font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed transition shrink-0 shadow-sm shadow-cobalt/20"
                    >
                      View / Open
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version History Toggle if resubmissions exist */}
          {submission?.history && submission.history.length > 0 && (
            <div className="border border-border-subtle rounded-2xl p-4 bg-white">
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className="w-full flex items-center justify-between text-left font-bold text-primary hover:text-secondary cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <History size={14} className="text-secondary" />
                  <span>Previous Submission Versions ({submission.history.length})</span>
                </div>
                <span>{showHistory ? '▲ Hide' : '▼ View History'}</span>
              </button>

              {showHistory && (
                <div className="mt-4 space-y-3 pt-3 border-t border-border-subtle">
                  {submission.history.map((h, i) => (
                    <div key={i} className="p-3 bg-surface-subtle rounded-xl border border-border-subtle space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-primary">Version #{h.version}</span>
                        <span className="text-tertiary">{new Date(h.submittedAt).toLocaleString()}</span>
                      </div>
                      {h.submissionText && (
                        <p className="text-secondary line-clamp-2 italic">{h.submissionText}</p>
                      )}
                      {h.submittedFiles && h.submittedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {h.submittedFiles.map((hf, hIdx) => (
                            <a
                              key={hIdx}
                              href={assignmentService.getFileDownloadUrl(hf.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary underline hover:text-secondary"
                            >
                              <FileDown size={11} />
                              <span>{hf.originalName}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grading Input Form */}
          <form onSubmit={handleGrade} className="space-y-4 pt-2">
            <div className="p-5 rounded-2xl bg-white border-2 border-primary/20 space-y-4 shadow-xs">
              <h4 className="font-bold text-primary uppercase text-[10px] tracking-wider text-secondary">
                Grading Rubric & Feedback
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-primary mb-1">
                    Awarded Mark (out of {maxMarks}) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={maxMarks}
                    required
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder={`0 - ${maxMarks}`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm font-bold text-primary focus:outline-none focus:bg-white focus:border-primary"
                  />
                  {submission?.isLate && latePenalty > 0 && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      Late submission: A {latePenalty}% penalty will be applied to this score on save.
                    </p>
                  )}
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 font-medium text-primary cursor-pointer mt-4 sm:mt-0">
                    <input
                      type="checkbox"
                      checked={isGradePublished}
                      onChange={(e) => setIsGradePublished(e.target.checked)}
                      className="rounded border-border-subtle text-primary focus:ring-primary"
                    />
                    <span>Publish grade immediately to student</span>
                  </label>
                  <p className="text-[10px] text-tertiary mt-1">
                    If unchecked, grade is saved as draft and hidden from student until published.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-primary mb-1">
                  Qualitative Feedback & Comments
                </label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback, strengths, and areas for improvement..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReturnForRevision}
                disabled={returning || saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-semibold hover:bg-amber-100 transition cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={14} />
                <span>{returning ? 'Returning...' : 'Return for Revision'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle font-semibold text-secondary hover:text-primary transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || returning}
                  className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-cobalt text-white font-bold hover:bg-cobalt-hover active:bg-cobalt-pressed transition cursor-pointer shadow-sm shadow-cobalt/20 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{saving ? 'Saving...' : 'Submit Evaluation'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
