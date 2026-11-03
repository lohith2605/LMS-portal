import React from 'react';
import {
  X,
  Bell,
  FileText,
  HelpCircle,
  MessageSquare,
  Award,
  CheckCircle2,
  Clock,
  ChevronRight,
  Megaphone,
} from 'lucide-react';

const getToastIconInfo = (type) => {
  switch (type) {
    case 'assignment_published':
      return {
        icon: FileText,
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        badge: 'Assignment',
      };
    case 'quiz_published':
      return {
        icon: HelpCircle,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'Quiz',
      };
    case 'submission_graded':
      return {
        icon: CheckCircle2,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'Graded',
      };
    case 'course_enrolled':
      return {
        icon: Award,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'Enrollment',
      };
    case 'assignment_submitted':
      return {
        icon: FileText,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        badge: 'Submission',
      };
    case 'discussion_created':
    case 'discussion_reply':
      return {
        icon: MessageSquare,
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        badge: 'Discussion',
      };
    case 'reply_accepted':
      return {
        icon: CheckCircle2,
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        badge: 'Accepted Answer',
      };
    case 'certificate_issued':
      return {
        icon: Award,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        badge: 'Certificate',
      };
    case 'deadline_reminder':
      return {
        icon: Clock,
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        badge: 'Deadline Alert',
      };
    case 'assignment_rescheduled':
    case 'quiz_rescheduled':
      return {
        icon: Clock,
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        badge: 'Deadline Updated',
      };
    case 'course_announcement':
      return {
        icon: Megaphone,
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        badge: 'Course Announcement',
      };
    case 'platform_announcement':
      return {
        icon: Megaphone,
        bg: 'bg-rose-50 text-rose-800 border-rose-200',
        badge: 'Platform Notice',
      };
    default:
      return {
        icon: Bell,
        bg: 'bg-surface-subtle text-primary border-border-subtle',
        badge: 'Notice',
      };
  }
};

function ToastItem({ toast, onDismiss, onNavigate }) {
  const [isPaused, setIsPaused] = React.useState(false);
  const remainingTimeRef = React.useRef(5000);
  const startTimeRef = React.useRef(null);
  const timerIdRef = React.useRef(null);

  React.useEffect(() => {
    if (isPaused) {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
        if (startTimeRef.current) {
          remainingTimeRef.current -= Date.now() - startTimeRef.current;
        }
      }
      return;
    }

    startTimeRef.current = Date.now();
    timerIdRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, Math.max(1000, remainingTimeRef.current));

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, [isPaused, onDismiss, toast.id]);

  const iconInfo = getToastIconInfo(toast.type);
  const IconComponent = iconInfo.icon;

  const handleClick = (e) => {
    // If dismiss button clicked, ignore card click
    if (e.target.closest('button[data-dismiss="true"]')) {
      return;
    }
    if (toast.link && onNavigate) {
      onNavigate(toast.link, toast.id);
    }
    onDismiss(toast.id);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={handleClick}
      className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border-subtle bg-surface/95 backdrop-blur-md p-3.5 shadow-elevated transition-all duration-300 hover:shadow-lg cursor-pointer animate-[modalFadeIn_200ms_ease-out] relative group overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent-blue" />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${iconInfo.bg}`}
        >
          <IconComponent size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${iconInfo.bg}`}
            >
              {iconInfo.badge}
            </span>
            <span className="text-[10px] text-tertiary font-medium">Just now</span>
          </div>

          <h4 className="text-xs font-bold text-primary leading-snug line-clamp-1 mb-0.5">
            {toast.title}
          </h4>

          <p className="text-xs text-secondary leading-relaxed line-clamp-2">
            {toast.message}
          </p>

          {toast.link && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-accent group-hover:underline">
              <span>View details</span>
              <ChevronRight size={12} />
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          data-dismiss="true"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          aria-label="Dismiss notification popup"
          className="w-7 h-7 rounded-lg border border-transparent hover:border-border-subtle hover:bg-surface-subtle text-secondary hover:text-primary transition-colors flex items-center justify-center shrink-0 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function NotificationToastContainer({ toasts = [], onDismiss, onNavigate }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-label="Real-time notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.slice(0, 3).map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
