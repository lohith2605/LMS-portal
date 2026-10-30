import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Compass,
  Target,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';

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
  const isAdminRole = searchParams.get('role') === 'admin';

  const [email, setEmail] = useState(() => (isAdminRole ? 'admin@learnspace.io' : ''));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Return to intended page if safe, otherwise role-appropriate dashboard
  const destination = location.state?.from?.pathname || '/dashboard';

  const loginHighlights = [
    {
      icon: Compass,
      title: 'Structured learning paths',
      desc: 'Milestone-based curriculums built for practical, step-by-step skill mastery.'
    },
    {
      icon: Target,
      title: 'Progress you can understand',
      desc: 'Clear task checkpoints and competency tracking without vague percentages.'
    },
    {
      icon: Layers,
      title: 'Skills built through practice',
      desc: 'Hands-on projects and guided exercises verified by expert mentors.'
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

    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      const data = await login({ email: trimmedEmail, password });

      // Navigate based on assigned role if no specific path was requested
      if (destination === '/dashboard' && data?.user?.role) {
        if (data.user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (data.user.role === 'instructor') {
          navigate('/instructor/dashboard', { replace: true });
        } else {
          navigate('/student/dashboard', { replace: true });
        }
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setFormError(err.normalizedMessage || 'Invalid email address or password.');
    } finally {
      setSubmitting(false);
    }
  };

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

      // Navigate based on assigned role if no specific path was requested
      if (destination === '/dashboard' && data?.user?.role) {
        if (data.user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (data.user.role === 'instructor') {
          navigate('/instructor/dashboard', { replace: true });
        } else {
          navigate('/student/dashboard', { replace: true });
        }
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User intentionally closed or cancelled popup - ignore cleanly
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setFormError(
          'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
        );
        return;
      }
      if (err.code === 'auth/network-request-failed') {
        setFormError(
          'Network connection issue during Google sign-in. Please check your internet connection.'
        );
        return;
      }
      setFormError(err.normalizedMessage || err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      headline="Your next breakthrough starts here."
      description="Return to your courses, continue building practical skills, and keep your learning journey moving forward."
      highlights={loginHighlights}
      quote="Learn with purpose. Progress with confidence."
      panelBadge={isAdminRole ? 'Admin Portal' : 'Sign In'}
      formTitle={isAdminRole ? 'Administrator Sign In' : 'Welcome back'}
      formSubtitle={
        isAdminRole
          ? 'Sign in with your administrative credentials to access the LearnSpace platform console.'
          : 'Sign in to your LearnSpace account to resume your courses and track your progress.'
      }
    >
      {isAdminRole && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 animate-[modalFadeIn_180ms_ease-out]">
          <ShieldCheck size={16} className="text-rose-600 shrink-0" />
          <span>Administrator Access Portal. Sign in with administrative credentials.</span>
        </div>
      )}

      {formError && (
        <div
          className="mb-5 p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-[modalFadeIn_180ms_ease-out]"
          role="alert"
        >
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <span className="leading-snug">{formError}</span>
        </div>
      )}

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
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={15} aria-hidden="true" />
            </>
          )}
        </button>

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
      </form>
    </AuthLayout>
  );
}
