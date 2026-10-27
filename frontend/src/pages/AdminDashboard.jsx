import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  KeyRound,
  AlertTriangle,
  Server,
  Activity,
  UserCheck,
  UserX,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FolderLock,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { adminService, authService } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import MetricCard from '../components/dashboard/MetricCard';
import EmptyState from '../components/dashboard/EmptyState';
import LoadingState from '../components/dashboard/LoadingState';
import ErrorState from '../components/dashboard/ErrorState';

const ADMIN_ANNOUNCEMENTS = [
  {
    id: 'admin-ann-1',
    title: 'Instructor Approval Queue Active',
    content: 'Pending educator applications are isolated and require administrator authorization prior to cohort authoring.',
    tag: 'Security Policy',
    date: '2026-10-27',
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Overview metrics state
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  // Instructor approvals queue state
  const [pendingInstructors, setPendingInstructors] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ type: '', text: '' });

  // Confirmation modal state for instructors
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null, // 'approve' | 'reject'
    applicant: null,
  });

  // Course moderation queue state
  const [pendingCourses, setPendingCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseActionInProgress, setCourseActionInProgress] = useState(null);
  const [courseFeedback, setCourseFeedback] = useState({ type: '', text: '' });
  const [courseConfirmDialog, setCourseConfirmDialog] = useState({
    isOpen: false,
    action: null, // 'approve' | 'reject'
    course: null,
    rejectionReason: '',
  });
  const [previewCourse, setPreviewCourse] = useState(null);

  // User directory state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Platform health telemetry state
  const [healthData, setHealthData] = useState(null);

  // Password update state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });

  // 1. Fetch overview metrics
  const fetchOverview = useCallback(async () => {
    try {
      setMetricsError(null);
      const res = await adminService.getOverview();
      setMetrics(res.metrics);
    } catch (err) {
      setMetricsError(err.normalizedMessage || 'Failed to load platform metrics.');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // 2. Fetch pending instructor queue
  const fetchPendingInstructors = useCallback(async () => {
    try {
      const res = await adminService.getPendingInstructors();
      setPendingInstructors(res.pendingInstructors || []);
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err.normalizedMessage || 'Failed to load instructor approval queue.',
      });
    } finally {
      setApprovalsLoading(false);
    }
  }, []);

  // 3. Fetch user directory
  const fetchUsers = useCallback(async (page = 1, search = '', role = '') => {
    try {
      setUsersLoading(true);
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (role) params.role = role;

      const res = await adminService.getUsers(params);
      setUsers(res.users || []);
      setUserPage(res.pagination?.page || 1);
      setUserTotalPages(res.pagination?.totalPages || 1);
      setUserTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.warn('Failed to fetch users:', err.message);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // 4. Fetch safe health telemetry
  const fetchHealth = useCallback(async () => {
    try {
      const res = await adminService.getPlatformHealth();
      setHealthData(res);
    } catch (err) {
      console.warn('Failed to fetch health:', err.message);
    }
  }, []);

  // 5. Fetch pending courses for review
  const fetchPendingCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);
      const res = await adminService.getPendingCourses();
      setPendingCourses(res.pendingCourses || []);
    } catch (err) {
      setCourseFeedback({
        type: 'error',
        text: err.normalizedMessage || 'Failed to load course review queue.',
      });
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const handleExecuteCourseAction = async () => {
    const { action, course, rejectionReason } = courseConfirmDialog;
    if (!action || !course) return;

    try {
      setCourseActionInProgress(course._id);
      setCourseConfirmDialog({
        isOpen: false,
        action: null,
        course: null,
        rejectionReason: '',
      });

      if (action === 'approve') {
        const res = await adminService.approveCourse(course._id);
        setCourseFeedback({
          type: 'success',
          text: res.message || `Course "${course.title}" approved and published to catalog.`,
        });
      } else {
        const res = await adminService.rejectCourse(course._id, rejectionReason);
        setCourseFeedback({
          type: 'success',
          text: res.message || `Course "${course.title}" rejected. Feedback sent to instructor.`,
        });
      }

      fetchPendingCourses();
      fetchOverview();
    } catch (err) {
      setCourseFeedback({
        type: 'error',
        text: err.normalizedMessage || `Failed to ${action} course.`,
      });
    } finally {
      setCourseActionInProgress(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminService.getOverview(),
      adminService.getPendingInstructors(),
      adminService.getUsers({ page: 1, limit: 10 }),
      adminService.getPlatformHealth(),
      adminService.getPendingCourses().catch(() => ({ pendingCourses: [] })),
    ])
      .then(([overviewRes, pendingRes, usersRes, healthRes, coursesRes]) => {
        if (isMounted) {
          setMetrics(overviewRes.metrics);
          setMetricsLoading(false);
          setPendingInstructors(pendingRes.pendingInstructors || []);
          setApprovalsLoading(false);
          setUsers(usersRes.users || []);
          setUserPage(usersRes.pagination?.page || 1);
          setUserTotalPages(usersRes.pagination?.totalPages || 1);
          setUserTotalCount(usersRes.pagination?.total || 0);
          setHealthData(healthRes);
          setPendingCourses(coursesRes.pendingCourses || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setMetricsError(err.normalizedMessage || 'Failed to load platform metrics.');
          setMetricsLoading(false);
          setApprovalsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Approve / Reject action
  const handleExecuteAction = async () => {
    const { action, applicant } = confirmDialog;
    if (!action || !applicant) return;

    try {
      setActionInProgress(applicant.id);
      setActionFeedback({ type: '', text: '' });

      if (action === 'approve') {
        const res = await adminService.approveInstructor(applicant.id);
        setActionFeedback({
          type: 'success',
          text: res.message || `Successfully approved ${applicant.name} as Instructor.`,
        });
      } else {
        const res = await adminService.rejectInstructor(applicant.id);
        setActionFeedback({
          type: 'success',
          text: res.message || `Rejected application for ${applicant.name}.`,
        });
      }

      // Close dialog & refresh queues
      setConfirmDialog({ isOpen: false, action: null, applicant: null });
      await Promise.all([fetchPendingInstructors(), fetchOverview(), fetchUsers(userPage, searchQuery, roleFilter)]);
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err.normalizedMessage || `Failed to ${action} instructor.`,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Search input debounce / submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setUserPage(1);
    fetchUsers(1, searchQuery, roleFilter);
  };

  const handleRoleFilterChange = (newRole) => {
    setRoleFilter(newRole);
    setUserPage(1);
    fetchUsers(1, searchQuery, newRole);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= userTotalPages) {
      setUserPage(newPage);
      fetchUsers(newPage, searchQuery, roleFilter);
    }
  };

  // Password change handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    try {
      setPwLoading(true);
      const res = await authService.changePassword({ currentPassword, newPassword });
      setPwMessage({ type: 'success', text: res.message || 'Admin password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwMessage({
        type: 'error',
        text: err.normalizedMessage || 'Failed to change admin password',
      });
    } finally {
      setPwLoading(false);
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'approvals':
        return 'Instructor Approval Queue';
      case 'users':
        return 'Platform User Directory';
      case 'moderation':
        return 'Course Moderation';
      case 'health':
        return 'System Health Telemetry';
      case 'security':
        return 'Admin Credentials & Security';
      case 'overview':
      default:
        return 'Administrative Console';
    }
  };

  return (
    <DashboardLayout
      title={getPageTitle()}
      subtitle="Platform governance, security, and verification"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      announcements={ADMIN_ANNOUNCEMENTS}
    >
      {metricsLoading ? (
        <LoadingState message="Connecting to MongoDB Atlas and aggregating platform metrics..." cardsCount={4} />
      ) : metricsError ? (
        <ErrorState
          title="Could not load platform overview"
          message={metricsError}
          onRetry={fetchOverview}
        />
      ) : (
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-2">
                  <ShieldAlert size={13} />
                  <span>Privileged System Administrator</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                  Platform Overview
                </h1>

                <p className="text-xs sm:text-sm text-secondary mt-1.5 leading-relaxed">
                  Manage users, review instructor applications, and oversee the learning platform.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('approvals')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 size={14} />
                    <span>Review Instructor Queue ({pendingInstructors.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-secondary hover:text-primary text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Users size={14} />
                    <span>View All Users</span>
                  </button>
                </div>
              </div>

              {/* Server / Cluster Status Pills */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                    <Activity size={13} />
                    <span>Cluster: Atlas Connected</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[11px]">
                    <Server size={13} />
                    <span>API: Healthy</span>
                  </span>
                </div>
                <span className="text-[11px] text-tertiary">
                  Authenticated: <strong className="text-primary font-medium">{user?.email}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Feedback Alerts */}
          {actionFeedback.text && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium animate-[modalSlideUp_0.15s_ease-out] ${
                actionFeedback.type === 'success'
                  ? 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0]/40'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
                <span>{actionFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionFeedback({ type: '', text: '' })}
                className="text-xs hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Platform Metrics Grid */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                  Live Platform Metrics
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Registered Users"
                    value={metrics?.totalUsers ?? 0}
                    subtitle="Platform accounts stored in MongoDB"
                    icon={Users}
                    badge="Atlas DB"
                    badgeType="default"
                    onClick={() => setActiveTab('users')}
                  />
                  <MetricCard
                    title="Student Learners"
                    value={metrics?.totalStudents ?? 0}
                    subtitle="Standard learner permissions"
                    icon={Users}
                    badge="Students"
                    badgeType="blue"
                    onClick={() => {
                      setRoleFilter('student');
                      setActiveTab('users');
                    }}
                  />
                  <MetricCard
                    title="Active Instructors"
                    value={metrics?.activeInstructors ?? 0}
                    subtitle="Approved teaching faculty"
                    icon={UserCheck}
                    badge="Verified"
                    badgeType="sage"
                    onClick={() => {
                      setRoleFilter('instructor');
                      setActiveTab('users');
                    }}
                  />
                  <MetricCard
                    title="Pending Approvals"
                    value={metrics?.pendingInstructors ?? 0}
                    subtitle="Awaiting administrative verification"
                    icon={Clock}
                    badge={metrics?.pendingInstructors > 0 ? 'Action Req' : 'Zero Queue'}
                    badgeType={metrics?.pendingInstructors > 0 ? 'amber' : 'sage'}
                    onClick={() => setActiveTab('approvals')}
                  />
                </div>
              </div>

              {/* Priority Section: Instructor Approval Queue Preview */}
              <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-amber-600" />
                      <h2 className="text-base font-bold text-primary">
                        Instructor Approval Queue
                      </h2>
                    </div>
                    <p className="text-xs text-secondary mt-0.5">
                      Review educator applications and authorize teaching permissions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fetchPendingInstructors}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw size={13} className={approvalsLoading ? 'animate-spin' : ''} />
                    <span>Refresh Queue</span>
                  </button>
                </div>

                {approvalsLoading ? (
                  <div className="py-12 text-center text-xs text-secondary">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Retrieving pending educator requests...</span>
                  </div>
                ) : pendingInstructors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border-subtle text-secondary font-semibold">
                          <th className="py-3 px-4">Applicant Name</th>
                          <th className="py-3 px-4">Email Address</th>
                          <th className="py-3 px-4">Application Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Verification Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {pendingInstructors.map((inst) => (
                          <tr key={inst.id} className="hover:bg-surface-subtle/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-primary">
                              {inst.name}
                            </td>
                            <td className="py-3.5 px-4 text-secondary">
                              {inst.email}
                            </td>
                            <td className="py-3.5 px-4 text-tertiary">
                              {new Date(inst.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                                <Clock size={10} />
                                <span>Pending</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={actionInProgress === inst.id}
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      action: 'approve',
                                      applicant: inst,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <UserCheck size={12} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={actionInProgress === inst.id}
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      action: 'reject',
                                      applicant: inst,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-rose-50 border border-border-subtle text-rose-600 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <UserX size={12} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No pending instructor applications."
                    description="All educator applicant accounts have been reviewed and approved. New registrations with the instructor role will appear here automatically."
                    actionLabel="View Platform Directory"
                    onAction={() => setActiveTab('users')}
                  />
                )}
              </div>

              {/* System Architecture & Security Policy */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border-subtle">
                    <ShieldAlert size={18} className="text-rose-600" />
                    <h3 className="text-sm font-bold text-primary">
                      Role-Based Access Enforcement
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs text-secondary leading-relaxed">
                    <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                      <strong className="text-primary block mb-0.5">Admin Offline Provisioning</strong>
                      Admins are created only via secure CLI tools: <code className="bg-white px-1.5 py-0.5 rounded border border-border-subtle text-primary">npm run provision:admin</code>. Public creation is rejected by backend middleware.
                    </div>
                    <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                      <strong className="text-primary block mb-0.5">Zero Privilege Escalation</strong>
                      Client requests mutating roles to 'admin' are dropped by validation middleware before saving to MongoDB Atlas.
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <Activity size={18} className="text-accent-blue-dark" />
                      <h3 className="text-sm font-bold text-primary">Platform Health Telemetry</h3>
                    </div>
                    <button
                      type="button"
                      onClick={fetchHealth}
                      className="text-[11px] font-semibold text-secondary hover:text-primary cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>

                  {healthData ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between p-2.5 bg-surface-subtle rounded-xl border border-border-subtle">
                        <span className="text-secondary">Server Status</span>
                        <span className="font-bold text-emerald-700 capitalize">
                          {healthData.status} ({healthData.server?.status})
                        </span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-surface-subtle rounded-xl border border-border-subtle">
                        <span className="text-secondary">Database Status</span>
                        <span className="font-bold text-emerald-700 capitalize">
                          {healthData.database?.status} (ReadyState: {healthData.database?.readyState})
                        </span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-surface-subtle rounded-xl border border-border-subtle">
                        <span className="text-secondary">Server Port</span>
                        <span className="font-semibold text-primary">{healthData.server?.port}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-surface-subtle rounded-xl border border-border-subtle">
                        <span className="text-secondary">Uptime</span>
                        <span className="font-semibold text-primary">
                          {healthData.uptimeSeconds} seconds
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-secondary py-4 text-center">
                      Health telemetry unavailable.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB: INSTRUCTOR APPROVALS (Dedicated Queue) */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle mb-6">
                  <div>
                    <h2 className="text-base font-bold text-primary">
                      Pending Educator Applications ({pendingInstructors.length})
                    </h2>
                    <p className="text-xs text-secondary mt-0.5">
                      Verify instructor identity and authorize course publishing privileges.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fetchPendingInstructors}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw size={13} className={approvalsLoading ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>

                {approvalsLoading ? (
                  <div className="py-12 text-center text-xs text-secondary">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading pending applicants...</span>
                  </div>
                ) : pendingInstructors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border-subtle text-secondary font-semibold">
                          <th className="py-3 px-4">Applicant</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Application Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {pendingInstructors.map((inst) => (
                          <tr key={inst.id} className="hover:bg-surface-subtle/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-primary">
                              {inst.name}
                            </td>
                            <td className="py-3.5 px-4 text-secondary">
                              {inst.email}
                            </td>
                            <td className="py-3.5 px-4 text-tertiary">
                              {new Date(inst.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                                <Clock size={10} />
                                <span>Pending Approval</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={actionInProgress === inst.id}
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      action: 'approve',
                                      applicant: inst,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <UserCheck size={12} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={actionInProgress === inst.id}
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      action: 'reject',
                                      applicant: inst,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-rose-50 border border-border-subtle text-rose-600 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <UserX size={12} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No pending instructor applications."
                    description="All educator applicant accounts are verified. New instructor registrations will appear here for administrative approval."
                    actionLabel="Return to Overview"
                    onAction={() => setActiveTab('overview')}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB: USERS (User Directory with search & pagination) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
                {/* Search & Filter Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
                  <div>
                    <h2 className="text-base font-bold text-primary">
                      Platform User Directory ({userTotalCount})
                    </h2>
                    <p className="text-xs text-secondary mt-0.5">
                      View all registered student, instructor, and administrative accounts.
                    </p>
                  </div>

                  {/* Search Bar & Role Filter */}
                  <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name or email..."
                        className="pl-8 pr-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl focus:outline-none focus:bg-white focus:border-primary text-primary w-48 sm:w-60"
                      />
                    </div>

                    <select
                      value={roleFilter}
                      onChange={(e) => handleRoleFilterChange(e.target.value)}
                      className="px-3 py-2 text-xs bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:outline-none cursor-pointer"
                    >
                      <option value="">All Roles</option>
                      <option value="student">Students</option>
                      <option value="instructor">Instructors</option>
                      <option value="admin">Administrators</option>
                    </select>

                    <button
                      type="submit"
                      className="px-3 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-[#2b2b2b] transition-all cursor-pointer"
                    >
                      Search
                    </button>
                  </form>
                </div>

                {/* Users Table */}
                {usersLoading ? (
                  <div className="py-12 text-center text-xs text-secondary">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading user records...</span>
                  </div>
                ) : users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border-subtle text-secondary font-semibold">
                          <th className="py-3 px-4">User Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Account Status</th>
                          <th className="py-3 px-4">Registered Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-surface-subtle/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-primary">
                              {u.name}
                            </td>
                            <td className="py-3 px-4 text-secondary">
                              {u.email}
                            </td>
                            <td className="py-3 px-4 capitalize">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  u.role === 'admin'
                                    ? 'bg-rose-100 text-rose-800'
                                    : u.role === 'instructor'
                                    ? 'bg-accent-sage-pale text-accent-sage-dark'
                                    : 'bg-accent-blue-pale text-accent-blue-dark'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  u.accountStatus === 'active'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : u.accountStatus === 'pending'
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'bg-rose-50 text-rose-800'
                                }`}
                              >
                                {u.accountStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-tertiary">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-6 border-t border-border-subtle mt-4">
                      <span className="text-xs text-secondary">
                        Page {userPage} of {userTotalPages} ({userTotalCount} users total)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={userPage <= 1}
                          onClick={() => handlePageChange(userPage - 1)}
                          className="p-1.5 rounded-lg border border-border-subtle bg-surface-subtle text-secondary hover:text-primary disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={userPage >= userTotalPages}
                          onClick={() => handlePageChange(userPage + 1)}
                          className="p-1.5 rounded-lg border border-border-subtle bg-surface-subtle text-secondary hover:text-primary disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No users match your query."
                    description="No accounts were found matching the selected search criteria or role filter."
                    actionLabel="Reset Search"
                    onAction={() => {
                      setSearchQuery('');
                      setRoleFilter('');
                      fetchUsers(1, '', '');
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB: COURSE MODERATION */}
          {activeTab === 'moderation' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-bold text-primary">
                      Curriculum Moderation Queue
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {pendingCourses.length} pending
                    </span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    Review and verify curriculum quality, syllabi integrity, and lesson materials prior to public catalog release.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchPendingCourses}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw size={13} className={coursesLoading ? 'animate-spin' : ''} />
                  <span>Refresh Queue</span>
                </button>
              </div>

              {courseFeedback.text && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                    courseFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <span>{courseFeedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setCourseFeedback({ type: '', text: '' })}
                    className="font-bold ml-2 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              {coursesLoading ? (
                <LoadingState message="Fetching courses awaiting review..." />
              ) : pendingCourses.length > 0 ? (
                <div className="space-y-4">
                  {pendingCourses.map((c) => (
                    <div
                      key={c._id}
                      className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-card transition"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-surface-subtle overflow-hidden shrink-0 border border-border-subtle">
                          {c.thumbnail ? (
                            <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-secondary">
                              <BookOpen size={20} />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-blue-pale text-accent-blue-dark">
                              {c.category}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-subtle text-secondary border border-border-subtle">
                              {c.level}
                            </span>
                            <span className="text-[10px] font-medium text-tertiary">
                              {c.totalSections} modules • {c.totalLessons} lessons
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-primary mb-1">{c.title}</h3>
                          <p className="text-xs text-secondary line-clamp-1 mb-2">{c.summary}</p>

                          <div className="text-[11px] text-tertiary">
                            Author: <span className="font-semibold text-primary">{c.instructor?.name}</span> ({c.instructor?.email})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewCourse(c)}
                          className="px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(courseActionInProgress)}
                          onClick={() =>
                            setCourseConfirmDialog({
                              isOpen: true,
                              action: 'approve',
                              course: c,
                              rejectionReason: '',
                            })
                          }
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(courseActionInProgress)}
                          onClick={() =>
                            setCourseConfirmDialog({
                              isOpen: true,
                              action: 'reject',
                              course: c,
                              rejectionReason: '',
                            })
                          }
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FolderLock}
                  title="Moderation queue is empty."
                  description="No instructor courses are currently awaiting review. New submissions will appear here automatically."
                  actionLabel="Return to Overview"
                  onAction={() => setActiveTab('overview')}
                />
              )}
            </div>
          )}

          {/* TAB: SYSTEM HEALTH */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-primary mb-1">
                    System Telemetry & Operational Health
                  </h2>
                  <p className="text-xs text-secondary">
                    Monitored health parameters from <code className="bg-surface-subtle px-1.5 py-0.5 rounded text-primary">/api/health</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchHealth}
                  className="px-3.5 py-1.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Run Health Check
                </button>
              </div>

              {healthData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                      HTTP API Server
                    </h3>
                    <div className="flex justify-between py-1.5 border-b border-border-subtle text-xs">
                      <span className="text-secondary">Health Status</span>
                      <span className="font-bold text-emerald-700 capitalize">{healthData.status}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border-subtle text-xs">
                      <span className="text-secondary">Environment</span>
                      <span className="font-bold text-primary capitalize">{healthData.environment}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border-subtle text-xs">
                      <span className="text-secondary">Listening Port</span>
                      <span className="font-semibold text-primary">{healthData.server?.port}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-xs">
                      <span className="text-secondary">Server Uptime</span>
                      <span className="font-semibold text-primary">{healthData.uptimeSeconds} seconds</span>
                    </div>
                  </div>

                  <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                      MongoDB Database
                    </h3>
                    <div className="flex justify-between py-1.5 border-b border-border-subtle text-xs">
                      <span className="text-secondary">Cluster Connection</span>
                      <span className="font-bold text-emerald-700 capitalize">{healthData.database?.status}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border-subtle text-xs">
                      <span className="text-secondary">Mongoose ReadyState</span>
                      <span className="font-semibold text-primary">{healthData.database?.readyState} (Active)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border-subtle text-xs">
                      <span className="text-secondary">Driver Connectivity</span>
                      <span className="font-semibold text-emerald-700">Verified</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-xs">
                      <span className="text-secondary">Telemetry Timestamp</span>
                      <span className="font-semibold text-primary text-[11px]">{healthData.timestamp}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SECURITY & PASSWORD MANAGEMENT */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Password update form */}
              <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound size={18} className="text-rose-600" />
                  <h2 className="text-base font-bold text-primary">Admin Password Management</h2>
                </div>
                <p className="text-xs text-secondary leading-relaxed mb-5">
                  Update your administrative credentials. Minimum 8 characters with at least one letter and one number.
                </p>

                {pwMessage.text && (
                  <div
                    className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium border ${
                      pwMessage.type === 'success'
                        ? 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0]/40'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {pwMessage.type === 'success' ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <AlertTriangle size={15} />
                    )}
                    <span>{pwMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-white focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      New Admin Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-white focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Confirm New Admin Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
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

              {/* Security Policy Details */}
              <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={18} className="text-rose-600" />
                    <h3 className="text-sm font-bold text-primary">Administrator Session Security</h3>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed mb-4">
                    Privileged administrator credentials govern platform configuration, instructor authorization, and role management.
                  </p>

                  <div className="space-y-3 bg-white p-4 rounded-xl border border-border-subtle text-xs">
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Admin Name</span>
                      <span className="font-semibold text-primary">{user?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Admin Email</span>
                      <span className="font-semibold text-primary">{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-secondary">Role</span>
                      <span className="font-semibold text-rose-700 capitalize">{user?.role}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-secondary">Status</span>
                      <span className="font-semibold text-emerald-700 uppercase text-[11px]">
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
                    ← Return to Platform Overview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Instructor Approve/Reject */}
      {confirmDialog.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-elevated relative animate-[modalSlideUp_0.15s_ease-out]">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${
                confirmDialog.action === 'approve'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {confirmDialog.action === 'approve' ? (
                <UserCheck size={20} />
              ) : (
                <UserX size={20} />
              )}
            </div>

            <h3 id="confirm-dialog-title" className="text-base font-bold text-primary mb-1.5">
              {confirmDialog.action === 'approve'
                ? 'Approve Instructor Application'
                : 'Reject Instructor Application'}
            </h3>

            <p className="text-xs text-secondary leading-relaxed mb-6">
              {confirmDialog.action === 'approve'
                ? `Are you sure you want to approve ${confirmDialog.applicant?.name} (${confirmDialog.applicant?.email})? This grants full instructor privileges to author courses and grade student submissions.`
                : `Are you sure you want to reject the application for ${confirmDialog.applicant?.name} (${confirmDialog.applicant?.email})? This will suspend educator privileges.`}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: false, action: null, applicant: null })}
                className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(actionInProgress)}
                onClick={handleExecuteAction}
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                  confirmDialog.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionInProgress ? 'Processing...' : confirmDialog.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Course Approve/Reject */}
      {courseConfirmDialog.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-elevated relative animate-[modalSlideUp_0.15s_ease-out]">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${
                courseConfirmDialog.action === 'approve'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {courseConfirmDialog.action === 'approve' ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>

            <h3 className="text-base font-bold text-primary mb-1.5">
              {courseConfirmDialog.action === 'approve'
                ? 'Approve Course for Catalog Publication'
                : 'Reject Course with Feedback'}
            </h3>

            <p className="text-xs text-secondary leading-relaxed mb-4">
              {courseConfirmDialog.action === 'approve'
                ? `Publish "${courseConfirmDialog.course?.title}" to the public catalog? Students will immediately be eligible to discover and enroll in this course.`
                : `Specify actionable quality feedback for "${courseConfirmDialog.course?.title}". The instructor will receive this note to revise their curriculum.`}
            </p>

            {courseConfirmDialog.action === 'reject' && (
              <div className="mb-6">
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Rejection Reason / Quality Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={courseConfirmDialog.rejectionReason}
                  onChange={(e) =>
                    setCourseConfirmDialog((prev) => ({
                      ...prev,
                      rejectionReason: e.target.value,
                    }))
                  }
                  placeholder="e.g. Please add detailed lesson notes in Section 2 and check video audio clarity."
                  className="w-full px-3 py-2 text-xs bg-white border border-border-subtle rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-blue-dark"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setCourseConfirmDialog({
                    isOpen: false,
                    action: null,
                    course: null,
                    rejectionReason: '',
                  })
                }
                className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  Boolean(courseActionInProgress) ||
                  (courseConfirmDialog.action === 'reject' &&
                    !courseConfirmDialog.rejectionReason.trim())
                }
                onClick={handleExecuteCourseAction}
                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                  courseConfirmDialog.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {courseActionInProgress
                  ? 'Processing...'
                  : courseConfirmDialog.action === 'approve'
                  ? 'Approve & Publish'
                  : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Detail Preview Modal */}
      {previewCourse && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl bg-white border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-elevated relative max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setPreviewCourse(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full border border-border-subtle bg-surface-subtle flex items-center justify-center text-secondary hover:text-primary transition cursor-pointer"
            >
              &times;
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-blue-pale text-accent-blue-dark">
                {previewCourse.category}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-subtle text-secondary border border-border-subtle">
                {previewCourse.level}
              </span>
            </div>

            <h3 className="text-lg font-bold text-primary mb-1">{previewCourse.title}</h3>
            <p className="text-xs text-secondary leading-relaxed mb-4">{previewCourse.summary}</p>

            <div className="p-4 bg-surface-subtle border border-border-subtle rounded-2xl mb-6 text-xs text-secondary flex items-center justify-between">
              <div>
                Author: <span className="font-semibold text-primary">{previewCourse.instructor?.name}</span> ({previewCourse.instructor?.email})
              </div>
              <div>
                Modules: <span className="font-semibold text-primary">{previewCourse.totalSections}</span> • Lessons: <span className="font-semibold text-primary">{previewCourse.totalLessons}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setPreviewCourse(null)}
                className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = previewCourse;
                  setPreviewCourse(null);
                  setCourseConfirmDialog({
                    isOpen: true,
                    action: 'approve',
                    course: target,
                    rejectionReason: '',
                  });
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Proceed to Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
