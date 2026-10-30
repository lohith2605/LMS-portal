import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Users,
  FileCheck,
  Clock,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Layers,
  X,
  KeyRound,
  GraduationCap,
  Award,
  Trash2,
  Edit3,
  FileText,
  Archive,
  Paperclip,
  Eye,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import {
  dashboardService,
  authService,
  instructorCourseService,
  quizService,
  assignmentService,
} from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import MetricCard from '../components/dashboard/MetricCard';
import EmptyState from '../components/dashboard/EmptyState';
import LoadingState from '../components/dashboard/LoadingState';
import ErrorState from '../components/dashboard/ErrorState';
import CourseStudio from '../components/dashboard/CourseStudio';
import QuizStudioModal from '../components/dashboard/QuizStudioModal';
import AssignmentStudioModal from '../components/dashboard/AssignmentStudioModal';
import SubmissionGradingModal from '../components/dashboard/SubmissionGradingModal';
import InstructorAnalyticsView from '../components/analytics/InstructorAnalyticsView';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phase 4 Course Creation Studio State
  const [courseStudioModalOpen, setCourseStudioModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseActionLoading, setCourseActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Phase 5 Assessment Quiz State
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizCourseId, setQuizCourseId] = useState('');
  const [selectedAssessmentCourse, setSelectedAssessmentCourse] = useState('all');
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState(null);

  // Phase 6 Assignment Studio State
  const [assignmentStudioModalOpen, setAssignmentStudioModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [assignmentCourseId, setAssignmentCourseId] = useState('');
  const [selectedAssignmentCourse, setSelectedAssignmentCourse] = useState('all');
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState(null);
  const [assignmentError, setAssignmentError] = useState(null);

  // Phase 6 Grading Review State
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [selectedSubmissionFilter, setSelectedSubmissionFilter] = useState('all');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwFeedback, setPwFeedback] = useState({ type: '', text: '' });

  const fetchInstructorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getInstructorOverview();
      setData(res);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to load instructor console.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuizzes = useCallback(async (courseIdToFetch) => {
    try {
      setQuizzesLoading(true);
      setQuizFeedback(null);
      if (courseIdToFetch && courseIdToFetch !== 'all') {
        const res = await quizService.getInstructorQuizzes(courseIdToFetch);
        setCourseQuizzes(res?.quizzes || []);
      } else {
        const courses = data?.courses || [];
        if (courses.length > 0) {
          const promises = courses.map((c) =>
            quizService.getInstructorQuizzes(c._id).catch(() => ({ quizzes: [] }))
          );
          const results = await Promise.all(promises);
          const combined = results.flatMap((r) => r.quizzes || []);
          setCourseQuizzes(combined);
        } else {
          setCourseQuizzes([]);
        }
      }
    } catch (err) {
      setQuizFeedback({ type: 'error', text: err.normalizedMessage || 'Failed to load quizzes.' });
    } finally {
      setQuizzesLoading(false);
    }
  }, [data?.courses]);

  const fetchAssignments = useCallback(async (courseIdToFetch) => {
    try {
      setAssignmentsLoading(true);
      setAssignmentFeedback(null);
      setAssignmentError(null);
      const res = await assignmentService.getCourseAssignmentsForInstructor(courseIdToFetch);
      setCourseAssignments(res?.assignments || []);
    } catch (err) {
      const errorMsg =
        err.normalizedMessage ||
        err.response?.data?.error ||
        err.message ||
        'Failed to load assignments.';
      setAssignmentError(errorMsg);
      setAssignmentFeedback({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      setSubmissionsLoading(true);
      const res = await assignmentService.getCourseAssignmentsForInstructor('all').catch(() => ({ assignments: [] }));
      const allAssignments = res?.assignments || [];

      if (allAssignments.length > 0) {
        const subPromises = allAssignments.map((a) =>
          assignmentService.getAssignmentSubmissions(a._id).catch(() => ({ submissions: [] }))
        );
        const subResults = await Promise.all(subPromises);
        const combined = subResults.flatMap((r) => r.submissions || []);
        setSubmissionsList(combined);
      } else {
        setSubmissionsList([]);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    dashboardService
      .getInstructorOverview()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.normalizedMessage || 'Failed to load instructor console.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'assessments' && data?.courses) {
      fetchQuizzes(selectedAssessmentCourse);
    }
  }, [activeTab, selectedAssessmentCourse, data?.courses, fetchQuizzes]);

  useEffect(() => {
    if (activeTab === 'assignments') {
      fetchAssignments(selectedAssignmentCourse);
    }
  }, [activeTab, selectedAssignmentCourse, fetchAssignments]);

  useEffect(() => {
    if (activeTab === 'reviews' && data?.courses) {
      fetchSubmissions();
    }
  }, [activeTab, data?.courses, fetchSubmissions]);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Educator';
  const isApproved = user?.accountStatus === 'active' && data?.isApproved !== false;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwFeedback({ type: '', text: '' });

    if (newPassword.length < 8) {
      setPwFeedback({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setPwLoading(true);
      const res = await authService.changePassword({ currentPassword, newPassword });
      setPwFeedback({ type: 'success', text: res.message || 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwFeedback({ type: 'error', text: err.normalizedMessage || 'Failed to change password.' });
    } finally {
      setPwLoading(false);
    }
  };

  const handleOpenStudio = (courseId = null) => {
    setSelectedCourseId(courseId);
    setCourseStudioModalOpen(true);
    setActiveTab('courses');
  };

  const handleCloseStudio = () => {
    setCourseStudioModalOpen(false);
    setSelectedCourseId(null);
  };

  const handleViewCourses = () => {
    setCourseStudioModalOpen(false);
    setSelectedCourseId(null);
    setActiveTab('courses');
  };

  const handleCourseSaved = () => {
    fetchInstructorData();
  };

  const handleSubmitCourseForReview = async (courseId) => {
    try {
      setCourseActionLoading(true);
      setActionFeedback(null);
      const res = await instructorCourseService.submitForReview(courseId);
      setActionFeedback({ type: 'success', text: res.message || 'Course submitted for review!' });
      fetchInstructorData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.normalizedMessage || 'Failed to submit course for review.' });
    } finally {
      setCourseActionLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, title) => {
    if (!window.confirm(`Are you sure you want to delete or archive "${title}"?`)) return;
    try {
      setCourseActionLoading(true);
      setActionFeedback(null);
      const res = await instructorCourseService.deleteCourse(courseId);
      setActionFeedback({ type: 'success', text: res.message || 'Course updated.' });
      fetchInstructorData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.normalizedMessage || 'Failed to delete course.' });
    } finally {
      setCourseActionLoading(false);
    }
  };

  const handleOpenCreateQuiz = (courseId = null) => {
    setSelectedQuizId(null);
    const targetCourseId =
      courseId ||
      (selectedAssessmentCourse !== 'all' ? selectedAssessmentCourse : data?.courses?.[0]?._id);
    setQuizCourseId(targetCourseId || '');
    setQuizModalOpen(true);
  };

  const handleEditQuiz = (quiz) => {
    setSelectedQuizId(quiz._id);
    const cId = typeof quiz.course === 'object' ? quiz.course?._id : quiz.course;
    setQuizCourseId(cId || '');
    setQuizModalOpen(true);
  };

  const handleTogglePublishQuiz = async (quiz) => {
    try {
      setQuizzesLoading(true);
      setQuizFeedback(null);
      const cId = typeof quiz.course === 'object' ? quiz.course?._id : quiz.course;
      let res;
      if (quiz.isPublished) {
        res = await quizService.unpublishQuiz(cId, quiz._id);
      } else {
        res = await quizService.publishQuiz(cId, quiz._id);
      }
      setQuizFeedback({ type: 'success', text: res.message || 'Quiz publication status updated.' });
      fetchQuizzes(selectedAssessmentCourse);
    } catch (err) {
      setQuizFeedback({ type: 'error', text: err.normalizedMessage || 'Failed to update quiz status.' });
    } finally {
      setQuizzesLoading(false);
    }
  };

  const handleDeleteQuiz = async (quiz) => {
    if (!window.confirm(`Are you sure you want to delete quiz "${quiz.title}"?`)) return;
    try {
      setQuizzesLoading(true);
      setQuizFeedback(null);
      const cId = typeof quiz.course === 'object' ? quiz.course?._id : quiz.course;
      const res = await quizService.deleteQuiz(cId, quiz._id);
      setQuizFeedback({ type: 'success', text: res.message || 'Quiz deleted successfully.' });
      fetchQuizzes(selectedAssessmentCourse);
    } catch (err) {
      setQuizFeedback({ type: 'error', text: err.normalizedMessage || 'Failed to delete quiz.' });
    } finally {
      setQuizzesLoading(false);
    }
  };

  const handleOpenCreateAssignment = (courseId = null) => {
    if (!isApproved) {
      alert('Your educator account is pending administrative approval. You cannot create or publish assignments until approved.');
      return;
    }
    const defaultCourse = courseId || (data?.courses?.[0]?._id || '');
    setAssignmentCourseId(defaultCourse);
    setSelectedAssignmentId(null);
    setAssignmentStudioModalOpen(true);
  };

  const handleEditAssignment = (assignment) => {
    const cid = typeof assignment.course === 'object' ? assignment.course?._id : assignment.course;
    setAssignmentCourseId(cid);
    setSelectedAssignmentId(assignment._id);
    setAssignmentStudioModalOpen(true);
  };

  const handleTogglePublishAssignment = async (assignment) => {
    try {
      setAssignmentsLoading(true);
      setAssignmentFeedback(null);
      if (assignment.status === 'published') {
        await assignmentService.archiveAssignment(assignment._id);
      } else {
        await assignmentService.publishAssignment(assignment._id);
      }
      setAssignmentFeedback({
        type: 'success',
        text: `Assignment status updated to ${assignment.status === 'published' ? 'archived' : 'published'}.`,
      });
      fetchAssignments(selectedAssignmentCourse);
    } catch (err) {
      setAssignmentFeedback({
        type: 'error',
        text: err.normalizedMessage || 'Failed to update assignment status.',
      });
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignment) => {
    if (!window.confirm(`Are you sure you want to delete assignment "${assignment.title}"?`)) return;
    try {
      setAssignmentsLoading(true);
      setAssignmentFeedback(null);
      await assignmentService.deleteAssignment(assignment._id);
      setAssignmentFeedback({
        type: 'success',
        text: 'Assignment deleted successfully.',
      });
      fetchAssignments(selectedAssignmentCourse);
    } catch (err) {
      setAssignmentFeedback({
        type: 'error',
        text: err.normalizedMessage || 'Cannot delete assignment with submissions.',
      });
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleOpenGrading = (submissionId) => {
    setSelectedSubmissionId(submissionId);
    setGradingModalOpen(true);
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      announcements={data?.announcements || []}
    >
      {loading ? (
        <LoadingState message="Loading instructor teaching metrics..." cardsCount={4} />
      ) : error ? (
        <ErrorState
          title="Could not load instructor workspace"
          message={error}
          onRetry={fetchInstructorData}
        />
      ) : (
        <div className="space-y-8">
          {/* Approval Status Alert: If Pending */}
          {!isApproved && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      Approval Pending
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-amber-950">
                      Instructor Credentials Under Review
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-3xl">
                    Your educator account is currently in <strong>pending</strong> status. An administrator must review your application and approve your profile before course publishing, cohort management, and student assignment grading are unlocked.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-amber-900 font-medium">
                    <span>Applicant: <strong>{user?.email}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="uppercase">{user?.accountStatus}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Banner */}
          {activeTab === 'overview' && (
            <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs relative overflow-hidden">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent-sage-dark mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sage-dark" />
                  <span>Instructor Teaching Workspace</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                  Welcome back, {firstName}
                </h1>

                <p className="text-xs sm:text-sm text-secondary mt-1.5 leading-relaxed">
                  Manage your courses, support your learners, and review their progress.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => handleOpenStudio()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer shadow-xs"
                  >
                    <PlusCircle size={14} />
                    <span>Create Course</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleViewCourses}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition-all cursor-pointer"
                  >
                    <BookOpen size={13} />
                    <span>View My Courses</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Teaching Overview Metrics */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                  Teaching Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Created Courses"
                    value={data?.overview?.createdCoursesCount ?? 0}
                    subtitle="Drafted & active modules"
                    icon={BookOpen}
                    badge={isApproved ? 'Studio Ready' : 'Restricted'}
                    badgeType={isApproved ? 'sage' : 'amber'}
                    onClick={handleViewCourses}
                  />
                  <MetricCard
                    title="Published Courses"
                    value={data?.overview?.publishedCoursesCount ?? 0}
                    subtitle="Publicly accessible to learners"
                    icon={Layers}
                    badge="Public"
                    badgeType="default"
                    onClick={handleViewCourses}
                  />
                  <MetricCard
                    title="Total Learners"
                    value={data?.overview?.totalLearnersCount ?? 0}
                    subtitle="Enrolled across active cohorts"
                    icon={Users}
                    badge="Cohort"
                    badgeType="blue"
                    onClick={() => setActiveTab('learners')}
                  />
                  <MetricCard
                    title="Pending Reviews"
                    value={data?.overview?.pendingReviewsCount ?? 0}
                    subtitle="Submissions awaiting feedback"
                    icon={FileCheck}
                    badge={data?.overview?.pendingReviewsCount > 0 ? 'Action Req' : 'Zero Backlog'}
                    badgeType={data?.overview?.pendingReviewsCount > 0 ? 'amber' : 'sage'}
                    onClick={() => setActiveTab('reviews')}
                  />
                </div>
              </div>

              {/* My Courses & Submissions Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* My Courses Summary */}
                <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-accent-sage-dark" />
                        <h3 className="text-sm font-bold text-primary">My Courses</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-secondary">
                        {data?.courses?.length || 0} active
                      </span>
                    </div>

                    {data?.courses && data.courses.length > 0 ? (
                      <div className="space-y-3">
                        {data.courses.slice(0, 3).map((c) => (
                          <div
                            key={c._id}
                            className="p-3 bg-surface-subtle border border-border-subtle rounded-xl flex items-center justify-between"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <h5 className="text-xs font-bold text-primary truncate">{c.title}</h5>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-secondary">
                                <span className="capitalize">{c.status.replace('_', ' ')}</span>
                                <span>•</span>
                                <span>{c.totalLessons} lessons</span>
                                <span>•</span>
                                <span>{c.enrolledCount} learners</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenStudio(c._id)}
                              className="text-xs font-semibold text-accent-blue-dark hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        ))}
                        {data.courses.length > 3 && (
                          <button
                            type="button"
                            onClick={handleViewCourses}
                            className="text-xs text-secondary hover:text-primary font-medium w-full text-center mt-2 cursor-pointer"
                          >
                            View all {data.courses.length} courses &rarr;
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-10 h-10 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary mx-auto mb-3">
                          <BookOpen size={18} />
                        </div>
                        <h4 className="text-xs font-bold text-primary mb-1">
                          Your teaching workspace is ready.
                        </h4>
                        <p className="text-[11px] text-secondary max-w-xs mx-auto leading-relaxed mb-4">
                          Assemble curriculum modules, add interactive lessons, and publish to the student catalog.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenStudio()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer"
                        >
                          <PlusCircle size={13} />
                          <span>Create Course</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Submissions */}
                <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                      <div className="flex items-center gap-2">
                        <FileCheck size={16} className="text-accent-blue-dark" />
                        <h3 className="text-sm font-bold text-primary">Pending Submissions</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-secondary">
                        {data?.pendingSubmissions?.length || 0} awaiting review
                      </span>
                    </div>

                    <div className="text-center py-8">
                      <div className="w-10 h-10 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary mx-auto mb-3">
                        <FileCheck size={18} />
                      </div>
                      <h4 className="text-xs font-bold text-primary mb-1">
                        No submissions awaiting review.
                      </h4>
                      <p className="text-[11px] text-secondary max-w-xs mx-auto leading-relaxed">
                        Student assignment submissions will populate here when cohorts submit code reviews and project deliverables.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Progress & Cohort Analytics */}
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-accent-blue-dark" />
                    <h3 className="text-sm font-bold text-primary">
                      Cohort Velocity & Progress Analytics
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-secondary">Phase 4 Roadmap</span>
                </div>

                <div className="p-6 rounded-xl bg-surface-subtle border border-border-subtle text-center">
                  <p className="text-xs font-bold text-primary mb-1">
                    Telemetry and Cohort Completion Charts
                  </p>
                  <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
                    Granular learner pacing, module completion rates, and assessment histograms will be compiled from live student submissions.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* TAB: TEACHING ANALYTICS */}
          {activeTab === 'analytics' && <InstructorAnalyticsView />}

          {/* TAB: MY COURSES */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              {courseStudioModalOpen ? (
                <CourseStudio
                  courseId={selectedCourseId}
                  onClose={handleCloseStudio}
                  onSaved={handleCourseSaved}
                />
              ) : (
                <>
                  <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-primary mb-1">My Created Courses</h2>
                      <p className="text-xs text-secondary">
                        Author curricula, configure module syllabi, and publish course tracks.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenStudio()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <PlusCircle size={14} />
                      <span>New Course</span>
                    </button>
                  </div>

                  {actionFeedback && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                        actionFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <span>{actionFeedback.text}</span>
                      <button
                        type="button"
                        onClick={() => setActionFeedback(null)}
                        className="font-bold ml-2 cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  )}

                  {/* Filters & Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-subtle border border-border-subtle rounded-xl text-xs">
                      {[
                        { id: 'all', label: 'All Courses' },
                        { id: 'draft', label: 'Draft' },
                        { id: 'pending_review', label: 'Pending Review' },
                        { id: 'published', label: 'Published' },
                        { id: 'rejected', label: 'Rejected' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCourseFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                            courseFilter === tab.id
                              ? 'bg-white text-primary shadow-xs font-semibold'
                              : 'text-secondary hover:text-primary'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        placeholder="Search courses..."
                        className="w-full sm:w-60 px-3 py-1.5 text-xs bg-white border border-border-subtle rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-blue-dark"
                      />
                    </div>
                  </div>

                  {/* Courses List */}
                  {(() => {
                    const filteredCourses = (data?.courses || []).filter((c) => {
                      if (courseFilter !== 'all' && c.status !== courseFilter) return false;
                      if (courseSearch.trim()) {
                        const term = courseSearch.toLowerCase();
                        return (
                          c.title.toLowerCase().includes(term) ||
                          c.summary.toLowerCase().includes(term)
                        );
                      }
                      return true;
                    });

                    if (filteredCourses.length === 0) {
                      return (
                        <EmptyState
                          icon={BookOpen}
                          title={
                            courseFilter !== 'all' || courseSearch
                              ? 'No matching courses found.'
                              : 'Your teaching workspace is ready.'
                          }
                          description={
                            courseFilter !== 'all' || courseSearch
                              ? 'Try adjusting your search query or status filter.'
                              : 'Create your first course to begin assembling modules, lessons, and learning objectives.'
                          }
                          actionLabel="Create First Course"
                          onAction={() => handleOpenStudio()}
                          secondaryActionLabel="Return to Overview"
                          onSecondaryAction={() => setActiveTab('overview')}
                        />
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((c) => (
                          <div
                            key={c._id}
                            className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition flex flex-col justify-between"
                          >
                            <div>
                              <div className="h-36 relative overflow-hidden bg-surface-subtle">
                                {c.thumbnail ? (
                                  <img
                                    src={c.thumbnail}
                                    alt={c.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-secondary">
                                    <BookOpen size={32} />
                                  </div>
                                )}
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize backdrop-blur-sm ${
                                      c.status === 'published'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : c.status === 'pending_review'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : c.status === 'rejected'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-white/90 text-primary border border-border-subtle'
                                    }`}
                                  >
                                    {c.status.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>

                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-1.5 text-[10px] font-semibold text-secondary">
                                  <span className="text-accent-blue-dark">{c.category}</span>
                                  <span>•</span>
                                  <span>{c.level}</span>
                                </div>
                                <h3 className="text-sm font-bold text-primary line-clamp-1 mb-1">
                                  {c.title}
                                </h3>
                                <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
                                  {c.summary}
                                </p>

                                {c.status === 'rejected' && c.rejectionReason && (
                                  <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700">
                                    <span className="font-semibold">Reviewer feedback: </span>
                                    {c.rejectionReason}
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-[11px] text-secondary mt-4 pt-3 border-t border-border-subtle">
                                  <span>{c.totalSections} sections</span>
                                  <span>{c.totalLessons} lessons</span>
                                  <span>{c.enrolledCount} learners</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 pt-0 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenStudio(c._id)}
                                className="flex-1 py-1.5 px-3 rounded-xl bg-surface-subtle hover:bg-border-subtle text-primary text-xs font-semibold transition cursor-pointer text-center"
                              >
                                Edit in Studio
                              </button>

                              {(c.status === 'draft' || c.status === 'rejected') && (
                                <button
                                  type="button"
                                  onClick={() => handleSubmitCourseForReview(c._id)}
                                  disabled={courseActionLoading}
                                  className="py-1.5 px-3 rounded-xl bg-accent-blue hover:bg-accent-blue-dark text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                                >
                                  Submit
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteCourse(c._id, c.title)}
                                disabled={courseActionLoading}
                                className="p-1.5 text-secondary hover:text-rose-600 rounded-lg hover:bg-surface-subtle transition cursor-pointer"
                                title="Delete or Archive"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* TAB: ASSESSMENTS & QUIZZES */}
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-primary mb-1">
                    Course Assessments & Quizzes
                  </h2>
                  <p className="text-xs text-secondary">
                    Create multiple-choice evaluations, validate answer keys, configure attempt limits, and publish course tests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCreateQuiz()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer self-start sm:self-auto shadow-xs"
                >
                  <PlusCircle size={14} />
                  <span>Create Quiz</span>
                </button>
              </div>

              {quizFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    quizFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <span>{quizFeedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setQuizFeedback(null)}
                    className="font-bold ml-2 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Course Selector Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-secondary whitespace-nowrap">
                    Course:
                  </label>
                  <select
                    value={selectedAssessmentCourse}
                    onChange={(e) => setSelectedAssessmentCourse(e.target.value)}
                    className="text-xs font-medium bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="all">All Courses ({data?.courses?.length || 0})</option>
                    {data?.courses?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-secondary font-medium">
                  <span className="px-2.5 py-1 rounded-lg bg-surface-subtle border border-border-subtle">
                    Total: <strong className="text-primary">{courseQuizzes.length}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Published:{' '}
                    <strong className="text-emerald-900">
                      {courseQuizzes.filter((q) => q.isPublished).length}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Quizzes List */}
              {quizzesLoading ? (
                <LoadingState message="Loading course assessments..." cardsCount={2} />
              ) : courseQuizzes.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No assessments found"
                  description="Author multiple-choice quizzes with server-verified answer keys to evaluate learner proficiency and gate course certificates."
                  actionLabel="Create Assessment"
                  onAction={() => handleOpenCreateQuiz()}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courseQuizzes.map((quiz) => {
                    const courseTitle =
                      typeof quiz.course === 'object' && quiz.course?.title
                        ? quiz.course.title
                        : data?.courses?.find(
                            (c) =>
                              c._id ===
                              (typeof quiz.course === 'object' ? quiz.course?._id : quiz.course)
                          )?.title || 'Course Assessment';

                    return (
                      <div
                        key={quiz._id}
                        className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-subtle text-secondary truncate max-w-[200px]">
                              {courseTitle}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {quiz.isRequiredForCompletion && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent-blue-pale text-accent-blue-dark border border-[#637D91]/30">
                                  Required
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  quiz.isPublished
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {quiz.isPublished ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-primary mb-1">{quiz.title}</h3>
                          {quiz.description && (
                            <p className="text-xs text-secondary line-clamp-2 mb-3">
                              {quiz.description}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs text-secondary bg-surface-subtle p-3 rounded-xl mb-4">
                            <div>
                              <span className="text-[10px] uppercase text-tertiary block font-semibold">
                                Questions
                              </span>
                              <span className="font-medium text-primary">
                                {quiz.questions?.length || 0} ({quiz.totalPoints || 0} pts)
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-tertiary block font-semibold">
                                Passing Score
                              </span>
                              <span className="font-medium text-primary">
                                {quiz.passingPercentage}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-tertiary block font-semibold">
                                Time Limit
                              </span>
                              <span className="font-medium text-primary">
                                {quiz.durationMinutes ? `${quiz.durationMinutes} min` : 'Untimed'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-tertiary block font-semibold">
                                Max Attempts
                              </span>
                              <span className="font-medium text-primary">
                                {quiz.maxAttempts ? `${quiz.maxAttempts}` : 'Unlimited'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditQuiz(quiz)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle hover:bg-border-subtle text-primary text-xs font-semibold transition cursor-pointer"
                          >
                            <Edit3 size={13} />
                            <span>Edit Questions</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePublishQuiz(quiz)}
                              disabled={quizzesLoading}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                                quiz.isPublished
                                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {quiz.isPublished ? 'Unpublish' : 'Publish'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuiz(quiz)}
                              disabled={quizzesLoading}
                              className="p-1.5 text-secondary hover:text-rose-600 rounded-lg hover:bg-surface-subtle transition cursor-pointer"
                              title="Delete Quiz"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: LEARNERS */}
          {activeTab === 'learners' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <h2 className="text-base font-bold text-primary mb-1">Enrolled Learners Directory</h2>
                <p className="text-xs text-secondary">
                  Track individual student progress, lesson engagement, and assignment completion.
                </p>
              </div>

              <EmptyState
                icon={Users}
                title="No enrolled learners yet."
                description="Learners will populate this roster once your published courses accept cohort admissions."
                actionLabel="Return to Overview"
                onAction={() => setActiveTab('overview')}
              />
            </div>
          )}

          {/* TAB: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              {/* Header and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-primary mb-1">
                    Course Assignments & Lab Deliverables
                  </h2>
                  <p className="text-xs text-secondary">
                    Create assignments, set deadlines, configure submission types, and manage evaluations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCreateAssignment()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <PlusCircle size={14} />
                  <span>Create Assignment</span>
                </button>
              </div>

              {assignmentFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    assignmentFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <span>{assignmentFeedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setAssignmentFeedback(null)}
                    className="font-bold ml-2 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Course Selector Filter & Metrics */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-secondary whitespace-nowrap">
                    Course:
                  </label>
                  <select
                    value={selectedAssignmentCourse}
                    onChange={(e) => setSelectedAssignmentCourse(e.target.value)}
                    className="text-xs font-medium bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="all">All Courses ({data?.courses?.length || 0})</option>
                    {data?.courses?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-secondary font-medium">
                  <span className="px-2.5 py-1 rounded-lg bg-surface-subtle border border-border-subtle">
                    Total: <strong className="text-primary">{assignmentError ? '—' : courseAssignments.length}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Published:{' '}
                    <strong className="text-emerald-900">
                      {assignmentError ? '—' : courseAssignments.filter((a) => a.status === 'published').length}
                    </strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    Draft:{' '}
                    <strong className="text-amber-900">
                      {assignmentError ? '—' : courseAssignments.filter((a) => a.status === 'draft').length}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Assignments List */}
              {assignmentsLoading ? (
                <LoadingState message="Loading course assignments..." cardsCount={2} />
              ) : assignmentError ? (
                <ErrorState
                  title="Failed to Load Assignments"
                  message={assignmentError}
                  onRetry={() => fetchAssignments(selectedAssignmentCourse)}
                />
              ) : courseAssignments.length === 0 ? (
                <EmptyState
                  icon={FileCheck}
                  title="No assignments created yet"
                  description="Author assignments with text responses, file uploads, deadlines, and scoring rubrics to evaluate student learning."
                  actionLabel="Create Assignment"
                  onAction={() => handleOpenCreateAssignment()}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courseAssignments.map((assignment) => {
                    const courseTitle =
                      typeof assignment.course === 'object' && assignment.course?.title
                        ? assignment.course.title
                        : data?.courses?.find(
                            (c) =>
                              c._id ===
                              (typeof assignment.course === 'object'
                                ? assignment.course?._id
                                : assignment.course)
                          )?.title || 'Course Assignment';

                    const isDuePast = new Date(assignment.dueDate) < new Date();

                    return (
                      <div
                        key={assignment._id}
                        className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-subtle text-secondary truncate max-w-[200px]">
                              {courseTitle}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  assignment.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : assignment.status === 'archived'
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {assignment.status}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-primary mb-1">
                            {assignment.title}
                          </h3>
                          {assignment.description && (
                            <p className="text-xs text-secondary line-clamp-2 mb-3">
                              {assignment.description}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs text-secondary bg-surface-subtle p-3 rounded-xl mb-4">
                            <div>
                              <span className="text-[10px] uppercase text-tertiary block font-semibold">
                                Max Marks
                              </span>
                              <span className="font-semibold text-primary">
                                {assignment.maxMarks} pts
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-tertiary block font-semibold">
                                Deadline
                              </span>
                              <span
                                className={`font-semibold ${
                                  isDuePast ? 'text-amber-800' : 'text-primary'
                                }`}
                              >
                                {new Date(assignment.dueDate).toLocaleDateString()}{' '}
                                {new Date(assignment.dueDate).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-tertiary block font-semibold">
                                Submissions
                              </span>
                              <span className="font-medium text-primary">
                                {assignment.submissionsCount || 0} received
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-tertiary block font-semibold">
                                Types Allowed
                              </span>
                              <span className="font-medium text-primary capitalize">
                                {assignment.submissionTypes?.join(', ') || 'text'}
                              </span>
                            </div>
                          </div>

                          {assignment.allowLateSubmissions && (
                            <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/60 px-2.5 py-1.5 rounded-lg mb-4">
                              Late submissions allowed
                              {assignment.latePenaltyPercent > 0 &&
                                ` (${assignment.latePenaltyPercent}% penalty applied)`}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditAssignment(assignment)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle hover:bg-border-subtle text-primary text-xs font-semibold transition cursor-pointer"
                          >
                            <Edit3 size={13} />
                            <span>Edit Assignment</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubmissionFilter('all');
                                setActiveTab('reviews');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-surface-subtle hover:bg-border-subtle text-secondary hover:text-primary text-xs font-semibold transition cursor-pointer"
                              title="View all submissions"
                            >
                              Submissions
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTogglePublishAssignment(assignment)}
                              disabled={assignmentsLoading}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                                assignment.status === 'published'
                                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {assignment.status === 'published' ? 'Archive' : 'Publish'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAssignment(assignment)}
                              disabled={assignmentsLoading}
                              className="p-1.5 text-secondary hover:text-rose-600 rounded-lg hover:bg-surface-subtle transition cursor-pointer"
                              title="Delete Assignment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-primary mb-1">
                    Assignment Submissions & Grading Queue
                  </h2>
                  <p className="text-xs text-secondary">
                    Provide qualitative code feedback, score rubrics, and publish verified grades.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchSubmissions()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition cursor-pointer"
                  >
                    Refresh Queue
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All Submissions' },
                  { id: 'submitted', label: 'Pending Evaluation' },
                  { id: 'late', label: 'Late Deliverables' },
                  { id: 'graded', label: 'Graded' },
                  { id: 'returned_for_revision', label: 'Needs Revision' },
                ].map((f) => {
                  const count =
                    f.id === 'all'
                      ? submissionsList.length
                      : f.id === 'late'
                      ? submissionsList.filter((s) => s.isLate).length
                      : submissionsList.filter((s) => s.status === f.id).length;

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedSubmissionFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        selectedSubmissionFilter === f.id
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-white border border-border-subtle text-secondary hover:text-primary'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          selectedSubmissionFilter === f.id
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

              {/* Submissions List */}
              {submissionsLoading ? (
                <LoadingState message="Loading student submissions queue..." cardsCount={3} />
              ) : submissionsList.length === 0 ? (
                <EmptyState
                  icon={FileCheck}
                  title="Grading queue is completely clear"
                  description="When enrolled learners submit written solutions or project archives for your assignments, they will queue here for evaluation."
                  actionLabel="View Assignments"
                  onAction={() => setActiveTab('assignments')}
                />
              ) : (
                (() => {
                  const filtered = submissionsList.filter((s) => {
                    if (selectedSubmissionFilter === 'all') return true;
                    if (selectedSubmissionFilter === 'late') return s.isLate;
                    return s.status === selectedSubmissionFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <EmptyState
                        icon={FileCheck}
                        title={`No submissions found with status "${selectedSubmissionFilter}"`}
                        description="Try selecting a different filter above to view other submissions."
                        actionLabel="View All Submissions"
                        onAction={() => setSelectedSubmissionFilter('all')}
                      />
                    );
                  }

                  return (
                    <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-subtle border-b border-border-subtle text-[11px] font-bold text-secondary uppercase tracking-wider">
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">Assignment & Course</th>
                              <th className="py-3 px-4">Submitted At</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Marks Awarded</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-subtle">
                            {filtered.map((sub) => {
                              const studentName = sub.student?.name || 'Student';
                              const studentEmail = sub.student?.email || '';
                              const assignmentTitle = sub.assignment?.title || 'Assignment';
                              const courseTitle =
                                sub.assignment?.course?.title || 'Course';
                              const maxMarks = sub.assignment?.maxMarks || 100;

                              return (
                                <tr
                                  key={sub._id}
                                  className="hover:bg-surface-subtle/50 transition-colors"
                                >
                                  <td className="py-3.5 px-4">
                                    <div className="font-semibold text-primary">{studentName}</div>
                                    <div className="text-[11px] text-tertiary">{studentEmail}</div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="font-medium text-primary line-clamp-1">
                                      {assignmentTitle}
                                    </div>
                                    <div className="text-[11px] text-secondary line-clamp-1">
                                      {courseTitle}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap text-secondary">
                                    <div>{new Date(sub.submittedAt).toLocaleDateString()}</div>
                                    <div className="text-[10px] text-tertiary">
                                      {new Date(sub.submittedAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          sub.status === 'graded'
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            : sub.status === 'returned_for_revision'
                                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                                        }`}
                                      >
                                        {sub.status?.replace(/_/g, ' ')}
                                      </span>
                                      {sub.isLate && (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                          LATE
                                        </span>
                                      )}
                                      {sub.version > 1 && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                                          v{sub.version}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    {sub.status === 'graded' ? (
                                      <span className="font-bold text-emerald-700">
                                        {sub.grade} / {maxMarks} pts
                                      </span>
                                    ) : (
                                      <span className="text-tertiary italic">Not graded</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenGrading(sub._id)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition cursor-pointer shadow-xs"
                                    >
                                      <span>
                                        {sub.status === 'graded' ? 'Edit Grade' : 'Review & Grade'}
                                      </span>
                                      <ArrowRight size={12} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <h2 className="text-base font-bold text-primary mb-1">
                  Educator Guidelines & Announcements
                </h2>
                <p className="text-xs text-secondary">
                  Teaching standards, curriculum quality benchmarks, and platform feature releases.
                </p>
              </div>

              <div className="space-y-4">
                {data?.announcements?.map((ann) => (
                  <div
                    key={ann.id}
                    className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                        {ann.tag}
                      </span>
                      <span className="text-xs text-tertiary">{ann.date}</span>
                    </div>
                    <h3 className="text-sm font-bold text-primary mb-1">{ann.title}</h3>
                    <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SECURITY & PROFILE */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Password update form */}
              <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <KeyRound size={18} className="text-accent-sage-dark" />
                  <h2 className="text-base font-bold text-primary">Change Password</h2>
                </div>
                <p className="text-xs text-secondary leading-relaxed mb-5">
                  Update your educator credentials. Requires current password verification.
                </p>

                {pwFeedback.text && (
                  <div
                    className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium border ${
                      pwFeedback.type === 'success'
                        ? 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0]/40'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {pwFeedback.type === 'success' ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <Clock size={15} />
                    )}
                    <span>{pwFeedback.text}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-white focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      New Password (min 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-white focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-white focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {pwLoading ? 'Updating Password...' : 'Save Password'}
                  </button>
                </form>
              </div>

              {/* Instructor Account Details */}
              <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap size={18} className="text-accent-sage-dark" />
                    <h3 className="text-sm font-bold text-primary">Educator Account Status</h3>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed mb-4">
                    Your account has educator permissions under LearnSpace role-based access control.
                  </p>

                  <div className="space-y-3 bg-white p-4 rounded-xl border border-border-subtle text-xs">
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Educator Name</span>
                      <span className="font-semibold text-primary">{user?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Email Address</span>
                      <span className="font-semibold text-primary">{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Role</span>
                      <span className="font-semibold text-primary capitalize">{user?.role}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-secondary">Approval Status</span>
                      <span className={`font-semibold uppercase text-[11px] ${
                        isApproved ? 'text-accent-sage-dark' : 'text-amber-700'
                      }`}>
                        {user?.accountStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    ← Return to Overview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {quizModalOpen && (
        <QuizStudioModal
          courseId={quizCourseId}
          quizId={selectedQuizId}
          courses={data?.courses || []}
          onClose={() => {
            setQuizModalOpen(false);
            setSelectedQuizId(null);
          }}
          onSaved={() => {
            setQuizModalOpen(false);
            setSelectedQuizId(null);
            fetchQuizzes(selectedAssessmentCourse);
          }}
        />
      )}

      {assignmentStudioModalOpen && (
        <AssignmentStudioModal
          courseId={assignmentCourseId}
          assignmentId={selectedAssignmentId}
          courses={data?.courses || []}
          onClose={() => {
            setAssignmentStudioModalOpen(false);
            setSelectedAssignmentId(null);
          }}
          onSaved={() => {
            setAssignmentStudioModalOpen(false);
            setSelectedAssignmentId(null);
            fetchAssignments(selectedAssignmentCourse);
            fetchInstructorData();
          }}
        />
      )}

      {gradingModalOpen && (
        <SubmissionGradingModal
          submissionId={selectedSubmissionId}
          onClose={() => {
            setGradingModalOpen(false);
            setSelectedSubmissionId(null);
          }}
          onGraded={() => {
            setGradingModalOpen(false);
            setSelectedSubmissionId(null);
            fetchSubmissions();
            fetchInstructorData();
          }}
        />
      )}
    </DashboardLayout>
  );
}

