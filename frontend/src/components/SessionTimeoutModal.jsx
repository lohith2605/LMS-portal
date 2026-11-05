import React from 'react';
import { Clock, ShieldAlert, LogOut, ArrowRight, Loader2 } from 'lucide-react';

/**
 * Session Inactivity Warning Modal
 * Displays an authoritative countdown (03:00) when a user has been inactive for 7 minutes,
 * allowing them to Stay Signed In (refreshes server session) or safely Log Out.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {number} props.countdownSeconds - Remaining countdown in seconds (0 to 180)
 * @param {Function} props.onStaySignedIn - Async callback to refresh session
 * @param {Function} props.onLogout - Callback to terminate session immediately
 * @param {boolean} props.isRefreshing - Loading indicator during server refresh
 */
export default function SessionTimeoutModal({
  isOpen,
  countdownSeconds = 180,
  onStaySignedIn,
  onLogout,
  isRefreshing = false,
}) {
  if (!isOpen) return null;

  // Format seconds into strict mm:ss (e.g. 180 -> "03:00")
  const minutes = Math.floor(Math.max(0, countdownSeconds) / 60);
  const seconds = Math.max(0, countdownSeconds) % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCritical = countdownSeconds <= 60;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-description"
    >
      <div className="bg-white border border-border-subtle rounded-2xl max-w-md w-full p-5 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative overflow-hidden animate-[modalFadeIn_180ms_ease-out]">
        {/* Decorative Top Accent */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 transition-colors duration-300 ${
            isCritical ? 'bg-rose-500' : 'bg-amber-500'
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isCritical
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}
          >
            {isCritical ? <ShieldAlert size={22} /> : <Clock size={22} />}
          </div>
          <div>
            <h2
              id="session-timeout-title"
              className="text-base sm:text-lg font-bold text-primary tracking-tight"
            >
              Session Inactivity Warning
            </h2>
            <p
              id="session-timeout-description"
              className="text-xs text-secondary leading-relaxed mt-1"
            >
              You have been inactive for 7 minutes. For your security, your session will
              automatically expire and log you out.
            </p>
          </div>
        </div>

        {/* Prominent Countdown Display */}
        <div
          className={`my-5 py-3 px-4 sm:px-6 rounded-xl border flex items-center justify-between transition-colors ${
            isCritical
              ? 'bg-rose-50/80 border-rose-200 text-rose-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock
              size={18}
              className={`${isCritical ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`}
            />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Time Remaining
            </span>
          </div>
          <span
            className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest"
            aria-live="polite"
          >
            {formattedCountdown}
          </span>
        </div>

        {/* Policy Notice */}
        <p className="text-[11px] text-tertiary leading-relaxed mb-6">
          Clicking <strong>Stay Signed In</strong> will extend your session by an additional 10
          minutes. Note that passive background playback without interaction does not count as
          activity.
        </p>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={isRefreshing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>

          <button
            type="button"
            onClick={onStaySignedIn}
            disabled={isRefreshing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cobalt hover:bg-cobalt-hover active:bg-cobalt-pressed text-white text-xs font-semibold shadow-sm shadow-cobalt/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Refreshing Session...</span>
              </>
            ) : (
              <>
                <span>Stay Signed In</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

