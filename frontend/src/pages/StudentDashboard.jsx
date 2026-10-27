import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LogOut, Key, CheckCircle2, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { authService } from '../services/api';

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await authService.changePassword({ currentPassword, newPassword });
      setStatusMessage(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setErrorMessage(err.normalizedMessage || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-primary font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline text-primary font-bold text-lg tracking-tight">
            <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-[15px] font-extrabold tracking-tighter">
              L
            </div>
            <span>LearnSpace</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-[7px] py-[2px] rounded-full bg-accent-blue-pale text-accent-blue-dark">
              Student
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/#courses"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors py-2 px-3"
            >
              <BookOpen size={14} />
              <span>Browse Catalog</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-surface-subtle text-secondary hover:text-primary border border-border-subtle transition-all cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Welcome Banner */}
        <div className="bg-white border border-border-subtle rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 shadow-card mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-sage-dark mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-sage-dark" />
                <span>Student Learner Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-xs sm:text-sm text-secondary mt-1">
                Account: <span className="font-medium text-primary">{user?.email}</span> • Status: <span className="font-semibold text-accent-sage-dark uppercase text-[11px]">{user?.accountStatus}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                Verified Session
              </span>
            </div>
          </div>

          <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-subtle rounded-xl border border-border-subtle">
              <div className="text-xs font-bold uppercase text-secondary mb-1">Enrolled Courses</div>
              <div className="text-xl font-extrabold text-primary">1 Active</div>
              <div className="text-[11px] text-tertiary mt-1">Design Systems from Figma to Code</div>
            </div>
            <div className="p-4 bg-surface-subtle rounded-xl border border-border-subtle">
              <div className="text-xs font-bold uppercase text-secondary mb-1">Overall Progress</div>
              <div className="text-xl font-extrabold text-primary">70% Completed</div>
              <div className="text-[11px] text-tertiary mt-1">14 of 20 lessons validated</div>
            </div>
            <div className="p-4 bg-surface-subtle rounded-xl border border-border-subtle">
              <div className="text-xs font-bold uppercase text-secondary mb-1">Assigned Role</div>
              <div className="text-xl font-extrabold text-primary capitalize">{user?.role}</div>
              <div className="text-[11px] text-tertiary mt-1">Standard learner permissions</div>
            </div>
          </div>
        </div>

        {/* Account Security & Password Change */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-card">
            <div className="flex items-center gap-2.5 mb-2">
              <Key size={18} className="text-accent-blue-dark" />
              <h2 className="text-lg font-bold text-primary">Account Security</h2>
            </div>
            <p className="text-xs text-secondary leading-relaxed mb-6">
              Update your account password. This will update your credentials and refresh your authenticated browser session.
            </p>

            {statusMessage && (
              <div className="mb-4 p-3 bg-accent-sage-pale border border-[#A8B5A0]/40 rounded-xl flex items-center gap-2 text-xs text-accent-sage-dark">
                <CheckCircle2 size={15} />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto self-start mt-2 py-2.5 px-5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-accent-sage-dark" />
                <h3 className="text-base font-bold text-primary">Session & Role Authorization</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed mb-4">
                Your account is authenticated via HttpOnly secure session cookies. Role-based guards ensure students only access learner routes, preventing unauthorized privilege escalation.
              </p>
              <ul className="text-xs text-secondary space-y-2 list-disc list-inside">
                <li>Authenticated access to student materials and courses</li>
                <li>Restricted from accessing instructor or administrator endpoints</li>
                <li>Protected against cross-site script access to token credentials</li>
              </ul>
            </div>

            <div className="pt-6 border-t border-border-subtle flex items-center justify-between">
              <Link
                to="/"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Return to Landing Page</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
