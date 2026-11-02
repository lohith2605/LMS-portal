import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Compass,
  Target,
  Layers,
  ShieldCheck,
  Smartphone,
  Mail,
  Key,
  Copy,
  Check,
  RotateCcw,
  Download,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import { mfaService } from '../services/api';

function GoogleIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const fromAdminPath = Boolean(location.state?.from?.pathname?.startsWith('/admin'));
  const isAdminRole = location.pathname === '/admin/login' || fromAdminPath;

  // View state: 'credentials' | 'mfa_challenge' | 'admin_mfa_setup'
  const [viewMode, setViewMode] = useState('credentials');

  // Credentials State
  const [email, setEmail] = useState(() => (isAdminRole ? 'admin@learnspace.io' : ''));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // MFA Challenge State
  const [mfaData, setMfaData] = useState(null); // { preAuthToken, method, message, role }
  const [mfaCode, setMfaCode] = useState('');
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Admin First-time Bootstrap State
  const [adminSetup, setAdminSetup] = useState(null); // { qrCode, secret, manualEntryKey }
  const [adminConfirmCode, setAdminConfirmCode] = useState('');
  const [adminRecoveryCodes, setAdminRecoveryCodes] = useState([]);
  const [adminSavedConfirmed, setAdminSavedConfirmed] = useState(false);
  const [verifiedAdminUser, setVerifiedAdminUser] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecoveryCodes, setCopiedRecoveryCodes] = useState(false);

  const { login, adminLogin, loginWithGoogle, completeMfaLogin } = useAuth();
  const navigate = useNavigate();

  // Cooldown timer for email resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If query parameter role=admin arrives on common /login, redirect to dedicated /admin/login route
  if (location.pathname === '/login' && searchParams.get('role') === 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  // Return to intended page if safe, otherwise role-appropriate dashboard
  const destination = isAdminRole
    ? location.state?.from?.pathname?.startsWith('/admin')
      ? location.state.from.pathname
      : '/admin/dashboard'
    : location.state?.from?.pathname && !location.state?.from?.pathname?.startsWith('/admin')
      ? location.state.from.pathname
      : '/dashboard';

  const loginHighlights = [
    {
      icon: Compass,
      title: 'Guided Learning Paths',
      desc: 'Structured curricula engineered for verifiable mastery and immediate real-world execution.'
    },
    {
      icon: Target,
      title: 'Practical Assessment',
      desc: 'Applied assignments, capstone reviews, and objective performance milestones.'
    },
    {
      icon: Layers,
      title: 'Verified Certification',
      desc: 'Cryptographically issued course credentials shareable on professional registries.'
    }
  ];

  const adminHighlights = [
    {
      icon: ShieldCheck,
      title: 'Platform Governance',
      desc: 'Oversee system operations, configure application settings, and audit health metrics.'
    },
    {
      icon: Target,
      title: 'Curriculum & Review Queues',
      desc: 'Evaluate instructor course submissions and enforce verified pedagogical standards.'
    },
    {
      icon: Layers,
      title: 'Role & User Authorization',
      desc: 'Approve educator credentials, manage account lifecycles, and enforce security policies.'
    }
  ];

  // Navigate after full authentication
  const handleAuthSuccess = (userData) => {
    completeMfaLogin(userData);
    if (destination === '/dashboard' || destination === '/admin/dashboard') {
      if (userData?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userData?.role === 'instructor') {
        navigate('/instructor/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } else {
      navigate(destination, { replace: true });
    }
  };

  // Start admin initial setup
  const startAdminSetup = async (token) => {
    try {
      setSubmitting(true);
      const setupData = await mfaService.initAdminSetup(token);
      setAdminSetup(setupData);
      setViewMode('admin_mfa_setup');
    } catch (err) {
      setFormError(err.normalizedMessage || 'Failed to initialize administrator 2FA setup.');
      setViewMode('credentials');
    } finally {
      setSubmitting(false);
    }
  };

  // Primary Credentials Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      const authFn = isAdminRole ? adminLogin : login;
      const data = await authFn({ email: trimmedEmail, password });

      // Handle Two-Factor Authentication interception
      if (data?.mfaRequired) {
        setMfaData(data);
        if (data.mfaSetupRequired) {
          await startAdminSetup(data.preAuthToken);
        } else {
          setViewMode('mfa_challenge');
          if (data.method === 'email_otp') {
            setResendCooldown(60);
          }
        }
        return;
      }

      handleAuthSuccess(data?.user);
    } catch (err) {
      setFormError(err.normalizedMessage || 'Invalid email address or password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setFormError(null);

    if (!isFirebaseConfigured() || !auth) {
      setFormError(
        'Google sign-in is currently unavailable because Firebase is not fully configured. Please ensure frontend Firebase environment variables are set.'
      );
      return;
    }

    try {
      setGoogleSubmitting(true);
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();

      const data = await loginWithGoogle(idToken);

      // Handle Two-Factor Authentication interception for Google logins
      if (data?.mfaRequired) {
        setMfaData(data);
        setViewMode('mfa_challenge');
        if (data.method === 'email_otp') {
          setResendCooldown(60);
        }
        return;
      }

      handleAuthSuccess(data?.user);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setFormError('The sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
        return;
      }
      if (err.code === 'auth/network-request-failed') {
        setFormError('Network connection issue during Google sign-in. Please check your internet connection.');
        return;
      }
      setFormError(err.normalizedMessage || err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  // MFA Challenge Code Verification
  const handleVerifyMfaChallenge = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = mfaCode.trim();
    if (!cleanCode) {
      setFormError(isRecoveryCode ? 'Please enter a backup recovery code.' : 'Please enter your 6-digit verification code.');
      return;
    }

    try {
      setMfaSubmitting(true);
      const data = await mfaService.verifyChallenge({
        preAuthToken: mfaData.preAuthToken,
        code: cleanCode,
        isRecoveryCode,
      });

      handleAuthSuccess(data.user);
    } catch (err) {
      setFormError(err.normalizedMessage || 'Verification failed. Please check the code and try again.');
    } finally {
      setMfaSubmitting(false);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    try {
      setResending(true);
      setFormError(null);
      await mfaService.resendEmailOtp(mfaData.preAuthToken);
      setResendCooldown(60);
    } catch (err) {
      setFormError(err.normalizedMessage || 'Failed to resend email code.');
    } finally {
      setResending(false);
    }
  };

  // Confirm Admin First-Time TOTP Setup
  const handleConfirmAdminSetup = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = adminConfirmCode.trim();
    if (!cleanCode) {
      setFormError('Please enter the 6-digit code from Google Authenticator.');
      return;
    }

    try {
      setMfaSubmitting(true);
      const data = await mfaService.confirmAdminSetup({
        preAuthToken: mfaData.preAuthToken,
        code: cleanCode,
      });

      setAdminRecoveryCodes(data.recoveryCodes || []);
      setVerifiedAdminUser(data.user);
    } catch (err) {
      setFormError(err.normalizedMessage || 'Invalid authenticator code. Please confirm time synchronization on your device.');
    } finally {
      setMfaSubmitting(false);
    }
  };

  // Finalize Admin Login after saving recovery codes
  const handleFinalizeAdminLogin = () => {
    if (verifiedAdminUser) {
      handleAuthSuccess(verifiedAdminUser);
    }
  };

  // Cancel MFA and return to credentials
  const handleCancelMfa = () => {
    setViewMode('credentials');
    setMfaData(null);
    setMfaCode('');
    setIsRecoveryCode(false);
    setFormError(null);
    setAdminSetup(null);
    setAdminConfirmCode('');
    setAdminRecoveryCodes([]);
    setVerifiedAdminUser(null);
  };

  // Copy secret key helper
  const handleCopySecret = () => {
    if (adminSetup?.secret) {
      navigator.clipboard.writeText(adminSetup.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // Copy recovery codes helper
  const handleCopyRecoveryCodes = () => {
    if (adminRecoveryCodes.length > 0) {
      navigator.clipboard.writeText(adminRecoveryCodes.join('\n'));
      setCopiedRecoveryCodes(true);
      setTimeout(() => setCopiedRecoveryCodes(false), 2000);
    }
  };

  // Download recovery codes helper
  const handleDownloadRecoveryCodes = () => {
    if (adminRecoveryCodes.length > 0) {
      const text = `LearnSpace LMS — Administrator Backup Recovery Codes\nGenerated: ${new Date().toISOString()}\n\nStore these codes in an offline, secure location:\n\n${adminRecoveryCodes.join('\n')}\n\nEach code can only be used once to access the Administrator Portal if your authenticator device is lost.`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learnspace-admin-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Dynamic layout texts based on viewMode
  let eyebrow = isAdminRole ? 'ADMINISTRATIVE PORTAL' : 'WELCOME BACK';
  let headline = isAdminRole ? 'Platform Governance & Console' : 'Your next breakthrough starts here.';
  let description = isAdminRole
    ? 'Sign in with verified administrator credentials to access platform governance, manage curriculum review queues, and oversee user roles.'
    : 'Return to your courses, continue building practical skills, and keep your learning journey moving forward.';
  let formTitle = isAdminRole ? 'Administrator Sign In' : 'Welcome back';
  let formSubtitle = isAdminRole
    ? 'Sign in with your administrative credentials to access the LearnSpace platform console.'
    : 'Sign in to your LearnSpace account to resume your courses and track your progress.';

  if (viewMode === 'mfa_challenge') {
    eyebrow = 'TWO-FACTOR VERIFICATION';
    formTitle = 'Two-Factor Authentication';
    formSubtitle = isRecoveryCode
      ? 'Enter a one-time emergency backup recovery code to access your account.'
      : mfaData?.method === 'email_otp'
        ? `Enter the 6-digit verification code sent to ${email}.`
        : 'Enter the 6-digit code from Google Authenticator or your TOTP app.';
  } else if (viewMode === 'admin_mfa_setup') {
    eyebrow = 'MANDATORY SECURITY ENROLLMENT';
    formTitle = adminRecoveryCodes.length > 0 ? 'Save Recovery Codes' : 'Configure Google Authenticator';
    formSubtitle = adminRecoveryCodes.length > 0
      ? 'Store your backup recovery codes securely before proceeding to the console.'
      : 'Two-Factor Authentication is mandatory for all administrator accounts on LearnSpace.';
  }

  return (
    <AuthLayout
      eyebrow={eyebrow}
      headline={headline}
      description={description}
      highlights={isAdminRole ? adminHighlights : loginHighlights}
      quote={
        isAdminRole
          ? 'Secure platform stewardship with accountability and precision.'
          : 'Learn with purpose. Progress with confidence.'
      }
      panelBadge={isAdminRole ? 'Admin Portal' : 'Sign In'}
      formTitle={formTitle}
      formSubtitle={formSubtitle}
    >
      {formError && (
        <div
          className="mb-5 p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-[modalFadeIn_180ms_ease-out]"
          role="alert"
        >
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">
            <span>{formError}</span>
            {viewMode === 'credentials' && !isAdminRole && formError.toLowerCase().includes('administrator') && (
              <div className="mt-2">
                <Link
                  to="/admin/login"
                  className="font-bold text-cobalt hover:underline inline-flex items-center gap-1"
                >
                  <span>Go to Administrator Sign In Portal</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. CREDENTIALS VIEW */}
      {viewMode === 'credentials' && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Field */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-primary mb-1.5"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={submitting || googleSubmitting}
              className="w-full h-11 sm:h-12 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 disabled:opacity-60 placeholder:text-tertiary"
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-primary"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-cobalt hover:text-cobalt-hover hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting || googleSubmitting}
                className="w-full h-11 sm:h-12 pl-3.5 pr-11 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 disabled:opacity-60 placeholder:text-tertiary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary p-1.5 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || googleSubmitting}
            className="mt-2 w-full h-11 sm:h-12 px-4 rounded-xl bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isAdminRole ? 'Authenticating Admin...' : 'Signing in...'}</span>
              </>
            ) : (
              <>
                {isAdminRole && <ShieldCheck size={16} aria-hidden="true" />}
                <span>{isAdminRole ? 'Sign In as Administrator' : 'Sign In'}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </>
            )}
          </button>

          {!isAdminRole ? (
            <>
              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-divider w-full" />
                <span className="bg-surface px-3 text-xs uppercase tracking-wider text-tertiary font-medium absolute">
                  or
                </span>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting || googleSubmitting}
                aria-label="Continue with Google"
                className="w-full h-11 sm:h-12 px-4 rounded-xl border border-border-subtle bg-surface text-sm font-semibold text-primary hover:bg-surface-subtle hover:border-border-medium active:bg-surface transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
              >
                {googleSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-cobalt/30 border-t-cobalt rounded-full animate-spin" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Switch to Register */}
              <div className="text-center pt-3 border-t border-divider text-xs text-secondary">
                Don't have an account yet?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-cobalt hover:text-cobalt-hover hover:underline"
                >
                  Create an account
                </Link>
              </div>

              {/* Administrative Gateway Link */}
              <div className="text-center pt-2 text-[11px] text-tertiary">
                Platform administrator?{' '}
                <Link
                  to="/admin/login"
                  className="font-medium text-secondary hover:text-cobalt hover:underline transition-colors inline-flex items-center gap-1 group"
                >
                  <ShieldCheck size={12} className="text-cobalt group-hover:scale-110 transition-transform" aria-hidden="true" />
                  <span>Admin Sign In</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="pt-4 border-t border-divider space-y-3">
              <p className="text-center text-[11px] text-secondary leading-normal">
                Protected administrative environment. All authentication attempts are logged for security compliance.
              </p>
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cobalt hover:text-cobalt-hover hover:underline"
                >
                  <span>← Return to Student &amp; Instructor Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </form>
      )}

      {/* 2. MFA CHALLENGE VIEW */}
      {viewMode === 'mfa_challenge' && (
        <form onSubmit={handleVerifyMfaChallenge} className="space-y-4" noValidate>
          {/* Method Indicator Badge */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-secondary">
            {isRecoveryCode ? (
              <Key size={16} className="text-amber-600 shrink-0" />
            ) : mfaData?.method === 'email_otp' ? (
              <Mail size={16} className="text-cobalt shrink-0" />
            ) : (
              <Smartphone size={16} className="text-cobalt shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-semibold text-primary">
                {isRecoveryCode
                  ? 'Backup Recovery Code'
                  : mfaData?.method === 'email_otp'
                    ? 'Email Verification Code'
                    : 'Google Authenticator Code'}
              </div>
              <div className="text-[11px] text-tertiary">
                {isRecoveryCode
                  ? 'Enter one of your 10-character backup recovery codes'
                  : mfaData?.method === 'email_otp'
                    ? `Dispatched to ${email}`
                    : 'Open your authenticator app to view your current code'}
              </div>
            </div>
          </div>

          {/* Verification Code Input */}
          <div>
            <label htmlFor="mfa-challenge-code" className="block text-xs font-semibold text-primary mb-1.5">
              {isRecoveryCode ? 'Emergency Recovery Code' : '6-Digit Verification Code'}
            </label>
            <input
              id="mfa-challenge-code"
              type="text"
              autoFocus
              autoComplete="one-time-code"
              required
              value={mfaCode}
              onChange={(e) => {
                if (isRecoveryCode) {
                  setMfaCode(e.target.value.toUpperCase().slice(0, 15));
                } else {
                  setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              placeholder={isRecoveryCode ? 'XXXXX-XXXXX' : '000000'}
              disabled={mfaSubmitting}
              className={`w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-subtle text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 text-center font-mono tracking-widest text-lg font-bold placeholder:text-tertiary/50`}
            />
          </div>

          {/* Resend option for Email OTP */}
          {!isRecoveryCode && mfaData?.method === 'email_otp' && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-secondary">Didn't receive code?</span>
              <button
                type="button"
                onClick={handleResendEmailOtp}
                disabled={resendCooldown > 0 || resending}
                className="font-semibold text-cobalt hover:underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 cursor-pointer"
              >
                {resending ? (
                  <span>Sending...</span>
                ) : resendCooldown > 0 ? (
                  <span>Resend in {resendCooldown}s</span>
                ) : (
                  <>
                    <RotateCcw size={12} />
                    <span>Resend email code</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Toggle Recovery Code mode */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRecoveryCode(!isRecoveryCode);
                setMfaCode('');
                setFormError(null);
              }}
              className="text-xs text-cobalt hover:underline cursor-pointer font-medium"
            >
              {isRecoveryCode
                ? mfaData?.method === 'email_otp'
                  ? '← Enter email verification code instead'
                  : '← Enter authenticator app code instead'
                : 'Lost access to your device? Use a backup recovery code'}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={mfaSubmitting || (!isRecoveryCode && mfaCode.length < 6)}
            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mfaSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Verify &amp; Continue</span>
              </>
            )}
          </button>

          {/* Cancel button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleCancelMfa}
              className="text-xs text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Cancel and return to sign in</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. ADMIN MANDATORY SETUP VIEW */}
      {viewMode === 'admin_mfa_setup' && (
        <div className="space-y-4">
          {adminRecoveryCodes.length === 0 ? (
            /* Setup Step 1: Scan QR Code & Enter First Code */
            <form onSubmit={handleConfirmAdminSetup} className="space-y-4" noValidate>
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <strong>First-time Administrator Enrollment:</strong> Two-Factor Authentication is required to secure platform stewardship. Configure your authenticator app below.
              </div>

              {/* QR Code */}
              {adminSetup?.qrCode && (
                <div className="flex flex-col items-center justify-center p-4 bg-white border border-border-subtle rounded-xl shadow-2xs">
                  <img
                    src={adminSetup.qrCode}
                    alt="LearnSpace 2FA QR Code"
                    className="w-44 h-44 rounded-lg"
                  />
                  <p className="mt-2 text-[11px] text-tertiary text-center">
                    Scan with Google Authenticator, Authy, or compatible app
                  </p>
                </div>
              )}

              {/* Manual Entry Key */}
              {adminSetup?.secret && (
                <div className="p-3 bg-surface-subtle border border-border-subtle rounded-xl">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-secondary">Manual entry key</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="text-cobalt hover:underline inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                    >
                      {copiedSecret ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                      <span>{copiedSecret ? 'Copied' : 'Copy key'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-primary font-bold tracking-wider break-all select-all">
                    {adminSetup.secret}
                  </div>
                </div>
              )}

              {/* 6-Digit Code Input */}
              <div>
                <label htmlFor="admin-setup-code" className="block text-xs font-semibold text-primary mb-1.5">
                  Confirm 6-Digit Code from App
                </label>
                <input
                  id="admin-setup-code"
                  type="text"
                  autoFocus
                  required
                  value={adminConfirmCode}
                  onChange={(e) => setAdminConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={mfaSubmitting}
                  className="w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-subtle text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 text-center font-mono tracking-widest text-lg font-bold placeholder:text-tertiary/50"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={mfaSubmitting || adminConfirmCode.length < 6}
                className="w-full h-11 sm:h-12 px-4 rounded-xl bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {mfaSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Activating Administrator 2FA...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Activate &amp; Verify Authenticator</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleCancelMfa}
                  className="text-xs text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          ) : (
            /* Setup Step 2: Display Backup Recovery Codes */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Google Authenticator successfully linked!</strong>
                  Save the following 8 single-use recovery codes. If you ever lose access to your device, each code can be used once to access the administrator portal.
                </div>
              </div>

              {/* Recovery Codes Grid */}
              <div className="p-4 bg-surface-subtle border border-border-subtle rounded-xl">
                <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs font-bold text-primary select-all">
                  {adminRecoveryCodes.map((c, idx) => (
                    <div key={idx} className="p-2 bg-surface border border-border-subtle rounded-lg">
                      {c}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={handleCopyRecoveryCodes}
                    className="text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copiedRecoveryCodes ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    <span>{copiedRecoveryCodes ? 'Copied to clipboard' : 'Copy all codes'}</span>
                  </button>
                  <span className="text-tertiary">•</span>
                  <button
                    type="button"
                    onClick={handleDownloadRecoveryCodes}
                    className="text-cobalt hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Download size={13} />
                    <span>Download as .txt</span>
                  </button>
                </div>
              </div>

              {/* Mandatory acknowledgement checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={adminSavedConfirmed}
                  onChange={(e) => setAdminSavedConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-cobalt focus:ring-cobalt cursor-pointer"
                />
                <span className="leading-snug">
                  I have safely recorded or downloaded these backup recovery codes in a secure, offline location.
                </span>
              </label>

              {/* Continue to Admin Dashboard */}
              <button
                type="button"
                onClick={handleFinalizeAdminLogin}
                disabled={!adminSavedConfirmed}
                className="w-full h-11 sm:h-12 px-4 rounded-xl bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>Enter Administrator Console</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
