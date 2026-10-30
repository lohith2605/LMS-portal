import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Zap
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { authService } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const resetHighlights = [
    {
      icon: Lock,
      title: 'Strong entropy standards',
      desc: 'Requires at least 8 characters with both alphabetic letters and numbers.'
    },
    {
      icon: ShieldCheck,
      title: 'Cost-12 bcrypt encryption',
      desc: 'Passwords are salted and securely hashed on the server before storage.'
    },
    {
      icon: Zap,
      title: 'Immediate session activation',
      desc: 'Resume your coursework directly without having to manually log in again.'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError('Reset token is missing. Please request a new password reset link.');
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setFormError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await authService.resetPassword({ token, newPassword: password });
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setFormError(err.normalizedMessage || 'Password reset failed. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        eyebrow="SECURITY VERIFICATION"
        headline="Invalid or missing token."
        description="Password reset links can only be accessed through the personalized URL sent to your registered email."
        highlights={resetHighlights}
        panelBadge="Security"
        formTitle="Invalid Reset Link"
        formSubtitle="This password reset link is invalid or incomplete."
      >
        <div className="py-2 text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <AlertCircle size={24} />
          </div>
          <p className="text-xs text-secondary leading-relaxed mb-6">
            The link you followed does not contain a valid security token or has already expired. Please request a fresh reset link below.
          </p>
          <Link
            to="/forgot-password"
            className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-1.5"
          >
            <span>Request New Reset Link</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        eyebrow="CREDENTIAL UPDATE"
        headline="Password updated successfully."
        description="Your new credentials are now active across your LearnSpace account."
        highlights={resetHighlights}
        panelBadge="Success"
        formTitle="Password Reset Complete"
        formSubtitle="Your credentials have been securely updated and an active session established."
      >
        <div className="py-2 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-base font-bold text-primary mb-2">
            You are ready to go!
          </h3>
          <p className="text-xs text-secondary leading-relaxed mb-6">
            Your password was changed and an authenticated session has been established.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Proceed to Dashboard</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="CREDENTIAL SECURITY"
      headline="Set a strong password to safeguard your account."
      description="Choose a unique combination of letters and numbers to ensure uninterrupted, secure access to your courses and records."
      highlights={resetHighlights}
      quote="Security designed to keep your learning uninterrupted."
      panelBadge="Reset"
      formTitle="Create new password"
      formSubtitle="Enter a new secure password for your LearnSpace account."
    >
      {formError && (
        <div
          className="mb-4 p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-[modalFadeIn_180ms_ease-out]"
          role="alert"
        >
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <span className="leading-snug">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        {/* New Password */}
        <div>
          <label
            htmlFor="reset-password"
            className="block text-xs font-semibold text-primary mb-1"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              disabled={submitting}
              className="w-full h-10 sm:h-11 pl-3.5 pr-10 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 disabled:opacity-60 placeholder:text-tertiary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary p-1 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Validation Micro-indicators */}
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                hasMinLength
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-surface-subtle text-tertiary border border-border-subtle'
              }`}
            >
              <CheckCircle2 size={10} /> 8+ chars
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                hasLetter
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-surface-subtle text-tertiary border border-border-subtle'
              }`}
            >
              <CheckCircle2 size={10} /> Letters
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                hasNumber
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-surface-subtle text-tertiary border border-border-subtle'
              }`}
            >
              <CheckCircle2 size={10} /> Numbers
            </span>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="reset-confirm-password"
            className="block text-xs font-semibold text-primary mb-1"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              disabled={submitting}
              className={`w-full h-10 sm:h-11 pl-3.5 pr-10 rounded-xl border bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:ring-2 disabled:opacity-60 placeholder:text-tertiary ${
                confirmPassword && !passwordsMatch
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
                  : 'border-border-subtle focus:border-cobalt focus:ring-focus-ring/30'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary p-1 transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs sm:text-sm font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Reset Password</span>
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )}
        </button>

        <div className="text-center pt-2.5 border-t border-divider text-xs text-secondary">
          <Link
            to="/login"
            className="font-semibold text-cobalt hover:text-cobalt-hover hover:underline"
          >
            Cancel and return to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
