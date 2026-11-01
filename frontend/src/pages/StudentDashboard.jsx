import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Send,
  Camera,
  MailCheck,
} from 'lucide-react';
import IconChip from '../components/ui/IconChip';
import { useAuth } from '../context/useAuth';
import { useNotifications } from '../context/useNotifications';
import { dashboardService, authService } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingState from '../components/dashboard/LoadingState';
import ErrorState from '../components/dashboard/ErrorState';
import AcademicCalendar from '../components/dashboard/AcademicCalendar';
import ProfilePictureModal from '../components/profile/ProfilePictureModal';
import StudentAnalyticsView from '../components/analytics/StudentAnalyticsView';

// Extracted student dashboard tabs
import StudentOverviewTab from '../components/dashboard/student/StudentOverviewTab';
import MyLearningTab from '../components/dashboard/student/MyLearningTab';
import CertificatesTab from '../components/dashboard/student/CertificatesTab';
import ExploreTab from '../components/dashboard/student/ExploreTab';
import AssignmentsTab from '../components/dashboard/student/AssignmentsTab';
import AnnouncementsTab from '../components/dashboard/student/AnnouncementsTab';
import SecurityTab from '../components/dashboard/student/SecurityTab';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState('overview');

  // Email verification resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    try {
      setResendLoading(true);
      setResendNotice(null);
      const res = await authService.resendVerification();
      setResendNotice({
        type: 'success',
        text: res.message || 'Verification link sent to your registered email address.',
      });
      setResendCooldown(60);
    } catch (err) {
      setResendNotice({
        type: 'error',
        text: err.normalizedMessage || 'Unable to send verification email. Please try again later.',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

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

  return (
    <DashboardLayout
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
        <div className="space-y-6">
          {/* Compact Greeting Line */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                title="Click to edit profile picture"
                className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-cobalt rounded-2xl shrink-0"
              >
                <div className="w-12 h-12 rounded-2xl bg-cobalt text-white flex items-center justify-center font-bold text-base overflow-hidden shadow-xs ring-1 ring-border-subtle group-hover:ring-cobalt transition-all">
                  {user?.avatar?.url ? (
                    <img
                      src={user.avatar.url}
                      alt={user?.name || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.name
                      ? user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                      : 'U'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 p-0.5 rounded-md bg-surface border border-border-subtle text-secondary group-hover:text-primary shadow-xs transition-colors">
                  <Camera size={10} />
                </div>
              </button>

              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                  Welcome back, {firstName}
                </h1>
                <p className="text-xs text-secondary mt-0.5">
                  Pick up where you left off and keep your learning moving forward.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-xs shadow-cobalt/20 transition-all cursor-pointer"
              >
                <Compass size={14} className="group-hover-wobble" />
                <span>Explore Catalog</span>
              </button>
            </div>
          </div>

          {/* Email Verification Banner (if unverified) */}
          {user && !user.emailVerified && !bannerDismissed && (
            <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 text-amber-950 shadow-xs relative">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <IconChip icon={MailCheck} tone="warning" size="md" animate className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-amber-950">Verify your email address</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                      A verification link was sent to <strong className="font-semibold text-amber-950">{user.email}</strong>.
                      Please confirm your email address to receive course updates, submit assignments, and claim certificates.
                    </p>
                    {resendNotice && (
                      <div
                        className={`mt-2 text-xs font-medium px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 ${
                          resendNotice.type === 'success'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {resendNotice.type === 'success' ? <CheckCircle2 size={12} strokeWidth={1.75} /> : <AlertTriangle size={12} strokeWidth={1.75} />}
                        <span>{resendNotice.text}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading || resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-xs font-semibold shadow-xs hover-lift btn-press transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      <>
                        <RefreshCw size={13} strokeWidth={1.75} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : resendCooldown > 0 ? (
                      <span>Resend in {resendCooldown}s</span>
                    ) : (
                      <>
                        <Send size={13} strokeWidth={1.75} />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerDismissed(true)}
                    className="text-amber-700 hover:text-amber-950 p-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer text-xs font-medium"
                    title="Dismiss notice"
                    aria-label="Dismiss notice"
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <StudentOverviewTab data={data} user={user} setActiveTab={setActiveTab} />
          )}

          {/* TAB: LEARNING ANALYTICS */}
          {activeTab === 'analytics' && <StudentAnalyticsView />}

          {/* TAB: MY LEARNING */}
          {activeTab === 'learning' && (
            <MyLearningTab data={data} setActiveTab={setActiveTab} />
          )}

          {/* TAB: EARNED CERTIFICATES */}
          {activeTab === 'certificates' && (
            <CertificatesTab setActiveTab={setActiveTab} />
          )}

          {/* TAB: EXPLORE COURSES */}
          {activeTab === 'explore' && (
            <ExploreTab setActiveTab={setActiveTab} />
          )}

          {/* TAB: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <AssignmentsTab setActiveTab={setActiveTab} onRefreshData={fetchStudentData} />
          )}

          {/* TAB: CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
                <AcademicCalendar />
              </div>
            </div>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <AnnouncementsTab
              data={data}
              notifications={notifications}
              unreadCount={unreadCount}
              markAsRead={markAsRead}
              markAllAsRead={markAllAsRead}
            />
          )}

          {/* TAB: SECURITY & PROFILE */}
          {activeTab === 'security' && (
            <SecurityTab user={user} setActiveTab={setActiveTab} />
          )}
        </div>
      )}

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </DashboardLayout>
  );
}
