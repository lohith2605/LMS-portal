import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Tag,
  KeyRound,
  Eye,
  Award,
  Printer,
  FileCheck,
  AlertTriangle,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import {
  dashboardService,
  authService,
  certificateService,
  assignmentService,
} from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import MetricCard from '../components/dashboard/MetricCard';
import EmptyState from '../components/dashboard/EmptyState';
import LoadingState from '../components/dashboard/LoadingState';
import ErrorState from '../components/dashboard/ErrorState';
import CourseModal from '../components/CourseModal';
import AssignmentSubmissionModal from '../components/dashboard/AssignmentSubmissionModal';
import { COURSES_DATA } from '../data/coursesData';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected course modal for catalog exploration
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Phase 5: Certificates State
  const [certificates, setCertificates] = useState([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certError, setCertError] = useState(null);

  // Phase 6: Student Assignments State
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState(null);
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all' | 'pending' | 'submitted' | 'graded' | 'overdue'
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [selectedAssignmentForSubmission, setSelectedAssignmentForSubmission] = useState(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwFeedback, setPwFeedback] = useState({ type: '', text: '' });

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getStudentOverview();
      setData(res);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to load student workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    try {
      setCertificatesLoading(true);
      setCertError(null);
      const res = await certificateService.getStudentCertificates();
      setCertificates(res?.certificates || []);
    } catch (err) {
      setCertError(err.normalizedMessage || 'Failed to load earned certificates.');
    } finally {
      setCertificatesLoading(false);
    }
  }, []);

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
    if (activeTab === 'certificates') {
      fetchCertificates();
    }
  }, [activeTab, fetchCertificates]);

  useEffect(() => {
    if (activeTab === 'assignments') {
      fetchAssignments();
    }
  }, [activeTab, fetchAssignments]);

  useEffect(() => {
    let isMounted = true;
    dashboardService
      .getStudentOverview()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.normalizedMessage || 'Failed to load student workspace.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';

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

  const getPageTitle = () => {
    switch (activeTab) {
      case 'learning':
        return 'My Learning';
      case 'certificates':
        return 'Earned Certificates';
      case 'explore':
        return 'Course Catalog';
      case 'assignments':
        return 'Assignments & Submissions';
      case 'calendar':
        return 'Schedule & Calendar';
      case 'announcements':
        return 'Announcements';
      case 'security':
        return 'Account & Security';
      case 'overview':
      default:
        return 'Student Workspace';
    }
  };

  return (
    <DashboardLayout
      title={getPageTitle()}
      subtitle="Personalized learning workspace"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      announcements={data?.announcements || []}
    >
      {loading ? (
        <LoadingState message="Loading your student learning records..." cardsCount={4} />
      ) : error ? (
        <ErrorState
          title="Could not load learning workspace"
          message={error}
          onRetry={fetchStudentData}
        />
      ) : (
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent-blue-dark mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue-dark" />
                  <span>Personalized Learning Workspace</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                  Welcome back, {firstName}
                </h1>

                <p className="text-xs sm:text-sm text-secondary mt-1.5 leading-relaxed">
                  Pick up where you left off and keep your learning moving forward.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('explore')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer shadow-xs"
                  >
                    <Compass size={14} />
                    <span>Explore Courses</span>
                  </button>

                  <Link
                    to="/#curriculum"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition-all"
                  >
                    <span>View Public Catalog</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40 font-semibold text-[11px]">
                  <ShieldCheck size={13} />
                  <span>Authenticated Learner Session</span>
                </span>
                <span className="text-[11px] text-tertiary">
                  Account: <strong className="text-primary font-medium">{user?.email}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Learning Overview Metrics */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                  Learning Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Enrolled Courses"
                    value={data?.overview?.enrolledCount ?? 0}
                    subtitle="Active courses enrolled"
                    icon={BookOpen}
                    badge={data?.overview?.enrolledCount > 0 ? 'Active' : 'Empty'}
                    badgeType={data?.overview?.enrolledCount > 0 ? 'sage' : 'default'}
                    onClick={() => setActiveTab('learning')}
                  />
                  <MetricCard
                    title="Courses In Progress"
                    value={data?.overview?.inProgressCount ?? 0}
                    subtitle="Pacing toward completion"
                    icon={Clock}
                    badge="Pacing"
                    badgeType="blue"
                    onClick={() => setActiveTab('learning')}
                  />
                  <MetricCard
                    title="Completed Courses"
                    value={data?.overview?.completedCount ?? 0}
                    subtitle="Certificates & verified skills"
                    icon={CheckCircle2}
                    badge="Verified"
                    badgeType="default"
                    onClick={() => setActiveTab('learning')}
                  />
                  <MetricCard
                    title="Upcoming Assignments"
                    value={data?.overview?.upcomingDeadlinesCount ?? 0}
                    subtitle="Due in the next 14 days"
                    icon={FileText}
                    badge={data?.overview?.upcomingDeadlinesCount > 0 ? 'Action Req' : 'Clear'}
                    badgeType={data?.overview?.upcomingDeadlinesCount > 0 ? 'amber' : 'sage'}
                    onClick={() => setActiveTab('assignments')}
                  />
                </div>
              </div>

              {/* Continue Learning Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Continue Learning
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('explore')}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Browse All Courses</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {data?.enrolledCourses && data.enrolledCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.enrolledCourses.map((enr) => {
                      const c = enr.course;
                      return (
                        <div
                          key={enr.id}
                          className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-card transition"
                        >
                          <div className="p-5">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-subtle text-accent-blue-dark border border-border-subtle">
                                {c.category}
                              </span>
                              <span className="text-[11px] text-secondary font-medium">
                                {enr.progressPercentage}% completed
                              </span>
                            </div>

                            <h3 className="font-bold text-sm text-primary mb-1 line-clamp-1">
                              {c.title}
                            </h3>
                            <p className="text-xs text-secondary mb-3">
                              Instructor: {c.instructor?.name || 'Educator'}
                            </p>

                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-surface-subtle border border-border-subtle rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                                style={{ width: `${enr.progressPercentage}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-tertiary">
                              <span>
                                {enr.completedCount} of {enr.totalLessons} lessons finished
                              </span>
                              <span>{c.estimatedDuration}</span>
                            </div>
                          </div>

                          <div className="px-5 py-3 bg-surface-subtle border-t border-border-subtle flex items-center justify-between">
                            <Link
                              to={`/courses/${c.slug}`}
                              className="text-xs font-semibold text-secondary hover:text-primary transition"
                            >
                              Course Details
                            </Link>
                            <Link
                              to={`/courses/${c.slug}/learn`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition shadow-xs"
                            >
                              <span>Continue Learning</span>
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title="Your learning journey starts here."
                    description="You are not currently enrolled in any active courses. Explore our curated course tracks to find topics that match your career goals."
                    actionLabel="Explore Course Catalog"
                    onAction={() => setActiveTab('explore')}
                    secondaryActionLabel="View Public Website"
                    secondaryHref="/"
                  />
                )}
              </div>

              {/* Upcoming Deadlines & Recent Activity Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Deadlines */}
                <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-accent-blue-dark" />
                      <h3 className="text-sm font-bold text-primary">Upcoming Deadlines</h3>
                    </div>
                    <span className="text-[11px] font-semibold text-secondary">
                      {data?.upcomingDeadlines?.length || 0} scheduled
                    </span>
                  </div>

                  {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? (
                    <div className="space-y-3">
                      {data.upcomingDeadlines.map((item, idx) => (
                        <div key={idx} className="p-3 bg-surface-subtle rounded-xl text-xs">
                          <span className="font-semibold text-primary">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs font-semibold text-primary mb-1">
                        No upcoming deadlines
                      </p>
                      <p className="text-[11px] text-secondary max-w-xs mx-auto">
                        You have no pending assignments due. Deadlines will be scheduled when you enroll in cohorts.
                      </p>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-accent-sage-dark" />
                      <h3 className="text-sm font-bold text-primary">Recent Activity</h3>
                    </div>
                    <span className="text-[11px] font-semibold text-secondary">Timeline</span>
                  </div>

                  {data?.recentActivity && data.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {data.recentActivity.map((act, idx) => (
                        <div key={idx} className="p-3 bg-surface-subtle rounded-xl text-xs">
                          {act.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs font-semibold text-primary mb-1">
                        Your recent learning activity will appear here.
                      </p>
                      <p className="text-[11px] text-secondary max-w-xs mx-auto">
                        Progress records, quiz attempts, and lesson completions will be logged chronologically.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Platform Announcements */}
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Tag size={15} className="text-accent-blue-dark" />
                    <span>Platform Announcements</span>
                  </h3>
                  <span className="text-[11px] text-secondary">Verified Communications</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data?.announcements?.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 rounded-xl border border-border-subtle bg-surface-subtle"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-sage-pale text-accent-sage-dark">
                          {ann.tag}
                        </span>
                        <span className="text-[11px] text-tertiary">{ann.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-primary mb-1">{ann.title}</h4>
                      <p className="text-xs text-secondary leading-relaxed">{ann.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB: MY LEARNING */}
          {activeTab === 'learning' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-primary mb-1">Enrolled Courses & Tracks</h2>
                  <p className="text-xs text-secondary leading-relaxed">
                    Manage your active coursework, review module syllabi, and track graduation progress.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition cursor-pointer self-start sm:self-auto"
                >
                  Explore Catalog
                </button>
              </div>

              {data?.enrolledCourses && data.enrolledCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.enrolledCourses.map((enr) => {
                    const c = enr.course;
                    return (
                      <div
                        key={enr.id}
                        className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-card transition"
                      >
                        <div>
                          <div className="h-32 bg-surface-subtle overflow-hidden relative">
                            {c.thumbnail ? (
                              <img
                                src={c.thumbnail}
                                alt={c.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-secondary">
                                <BookOpen size={28} />
                              </div>
                            )}
                            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-primary backdrop-blur-xs">
                              {c.category}
                            </span>
                          </div>

                          <div className="p-4">
                            <h3 className="font-bold text-sm text-primary mb-1 line-clamp-1">
                              {c.title}
                            </h3>
                            <p className="text-xs text-secondary mb-3">
                              By {c.instructor?.name || 'Educator'}
                            </p>

                            <div className="w-full h-1.5 bg-surface-subtle border border-border-subtle rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                                style={{ width: `${enr.progressPercentage}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-tertiary">
                              <span>
                                {enr.completedCount} of {enr.totalLessons} lessons
                              </span>
                              <span className="font-semibold text-primary">
                                {enr.progressPercentage}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 pt-0">
                          <Link
                            to={`/courses/${c.slug}/learn`}
                            className="w-full py-2 px-3 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition flex items-center justify-center gap-1.5"
                          >
                            <span>Continue Learning</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="Your learning journey starts here."
                  description="You are currently not enrolled in any courses. Browse the LearnSpace course library to discover comprehensive tracks in software engineering, design systems, and cloud architecture."
                  actionLabel="Explore Available Courses"
                  onAction={() => setActiveTab('explore')}
                  secondaryActionLabel="Return to Overview"
                  onSecondaryAction={() => setActiveTab('overview')}
                />
              )}
            </div>
          )}

          {/* TAB: EARNED CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-primary mb-1">
                    Earned Certificates of Completion
                  </h2>
                  <p className="text-xs text-secondary">
                    Official verifiable credentials awarded for completing course modules and passing required assessments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('learning')}
                  className="px-3.5 py-2 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer self-start sm:self-auto"
                >
                  View My Learning
                </button>
              </div>

              {certError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {certError}
                </div>
              )}

              {certificatesLoading ? (
                <LoadingState message="Loading your earned credentials..." cardsCount={2} />
              ) : certificates.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No certificates earned yet."
                  description="When you complete 100% of lessons and achieve passing scores on mandatory assessments in your enrolled courses, your official tamper-evident certificates will appear here."
                  actionLabel="Go to My Learning"
                  onAction={() => setActiveTab('learning')}
                  secondaryActionLabel="Explore Catalog"
                  onSecondaryAction={() => setActiveTab('explore')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {certificates.map((cert) => (
                    <div
                      key={cert._id}
                      className="bg-white border border-border-subtle rounded-3xl p-6 shadow-xs hover:border-accent-sage-dark/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-accent-sage-pale text-accent-sage-dark flex items-center justify-center">
                              <Award size={18} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-sage-dark">
                              Verified Credential
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active & Valid
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-primary mb-1">
                          {cert.courseTitleSnapshot || cert.course?.title || 'Course Completion'}
                        </h3>

                        <div className="space-y-1.5 my-4 p-3 bg-surface-subtle rounded-xl border border-border-subtle text-xs">
                          <div className="flex justify-between">
                            <span className="text-secondary">Certificate ID:</span>
                            <span className="font-mono font-semibold text-primary">
                              {cert.certificateId}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-secondary">Issued To:</span>
                            <span className="font-semibold text-primary">
                              {cert.studentNameSnapshot}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-secondary">Completion Date:</span>
                            <span className="font-medium text-primary">
                              {new Date(cert.issueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
                        <Link
                          to={`/verify/${cert.certificateId}`}
                          className="flex-1 py-2 px-3 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink size={13} />
                          <span>View & Verify</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => window.open(`/verify/${cert.certificateId}`, '_blank')}
                          className="py-2 px-3 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer size={13} />
                          <span>Print</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: EXPLORE COURSES */}
          {activeTab === 'explore' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-primary mb-1">
                    Featured Curriculum Catalog
                  </h2>
                  <p className="text-xs text-secondary">
                    Inspect syllabi, outcomes, and instructor credentials for active programs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-3.5 py-2 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Back to Overview
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {COURSES_DATA.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-border-medium hover:shadow-card transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface-subtle text-secondary border border-border-subtle">
                          {course.category}
                        </span>
                        <span className="text-[11px] font-semibold text-tertiary">
                          {course.duration}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-primary mb-2 line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-xs text-secondary leading-relaxed line-clamp-3 mb-4">
                        {course.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                          {course.instructor.initials}
                        </div>
                        <span className="text-xs font-medium text-primary">
                          {course.instructor.name}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCourse(course)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Syllabus</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
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
                          ? 'bg-primary text-white shadow-xs'
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
              ) : (
                (() => {
                  const filtered = assignments.filter((a) => {
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

                  if (filtered.length === 0) {
                    return (
                      <EmptyState
                        icon={FileText}
                        title={`No assignments found under "${assignmentFilter}"`}
                        description="Try selecting another filter above to view your tasks."
                        actionLabel="View All Assignments"
                        onAction={() => setAssignmentFilter('all')}
                      />
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filtered.map((item) => {
                        const courseTitle = item.course?.title || 'Enrolled Course';
                        const isOverdue = item.isOverdue;
                        const isGraded = item.submissionStatus === 'graded';
                        const isSubmitted = item.isSubmitted;

                        return (
                          <div
                            key={item._id}
                            className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-all"
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
                                    : 'bg-primary text-white hover:bg-[#2b2b2b]'
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
                  );
                })()
              )}
            </div>
          )}

          {/* TAB: CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <h2 className="text-base font-bold text-primary mb-1">
                  Academic Schedule & Live Sessions
                </h2>
                <p className="text-xs text-secondary">
                  Instructor office hours, cohort sync meetings, and project review calendar.
                </p>
              </div>

              <EmptyState
                icon={Calendar}
                title="Your schedule is clear."
                description="Live session invites and cohort calendar feeds will synchronize with your student profile once enrolled in an active learning track."
                actionLabel="Browse Available Tracks"
                onAction={() => setActiveTab('explore')}
                secondaryActionLabel="Return to Overview"
                onSecondaryAction={() => setActiveTab('overview')}
              />
            </div>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <h2 className="text-base font-bold text-primary mb-1">
                  Platform Announcements & Bulletins
                </h2>
                <p className="text-xs text-secondary">
                  Important system notices, curriculum releases, and academic policies.
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
                    <h3 className="text-sm font-bold text-primary mb-1.5">{ann.title}</h3>
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
                  <KeyRound size={18} className="text-accent-blue-dark" />
                  <h2 className="text-base font-bold text-primary">Change Password</h2>
                </div>
                <p className="text-xs text-secondary leading-relaxed mb-5">
                  Update your account password. Requires your current password to ensure verified credentials.
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

              {/* Account Details & Session Info */}
              <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={18} className="text-accent-sage-dark" />
                    <h3 className="text-sm font-bold text-primary">Student Account Details</h3>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed mb-4">
                    Your student learner account is secured with HttpOnly session cookies and role-based guards.
                  </p>

                  <div className="space-y-3 bg-white p-4 rounded-xl border border-border-subtle text-xs">
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Full Name</span>
                      <span className="font-semibold text-primary">{user?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Email Address</span>
                      <span className="font-semibold text-primary">{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Assigned Role</span>
                      <span className="font-semibold text-primary capitalize">{user?.role}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-secondary">Account Status</span>
                      <span className="font-semibold text-accent-sage-dark uppercase text-[11px]">
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

      {/* Course Detail Modal for Explore Tab */}
      {selectedCourse && (
        <CourseModal
          course={selectedCourse}
          isOpen={Boolean(selectedCourse)}
          onClose={() => setSelectedCourse(null)}
        />
      )}

      {/* Assignment Submission Modal */}
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
            fetchStudentData();
          }}
        />
      )}
    </DashboardLayout>
  );
}
