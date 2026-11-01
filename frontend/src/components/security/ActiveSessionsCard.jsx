import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Globe,
  RefreshCw,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import { sessionService } from '../../services/api';
import { useAuth } from '../../context/useAuth';

export default function ActiveSessionsCard() {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Confirmation modal state: null | { type: 'single', sessionId: string, deviceName: string } | { type: 'all_others' }
  const [confirmModal, setConfirmModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSessions = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await sessionService.getSessions();
      setSessions(data.sessions || []);
      setCurrentSessionId(data.currentSessionId || null);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        return;
      }
      setError(err.normalizedMessage || 'Failed to load active device sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Handle single session revocation
  const handleRevokeSingle = async (sessionId) => {
    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await sessionService.revokeSession(sessionId);

      if (res.loggedOut) {
        await logout();
        return;
      }

      setFeedback({
        type: 'success',
        message: 'Device session has been logged out successfully.',
      });
      setConfirmModal(null);
      await fetchSessions(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.normalizedMessage || 'Failed to revoke device session.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle revoking all other sessions
  const handleRevokeOthers = async () => {
    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await sessionService.revokeOtherSessions();

      setFeedback({
        type: 'success',
        message: res.message || 'All other devices have been logged out.',
      });
      setConfirmModal(null);
      await fetchSessions(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.normalizedMessage || 'Failed to revoke other sessions.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper: Format relative time
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Helper: Format date string
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper: Get icon by device type
  const getDeviceIcon = (device) => {
    const type = device?.type || 'desktop';
    if (type === 'mobile') {
      return <Smartphone size={20} className="text-cobalt" />;
    }
    if (type === 'tablet') {
      return <Tablet size={20} className="text-cobalt" />;
    }
    if (device?.os?.toLowerCase().includes('mac') || device?.os?.toLowerCase().includes('windows')) {
      return <Laptop size={20} className="text-cobalt" />;
    }
    return <Monitor size={20} className="text-cobalt" />;
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cobalt/10 border border-cobalt-border/40 flex items-center justify-center shrink-0">
            <Monitor size={20} className="text-cobalt" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-primary">Active Sessions & Devices</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cobalt-soft text-cobalt border border-cobalt-border/50">
                Multi-Device
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Review and manage devices and browsers with active access to your account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {otherSessionsCount > 0 && (
            <button
              type="button"
              onClick={() => setConfirmModal({ type: 'all_others' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Log Out Other Devices ({otherSessionsCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchSessions(true)}
            disabled={loading || refreshing}
            aria-label="Refresh active sessions"
            title="Refresh active sessions"
            className="p-2 rounded-xl border border-border-subtle bg-surface text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          role="status"
          className={`mt-4 p-3 rounded-xl flex items-center justify-between text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-secondary hover:text-primary p-0.5 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchSessions()}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border-subtle bg-surface-subtle animate-pulse flex items-center justify-between"
            >
              <div className="flex items-center gap-3 w-2/3">
                <div className="w-10 h-10 rounded-lg bg-border-subtle shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-border-subtle rounded-md w-1/3" />
                  <div className="h-2.5 bg-border-subtle rounded-md w-2/3" />
                </div>
              </div>
              <div className="w-16 h-7 bg-border-subtle rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        /* Sessions List */
        <div className="mt-6 space-y-3">
          {sessions.length === 0 ? (
            <div className="py-8 text-center text-secondary text-xs">
              No active sessions found. Sign in from a device to view access details.
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.isCurrent || session.id === currentSessionId;
              const deviceName = `${session.device?.browser || 'Browser'} on ${session.device?.os || 'Device'}`;

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-cobalt-soft/20 border-cobalt-border shadow-xs'
                      : 'bg-surface hover:bg-surface-subtle border-border-subtle'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? 'bg-cobalt/15 border-cobalt/30 text-cobalt'
                          : 'bg-surface-subtle border-border-subtle text-secondary'
                      }`}
                    >
                      {getDeviceIcon(session.device)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-primary">{deviceName}</span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cobalt text-white shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            This device
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-secondary flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Globe size={11} className="text-tertiary" />
                          <span>{session.ipAddress}</span>
                        </span>
                        <span className="text-border-subtle">•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} className="text-tertiary" />
                          <span>Active {formatTimeAgo(session.lastActiveAt)}</span>
                        </span>
                        <span className="text-border-subtle">•</span>
                        <span className="text-tertiary">
                          Signed in {formatDateTime(session.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isCurrent ? (
                      <span className="text-[11px] font-semibold text-cobalt px-2.5 py-1 rounded-lg bg-cobalt-soft border border-cobalt-border/50">
                        Current Session
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmModal({
                            type: 'single',
                            sessionId: session.id,
                            deviceName,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface text-secondary hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]"
        >
          <div className="bg-surface border border-border-subtle rounded-2xl max-w-md w-full p-6 shadow-elevated animate-[scaleUp_0.15s_ease-out]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <LogOut size={20} />
              </div>
              <h3 id="confirm-modal-title" className="text-base font-bold text-primary">
                {confirmModal.type === 'all_others'
                  ? 'Log out all other devices?'
                  : 'Log out device session?'}
              </h3>
            </div>

            <p className="text-xs text-secondary leading-relaxed mb-6">
              {confirmModal.type === 'all_others'
                ? `This will immediately terminate all active sessions on other browsers, phones, and tablets. Only this current device will stay signed in.`
                : `Are you sure you want to revoke access for ${confirmModal.deviceName}? That device will be immediately signed out and must log in again.`}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-border-subtle bg-surface text-secondary hover:text-primary hover:bg-surface-subtle text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === 'all_others') {
                    handleRevokeOthers();
                  } else {
                    handleRevokeSingle(confirmModal.sessionId);
                  }
                }}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={13} />
                    <span>
                      {confirmModal.type === 'all_others' ? 'Log Out Other Devices' : 'Log Out Device'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

