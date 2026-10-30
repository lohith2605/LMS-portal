import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { authService } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const recoveryHighlights = [
    {
      icon: KeyRound,
      title: 'Hashed verification tokens',
      desc: 'Tokens expire after 10 minutes and can only be used once.'
    },
    {
      icon: ShieldCheck,
      title: 'Account enumeration defense',
      desc: 'Generic responses prevent discovery of registered emails.'
    },
    {
      icon: CheckCircle2,
      title: 'Seamless access restoration',
      desc: 'Pick your new password and jump straight back to your coursework.'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      await authService.forgotPassword(trimmedEmail);
      setSubmitted(true);
    } catch (err) {
      setFormError(err.normalizedMessage || 'Unable to process request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout
        eyebrow="ACCOUNT RECOVERY"
        headline="Instructions dispatched."
        description="Check your inbox to proceed with credential recovery."
        highlights={recoveryHighlights}
        panelBadge="Recovery"
        formTitle="Check your email"
        formSubtitle="Password reset instructions have been dispatched to your address."
      >
        <div className="py-2 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <Mail size={24} />
          </div>
          <h3 className="text-base font-bold text-primary mb-2">
            Reset Link Dispatched
          </h3>
          <p className="text-xs text-secondary leading-relaxed mb-6">
            If an account matching <strong className="text-primary">{email}</strong> exists, an email containing your password reset link has been dispatched. Please check your inbox and spam folders.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/login"
              className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-1.5"
            >
              <span>Return to Sign In</span>
              <ArrowRight size={13} />
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              className="w-full h-11 px-4 rounded-xl bg-surface-subtle text-secondary hover:text-primary border border-border-subtle text-xs font-semibold transition-all cursor-pointer"
            >
              Try another email
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="ACCOUNT RECOVERY"
      headline="Regain access to your learning space."
      description="We will verify your identity with a secure, time-limited token to safely restore your access."
      highlights={recoveryHighlights}
      quote="Account protection engineered for peace of mind."
      panelBadge="Recovery"
      formTitle="Forgot your password?"
      formSubtitle="Enter the email associated with your LearnSpace account to receive reset instructions."
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

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-xs font-semibold text-primary mb-1.5"
          >
            Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
            className="w-full h-11 sm:h-12 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 disabled:opacity-60 placeholder:text-tertiary"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full h-11 sm:h-12 px-4 rounded-xl bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending instructions...</span>
            </>
          ) : (
            <>
              <span>Send Reset Instructions</span>
              <ArrowRight size={15} aria-hidden="true" />
            </>
          )}
        </button>

        <div className="text-center pt-3 border-t border-divider text-xs text-secondary">
          <Link
            to="/login"
            className="font-semibold text-cobalt hover:text-cobalt-hover hover:underline inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={13} />
            <span>Back to sign in</span>
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
