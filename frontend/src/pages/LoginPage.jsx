import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Compass,
  Target,
  Layers
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      headline="Your next breakthrough starts here."
      description="Return to your courses, continue building practical skills, and keep your learning journey moving forward."
      highlights={loginHighlights}
      quote="Learn with purpose. Progress with confidence."
      panelBadge="Sign In"
      formTitle="Welcome back"
      formSubtitle="Sign in to your LearnSpace account to resume your courses and track your progress."
    >
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
            className="block text-xs font-semibold text-[#171717] mb-1.5"
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
            disabled={submitting}
            className="w-full h-11 sm:h-12 px-3.5 rounded-xl border border-[#E4E4E1] bg-[#F8F8F6] text-sm text-[#171717] transition-all focus:outline-none focus:bg-white focus:border-[#171717] focus:ring-1 focus:ring-[#171717] disabled:opacity-60 placeholder:text-[#8A8A86]"
          />
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-[#171717]"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-[#4A6376] hover:text-[#171717] hover:underline transition-colors"
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
              disabled={submitting}
              className="w-full h-11 sm:h-12 pl-3.5 pr-11 rounded-xl border border-[#E4E4E1] bg-[#F8F8F6] text-sm text-[#171717] transition-all focus:outline-none focus:bg-white focus:border-[#171717] focus:ring-1 focus:ring-[#171717] disabled:opacity-60 placeholder:text-[#8A8A86]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A86] hover:text-[#171717] p-1.5 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full h-11 sm:h-12 px-4 rounded-xl bg-[#171717] text-white text-sm font-semibold hover:bg-[#2b2b2b] hover:-translate-y-0.5 active:translate-y-0 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
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

        {/* Switch to Register */}
        <div className="text-center pt-3 border-t border-[#E4E4E1] text-xs text-[#686868]">
          Don't have an account yet?{' '}
          <Link
            to="/register"
            className="font-semibold text-[#171717] hover:underline"
          >
            Create an account
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
