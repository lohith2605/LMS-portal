import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Compass,
  Code2,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' or 'instructor'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [pendingInstructorNotice, setPendingInstructorNotice] = useState(null);
  const [registeredStudentNotice, setRegisteredStudentNotice] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Dynamic validation helper indicators
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const registerHighlights = [
    {
      icon: Compass,
      title: '1. Discover',
      desc: 'Explore curated, milestone-driven curriculums tailored to practical industry skills.'
    },
    {
      icon: Code2,
      title: '2. Learn',
      desc: 'Work through interactive tasks, mentor feedback, and collaborative project sprints.'
    },
    {
      icon: TrendingUp,
      title: '3. Grow',
      desc: 'Build a verifiable portfolio of completed work and advance your career.'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setFormError('Password must be at least 8 characters long and include both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      });

      // If registered as instructor with pending status
      if (res.user && res.user.accountStatus === 'pending') {
        setPendingInstructorNotice(
          res.message || 'Your instructor application has been submitted and is pending administrator review.'
        );
      } else {
        setRegisteredStudentNotice({
          name: res.user?.name || trimmedName,
          email: res.user?.email || trimmedEmail,
        });
      }
    } catch (err) {
      setFormError(err.normalizedMessage || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (registeredStudentNotice) {
    return (
      <AuthLayout
        eyebrow="WELCOME TO LEARNSPACE"
        headline="Account created successfully."
        description="We've sent a verification link to your email address. Verify your account to secure your credentials and unlock all course features."
        highlights={registerHighlights}
        panelBadge="Welcome"
        formTitle="Verify Your Email"
        formSubtitle="A confirmation email has been dispatched to your inbox."
      >
        <div className="py-2 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-base font-bold text-primary mb-2">
            Check your inbox, {registeredStudentNotice.name}
          </h3>
          <p className="text-xs text-secondary leading-relaxed mb-6">
            We sent a verification link to <strong className="text-primary">{registeredStudentNotice.email}</strong>. Click the link to complete verification and secure your coursework credentials.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/student/dashboard', { replace: true })}
              className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Continue to Student Workspace</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (pendingInstructorNotice) {
    return (
      <AuthLayout
        eyebrow="APPLICATION STATUS"
        headline="Thank you for your interest."
        description="LearnSpace maintains high instruction standards to guarantee practical outcomes for learners."
        highlights={registerHighlights}
        panelBadge="Instructor"
        formTitle="Application Received"
        formSubtitle="Your instructor profile is currently under administrator review."
      >
        <div className="py-2 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-base font-bold text-primary mb-2">
            Verification in Progress
          </h3>
          <p className="text-xs text-secondary leading-relaxed mb-6">
            {pendingInstructorNotice} Once approved by our team, you will receive an invitation email to activate your instructor console.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/login"
              className="w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all inline-flex items-center justify-center gap-1.5"
            >
              <span>Return to Sign In</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              to="/"
              className="w-full h-11 px-4 rounded-xl bg-surface-subtle text-secondary hover:text-primary border border-border-subtle text-xs font-semibold transition-all inline-flex items-center justify-center"
            >
              Explore Course Catalog
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="START YOUR JOURNEY"
      headline="Build skills that move you forward."
      description="Join LearnSpace to explore structured courses, practise new skills, and make measurable progress toward your goals."
      highlights={registerHighlights}
      quote="Education shaped for real-world impact."
      panelBadge="Register"
      formTitle="Create your account"
      formSubtitle="Start building practical skills with structured, milestone-driven courses."
    >
      {formError && (
        <div
          className="mb-3.5 p-3 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-[modalFadeIn_180ms_ease-out]"
          role="alert"
        >
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <span className="leading-snug">{formError}</span>
        </div>
      )}

      {/* Account Type Selector (Compact Segmented Control) */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-primary mb-1">
          I am joining as:
        </label>
        <div
          className="grid grid-cols-2 gap-1.5 p-1 bg-surface-subtle border border-border-subtle rounded-xl"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={role === 'student'}
            onClick={() => setRole('student')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              role === 'student'
                ? 'bg-surface text-cobalt shadow-2xs border border-cobalt-border/60'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <GraduationCap size={14} />
            <span>Student</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'instructor'}
            onClick={() => setRole('instructor')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              role === 'instructor'
                ? 'bg-surface text-cobalt shadow-2xs border border-cobalt-border/60'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <Briefcase size={14} />
            <span>Instructor</span>
          </button>
        </div>
        {role === 'instructor' && (
          <p className="mt-1 text-[11px] text-cobalt leading-tight flex items-center gap-1">
            <Sparkles size={11} className="text-cobalt" />
            <span>Instructor accounts require approval before publishing courses.</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Full Name */}
        <div>
          <label
            htmlFor="register-name"
            className="block text-xs font-semibold text-primary mb-1"
          >
            Full Name
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            disabled={submitting}
            className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 disabled:opacity-60 placeholder:text-tertiary"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="register-email"
            className="block text-xs font-semibold text-primary mb-1"
          >
            Email Address
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
            disabled={submitting}
            className="w-full h-10 px-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 disabled:opacity-60 placeholder:text-tertiary"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="register-password"
            className="block text-xs font-semibold text-primary mb-1"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              disabled={submitting}
              className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 disabled:opacity-60 placeholder:text-tertiary"
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

          {/* Compact Password Validation Badges (Single Row) */}
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
            htmlFor="register-confirm-password"
            className="block text-xs font-semibold text-primary mb-1"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type password"
              disabled={submitting}
              className={`w-full h-10 pl-3.5 pr-10 rounded-xl border bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:ring-2 disabled:opacity-60 placeholder:text-tertiary ${
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full h-11 px-4 rounded-xl bg-cobalt text-white text-xs sm:text-sm font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>{role === 'instructor' ? 'Apply as Instructor' : 'Create Student Account'}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )}
        </button>

        {/* Switch to Login */}
        <div className="text-center pt-2.5 border-t border-divider text-xs text-secondary">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-cobalt hover:text-cobalt-hover hover:underline"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
