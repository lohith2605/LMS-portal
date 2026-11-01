import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MailCheck,
} from 'lucide-react';
import { authService } from '../../../services/api';

export default function SecurityTab({ user, setActiveTab }) {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwFeedback, setPwFeedback] = useState({ type: '', text: '' });

  // Email verification resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState(null);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Password Change Form */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={18} className="text-accent-blue-dark" />
          <h3 className="text-sm font-bold text-primary">Change Password</h3>
        </div>
        <p className="text-xs text-secondary leading-relaxed mb-6">
          Ensure your account stays secure by using a strong, unique password of at least 8 characters.
        </p>

        {pwFeedback.text && (
          <div
            className={`p-3.5 rounded-xl border text-xs mb-5 flex items-start gap-2.5 ${
              pwFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {pwFeedback.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            )}
            <span>{pwFeedback.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter existing account password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30"
            />
          </div>

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all cursor-pointer disabled:opacity-50"
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
            <div className="flex justify-between py-1 border-b border-border-subtle items-center">
              <span className="text-secondary">Email Address</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">{user?.email}</span>
                {user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={11} />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={11} />
                    Unverified
                  </span>
                )}
              </div>
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

          {!user?.emailVerified && (
            <div className="mt-4 p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-950">Email verification required</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Verify your email address to enable certificate issuance and assignment notifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading || resendCooldown > 0}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  {resendLoading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Resend in {resendCooldown}s</span>
                  ) : (
                    <>
                      <MailCheck size={12} />
                      <span>Resend Email</span>
                    </>
                  )}
                </button>
              </div>
              {resendNotice && (
                <p
                  className={`mt-2 text-[11px] font-medium ${
                    resendNotice.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {resendNotice.text}
                </p>
              )}
            </div>
          )}
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
  );
}

