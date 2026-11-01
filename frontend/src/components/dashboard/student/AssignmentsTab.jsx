import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import { assignmentService } from '../../../services/api';
import EmptyState from '../EmptyState';
import LoadingState from '../LoadingState';
import AssignmentSubmissionModal from '../AssignmentSubmissionModal';

export default function AssignmentsTab({ setActiveTab, onRefreshData }) {
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState(null);
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [selectedAssignmentForSubmission, setSelectedAssignmentForSubmission] = useState(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true);
      setAssignmentError(null);
      const res = await assignmentService.getStudentAssignments();
      setAssignments(res?.assignments || []);
    } catch (err) {
      setAssignmentError(err.normalizedMessage || 'Failed to load assignments.');
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredAssignments = assignments.filter((a) => {
    if (assignmentFilter === 'pending') {
      return a.submissionStatus === 'not_submitted' && !a.isOverdue;
    }
    if (assignmentFilter === 'submitted') {
      return a.submissionStatus === 'submitted' || a.submissionStatus === 'late';
    }
    if (assignmentFilter === 'graded') {
      return a.submissionStatus === 'graded';
    }
    if (assignmentFilter === 'overdue') {
      return a.isOverdue && a.submissionStatus === 'not_submitted';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-primary mb-1">
            Assignments & Lab Submissions
          </h2>
          <p className="text-xs text-secondary">
            Review assigned tasks, submit text responses and project files, and view educator evaluations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchAssignments()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
        >
          <span>Refresh Tasks</span>
        </button>
      </div>

      {assignmentError && (
        <div className="p-3.5 rounded-xl border bg-rose-50 text-rose-800 border-rose-200 text-xs flex items-center justify-between">
          <span>{assignmentError}</span>
          <button
            type="button"
            onClick={() => setAssignmentError(null)}
            className="font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Assignments' },
          { id: 'pending', label: 'Pending Action' },
          { id: 'submitted', label: 'Awaiting Grade' },
          { id: 'graded', label: 'Evaluated & Graded' },
          { id: 'overdue', label: 'Overdue Tasks' },
        ].map((f) => {
          const count =
            f.id === 'all'
              ? assignments.length
              : f.id === 'pending'
              ? assignments.filter((a) => a.submissionStatus === 'not_submitted' && !a.isOverdue).length
              : f.id === 'submitted'
              ? assignments.filter((a) => a.submissionStatus === 'submitted' || a.submissionStatus === 'late').length
              : f.id === 'graded'
              ? assignments.filter((a) => a.submissionStatus === 'graded').length
              : assignments.filter((a) => a.isOverdue && a.submissionStatus === 'not_submitted').length;

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setAssignmentFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                assignmentFilter === f.id
                  ? 'bg-cobalt text-white shadow-xs shadow-cobalt/20'
                  : 'bg-white border border-border-subtle text-secondary hover:text-primary'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  assignmentFilter === f.id
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-subtle text-secondary'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Assignments List */}
      {assignmentsLoading ? (
        <LoadingState message="Loading your assignments..." cardsCount={3} />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No assignments due at this time"
          description="When instructors publish assignments for your enrolled courses, they will appear here with instructions and deadlines."
          actionLabel="Explore Course Catalog"
          onAction={() => setActiveTab('explore')}
          secondaryActionLabel="Return to Overview"
          onSecondaryAction={() => setActiveTab('overview')}
        />
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`No assignments found under "${assignmentFilter}"`}
          description="Try selecting another filter above to view your tasks."
          actionLabel="View All Assignments"
          onAction={() => setAssignmentFilter('all')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((item) => {
            const courseTitle = item.course?.title || 'Enrolled Course';
            const isOverdue = item.isOverdue;
            const isGraded = item.submissionStatus === 'graded';
            const isSubmitted = item.isSubmitted;

            return (
              <div
                key={item._id}
                className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-cobalt/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-subtle text-secondary truncate max-w-[200px]">
                      {courseTitle}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {isGraded ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Graded: {item.grade} / {item.maxMarks}
                        </span>
                      ) : isSubmitted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          Submitted
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                          Overdue
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          Pending
                        </span>
                      )}
                      {item.submission?.isLate && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                          Late
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-primary mb-1">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-secondary line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs text-secondary bg-surface-subtle p-3 rounded-xl mb-3">
                    <div>
                      <span className="text-[10px] uppercase text-tertiary block font-semibold">
                        Deadline
                      </span>
                      <span
                        className={`font-semibold ${
                          isOverdue && !isSubmitted
                            ? 'text-rose-700'
                            : 'text-primary'
                        }`}
                      >
                        {new Date(item.dueDate).toLocaleDateString()}{' '}
                        {new Date(item.dueDate).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-tertiary block font-semibold">
                        Max Marks
                      </span>
                      <span className="font-semibold text-primary">
                        {item.maxMarks} pts
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-tertiary block font-semibold">
                        Allowed Types
                      </span>
                      <span className="font-medium text-primary capitalize">
                        {item.submissionTypes?.join(', ') || 'text'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-tertiary block font-semibold">
                        Status
                      </span>
                      <span className="font-medium text-primary capitalize">
                        {item.submissionStatus?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {isGraded && item.feedback && (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block mb-1">
                        Instructor Feedback
                      </span>
                      <p className="text-xs text-emerald-950 italic line-clamp-2">
                        "{item.feedback}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                  {item.course?.slug ? (
                    <Link
                      to={`/courses/${item.course.slug}/learn`}
                      className="text-xs font-semibold text-secondary hover:text-primary transition"
                    >
                      Course Workspace
                    </Link>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssignmentForSubmission(item);
                      setSubmissionModalOpen(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs ${
                      isGraded
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : isSubmitted
                        ? 'bg-surface-subtle text-primary border border-border-subtle hover:bg-border-subtle'
                        : 'bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20'
                    }`}
                  >
                    <span>
                      {isGraded
                        ? 'View Grade & Evaluation'
                        : isSubmitted
                        ? 'View Submission / Resubmit'
                        : 'Submit Deliverable'}
                    </span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal is kept inside AssignmentsTab */}
      {submissionModalOpen && selectedAssignmentForSubmission && (
        <AssignmentSubmissionModal
          assignment={selectedAssignmentForSubmission}
          isOpen={submissionModalOpen}
          onClose={() => {
            setSubmissionModalOpen(false);
            setSelectedAssignmentForSubmission(null);
          }}
          onSubmitted={() => {
            setSubmissionModalOpen(false);
            setSelectedAssignmentForSubmission(null);
            fetchAssignments();
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
}

