import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Bell,
  CheckCheck,
  FileText,
  MessageSquare,
  Award,
  CheckCircle2,
  Calendar,
  ChevronRight,
  RefreshCw,
  Inbox,
  Clock,
  HelpCircle,
  Monitor,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import { useNotifications } from '../../context/useNotifications';
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
} from '../../utils/desktopNotification';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'assignment_published':
      return {
        icon: FileText,
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        label: 'Assignment',
      };
    case 'quiz_published':
      return {
        icon: HelpCircle,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Quiz',
      };
    case 'assignment_submitted':
      return {
        icon: FileText,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Submission',
      };
    case 'submission_graded':
      return {
        icon: CheckCircle2,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Graded',
      };
    case 'course_enrolled':
      return {
        icon: Award,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Enrollment',
      };
    case 'discussion_created':
    case 'discussion_reply':
      return {
        icon: MessageSquare,
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        label: 'Discussion',
      };
    case 'reply_accepted':
      return {
        icon: CheckCircle2,
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        label: 'Accepted Answer',
      };
    case 'certificate_issued':
      return {
        icon: Award,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Certificate',
      };
    case 'deadline_reminder':
      return {
        icon: Clock,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Deadline Reminder',
      };
    case 'assignment_rescheduled':
    case 'quiz_rescheduled':
      return {
        icon: Calendar,
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        label: 'Deadline Rescheduled',
      };
    case 'course_announcement':
      return {
        icon: Megaphone,
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        label: 'Course Notice',
      };
    case 'platform_announcement':
      return {
        icon: Megaphone,
        bg: 'bg-rose-50 text-rose-800 border-rose-200',
        label: 'Platform Notice',
      };
    default:
      return {
        icon: Bell,
        bg: 'bg-[#F2F2F0] text-primary border-border-subtle',
        label: 'Notice',
      };
  }
};

export default function NotificationDrawer({ isOpen, onClose, announcements = [] }) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMoreNotifications,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [desktopPermission, setDesktopPermission] = useState(() =>
    getDesktopNotificationPermission()
  );
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const syncPermission = () => {
      setDesktopPermission(getDesktopNotificationPermission());
    };
    syncPermission();
    window.addEventListener('focus', syncPermission);
    return () => window.removeEventListener('focus', syncPermission);
  }, [isOpen]);

  const handleRequestDesktopPermission = async () => {
    setRequestingPermission(true);
    try {
      const res = await requestDesktopNotificationPermission();
      setDesktopPermission(res);
    } finally {
      setRequestingPermission(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayedNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markAsRead(item._id);
    }
    if (item.link) {
      onClose();
      navigate(item.link);
    }
  };

  const handleMarkItemRead = (e, id) => {
    e.stopPropagation();
    markAsRead(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-title"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border-subtle shadow-elevated flex flex-col">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border-subtle flex items-center justify-between bg-surface-subtle/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-primary shadow-xs">
                <Bell size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="notifications-title" className="text-base font-bold text-primary">
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-secondary">
                  Real-time updates and course activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-secondary hover:text-primary hover:bg-white border border-transparent hover:border-border-subtle transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close notifications panel"
                className="w-8 h-8 rounded-full border border-border-subtle bg-white flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-5 py-2.5 border-b border-border-subtle flex items-center justify-between bg-white text-xs">
            <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border-subtle">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                All ({totalCount || notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchNotifications()}
              disabled={isLoading}
              title="Refresh notifications"
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Desktop Notification Banner */}
          {desktopPermission === 'default' && (
            <div className="mx-4 sm:mx-5 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-accent/5 to-accent-blue/5 border border-accent/20 flex items-start gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Monitor size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-primary mb-0.5">Enable Desktop Notifications</h4>
                <p className="text-[11px] text-secondary leading-relaxed mb-2.5">
                  Receive Windows & browser alerts for new assignments, quizzes, and discussion replies when this tab is in the background.
                </p>
                <button
                  type="button"
                  onClick={handleRequestDesktopPermission}
                  disabled={requestingPermission}
                  className="px-3 py-1.5 rounded-lg bg-accent text-white font-semibold text-[11px] hover:bg-accent/90 active:scale-98 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Bell size={12} />
                  <span>{requestingPermission ? 'Requesting...' : 'Enable Notifications'}</span>
                </button>
              </div>
            </div>
          )}

          {desktopPermission === 'granted' && (
            <div className="mx-4 sm:mx-5 mt-3 px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-800 text-[11px] font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Desktop notifications active</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Enabled</span>
            </div>
          )}

          {desktopPermission === 'denied' && (
            <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2.5">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold block text-amber-950">Desktop notifications blocked in browser</span>
                <p className="text-amber-800 mt-0.5 text-[10px] leading-relaxed">
                  To receive alerts when tabs are in the background, allow notifications in your browser's site settings.
                </p>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => fetchNotifications()}
                  className="font-bold underline cursor-pointer ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoading && notifications.length === 0 ? (
              // Loading Skeleton
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl border border-border-subtle bg-white space-y-2 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-20 bg-gray-200 rounded" />
                      <div className="h-3 w-12 bg-gray-200 rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    <div className="h-3 w-5/6 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : displayedNotifications.length > 0 ? (
              <>
                {displayedNotifications.map((item) => {
                  const iconInfo = getNotificationIcon(item.type);
                  const IconComponent = iconInfo.icon;
                  const isUnread = !item.isRead;

                  return (
                    <div
                      key={item._id}
                      onClick={() => handleNotificationClick(item)}
                      className={`group relative p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                        isUnread
                          ? 'bg-blue-50/40 border-blue-200/80 hover:bg-blue-50/70 shadow-xs'
                          : 'bg-white border-border-subtle hover:bg-surface-subtle'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${iconInfo.bg}`}
                        >
                          <IconComponent size={15} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${iconInfo.bg}`}
                            >
                              {iconInfo.label}
                            </span>
                            <span className="text-[10px] text-tertiary font-medium flex items-center gap-1 shrink-0">
                              <Calendar size={10} />
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>

                          <h3
                            className={`text-xs font-bold leading-snug mb-0.5 ${
                              isUnread ? 'text-primary' : 'text-primary/90'
                            }`}
                          >
                            {item.title}
                          </h3>

                          <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                            {item.message}
                          </p>

                          {item.link && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-accent-blue-dark group-hover:underline">
                              <span>View details</span>
                              <ChevronRight size={12} />
                            </div>
                          )}
                        </div>

                        {/* Read indicator / Action */}
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                          {isUnread && (
                            <span
                              className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"
                              title="Unread"
                            />
                          )}
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkItemRead(e, item._id)}
                              title="Mark as read"
                              className="p-1 rounded text-secondary hover:text-primary hover:bg-white transition-colors cursor-pointer"
                            >
                              <CheckCheck size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filter === 'all' && hasMore && (
                  <div className="pt-2 pb-1 text-center">
                    <button
                      type="button"
                      onClick={loadMoreNotifications}
                      disabled={isLoadingMore}
                      className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-border-subtle bg-white hover:bg-surface-subtle text-primary transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Loading more...</span>
                        </>
                      ) : (
                        <span>Load More Notifications</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : announcements && announcements.length > 0 && filter === 'all' ? (
              // Announcements fallback if no notifications exist yet
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-tertiary uppercase tracking-wider px-1">
                  System Announcements
                </div>
                {announcements.map((item) => (
                  <div
                    key={item._id || item.id}
                    className="p-4 rounded-2xl border border-border-subtle bg-surface-subtle"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                        {item.tag || (item.scope === 'course' ? 'Course Notice' : 'System Notice')}
                      </span>
                      <span className="text-[11px] text-tertiary">
                        {item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '')}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-primary mb-1">{item.title}</h3>
                    <p className="text-xs text-secondary leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="text-center py-14 px-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary mx-auto mb-3 shadow-xs">
                  <Inbox size={22} />
                </div>
                <h4 className="text-sm font-bold text-primary">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h4>
                <p className="text-xs text-secondary mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                  {filter === 'unread'
                    ? 'You have caught up with all active notices!'
                    : 'Real-time updates about your assignments, discussions, and course completions will appear here.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-border-subtle bg-surface-subtle/60 flex items-center justify-between text-[11px] text-tertiary px-5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Real-Time Engine Active</span>
            </span>
            <span>LearnSpace LMS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
