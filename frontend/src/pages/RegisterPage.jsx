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
        // Active student session: navigate to dashboard
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err) {
      setFormError(err.normalizedMessage || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="w-12 h-12 bg-[#EDF0E9] text-[#5F7158] border border-[#A8B5A0]/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-base font-bold text-[#171717] mb-2">
            Verification in Progress
          </h3>
          <p className="text-xs text-[#686868] leading-relaxed mb-6">
            {pendingInstructorNotice} Once approved by our team, you will receive an invitation email to activate your instructor console.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/login"
              className="w-full h-11 px-4 rounded-xl bg-[#171717] text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all inline-flex items-center justify-center gap-1.5"
            >
              <span>Return to Sign In</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              to="/"
              className="w-full h-11 px-4 rounded-xl bg-[#F8F8F6] text-[#686868] hover:text-[#171717] border border-[#E4E4E1] text-xs font-semibold transition-all inline-flex items-center justify-center"
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
        <label className="block text-xs font-semibold text-[#171717] mb-1">
          I am joining as:
        </label>
        <div
          className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8F8F6] border border-[#E4E4E1] rounded-xl"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={role === 'student'}
            onClick={() => setRole('student')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              role === 'student'
                ? 'bg-white text-[#171717] shadow-2xs border border-[#E4E4E1]/80'
                : 'text-[#686868] hover:text-[#171717]'
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
                ? 'bg-white text-[#171717] shadow-2xs border border-[#E4E4E1]/80'
                : 'text-[#686868] hover:text-[#171717]'
            }`}
          >
            <Briefcase size={14} />
            <span>Instructor</span>
          </button>
        </div>
        {role === 'instructor' && (
          <p className="mt-1 text-[11px] text-[#4A6376] leading-tight flex items-center gap-1">
            <Sparkles size={11} className="text-[#637D91]" />
            <span>Instructor accounts require approval before publishing courses.</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Full Name */}
        <div>
          <label
            htmlFor="register-name"
            className="block text-xs font-semibold text-[#171717] mb-1"
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
            className="w-full h-10 px-3.5 rounded-xl border border-[#E4E4E1] bg-[#F8F8F6] text-sm text-[#171717] transition-all focus:outline-none focus:bg-white focus:border-[#171717] focus:ring-1 focus:ring-[#171717] disabled:opacity-60 placeholder:text-[#8A8A86]"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="register-email"
            className="block text-xs font-semibold text-[#171717] mb-1"
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
            className="w-full h-10 px-3.5 rounded-xl border border-[#E4E4E1] bg-[#F8F8F6] text-sm text-[#171717] transition-all focus:outline-none focus:bg-white focus:border-[#171717] focus:ring-1 focus:ring-[#171717] disabled:opacity-60 placeholder:text-[#8A8A86]"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="register-password"
            className="block text-xs font-semibold text-[#171717] mb-1"
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
              className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-[#E4E4E1] bg-[#F8F8F6] text-sm text-[#171717] transition-all focus:outline-none focus:bg-white focus:border-[#171717] focus:ring-1 focus:ring-[#171717] disabled:opacity-60 placeholder:text-[#8A8A86]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8A86] hover:text-[#171717] p-1 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Compact Password Validation Badges (Single Row) */}
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                hasMinLength
                  ? 'bg-[#EDF0E9] text-[#5F7158] border border-[#A8B5A0]/40'
                  : 'bg-[#F8F8F6] text-[#8A8A86] border border-[#E4E4E1]'
              }`}
            >
              <CheckCircle2 size={10} /> 8+ chars
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                hasLetter
                  ? 'bg-[#EDF0E9] text-[#5F7158] border border-[#A8B5A0]/40'
                  : 'bg-[#F8F8F6] text-[#8A8A86] border border-[#E4E4E1]'
              }`}
            >
              <CheckCircle2 size={10} /> Letters
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                hasNumber
                  ? 'bg-[#EDF0E9] text-[#5F7158] border border-[#A8B5A0]/40'
                  : 'bg-[#F8F8F6] text-[#8A8A86] border border-[#E4E4E1]'
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
            className="block text-xs font-semibold text-[#171717] mb-1"
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
              className={`w-full h-10 pl-3.5 pr-10 rounded-xl border bg-[#F8F8F6] text-sm text-[#171717] transition-all focus:outline-none focus:bg-white focus:ring-1 disabled:opacity-60 placeholder:text-[#8A8A86] ${
                confirmPassword && !passwordsMatch
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-[#E4E4E1] focus:border-[#171717] focus:ring-[#171717]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8A86] hover:text-[#171717] p-1 transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full h-11 px-4 rounded-xl bg-[#171717] text-white text-xs sm:text-sm font-semibold hover:bg-[#2b2b2b] hover:-translate-y-0.5 active:translate-y-0 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
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
        <div className="text-center pt-2.5 border-t border-[#E4E4E1] text-xs text-[#686868]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#171717] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
