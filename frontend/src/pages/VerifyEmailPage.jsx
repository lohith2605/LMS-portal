import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MailCheck,
  ShieldCheck,
  Award,
  RefreshCw,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { authService } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState(!token ? 'error' : 'checking');
  const [errorMessage, setErrorMessage] = useState(
    !token
      ? 'Verification token is missing. Please use the link sent to your registered email address.'
      : ''
  );
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const { isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const verificationInitiated = useRef(false);

  const verificationHighlights = [
    {
      icon: ShieldCheck,
      title: 'Cryptographic confirmation',
      desc: 'Single-use cryptographic hash protects your account identity.',
    },
    {
      icon: MailCheck,
      title: 'Verified channel',
      desc: 'Ensures reliable delivery of course updates, assignment feedback, and security alerts.',
    },
    {
      icon: Award,
      title: 'Course completion credentials',
      desc: 'Enables issuance of verified digital certificates upon course completion.',
    },
  ];

  useEffect(() => {
    if (!token) return;

    // Guard against React Strict Mode executing duplicate verification requests
    if (verificationInitiated.current) return;
    verificationInitiated.current = true;

    authService
      .verifyEmail(token)
      .then(async () => {
        setStatus('success');
        if (isAuthenticated) {
          await refreshUser();
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(
          err.normalizedMessage || 'This verification link is invalid or has already expired.'
        );
      });
  }, [token, isAuthenticated, refreshUser]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    try {
      setResending(true);
      setResendNotice(null);
      const res = await authService.resendVerification();
      setResendNotice({ type: 'success', text: res.message || 'Verification link sent to your email.' });
      setCooldown(60);
    } catch (err) {
      setResendNotice({
        type: 'error',
        text: err.normalizedMessage || 'Unable to dispatch verification email at this time.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="SECURITY & IDENTITY"
      headline="Confirm your LearnSpace credentials."
      description="Verifying your email confirms ownership of your account and ensures uninterrupted delivery of course milestones, assignments, and certificates."
      highlights={verificationHighlights}
      panelBadge="Identity"
      formTitle="Email Verification"
      formSubtitle="Confirming your email address for secure platform access."
    >
      <div className="py-3 text-center">
        {status === 'checking' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center mx-auto text-cobalt">
              <div className="w-6 h-6 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-base font-bold text-primary">
              Verifying your email address...
            </h3>
            <p className="text-xs text-secondary leading-relaxed max-w-sm mx-auto">
              Please wait a moment while we validate your security token with the server.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-primary">
              Email Verified Successfully
            </h3>
            <p className="text-xs text-secondary leading-relaxed max-w-sm mx-auto">
              Your email address has been confirmed. Your account is fully active and ready for all coursework.
            </p>

            <div className="pt-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Proceed to Dashboard</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <span>Sign In to Your Account</span>
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-200 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-primary">
              Verification Link Invalid
            </h3>
            <p className="text-xs text-secondary leading-relaxed max-w-sm mx-auto">
              {errorMessage}
            </p>

            {resendNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 text-left ${
                  resendNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {resendNotice.type === 'success' ? (
                  <CheckCircle2 size={14} className="shrink-0" />
                ) : (
                  <AlertCircle size={14} className="shrink-0" />
                )}
                <span>{resendNotice.text}</span>
              </div>
            )}

            <div className="pt-2 space-y-2.5">
              {isAuthenticated && (
                <button
                  type="button"
                  disabled={resending || cooldown > 0}
                  onClick={handleResend}
                  className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                  <span>
                    {resending
                      ? 'Sending...'
                      : cooldown > 0
                      ? `Resend available in ${cooldown}s`
                      : 'Resend Verification Email'}
                  </span>
                </button>
              )}

              <Link
                to={isAuthenticated ? '/dashboard' : '/login'}
                className="w-full h-10 px-4 rounded-xl border border-border-subtle bg-surface-subtle hover:bg-white text-xs font-semibold text-secondary hover:text-primary transition-all inline-flex items-center justify-center"
              >
                <span>{isAuthenticated ? 'Return to Dashboard' : 'Back to Sign In'}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
