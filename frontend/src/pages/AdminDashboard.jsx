import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  KeyRound,
  LogOut,
  AlertTriangle,
  Server,
  Activity
} from 'lucide-react';
import { authService } from '../services/api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    try {
      setPwLoading(true);
      const res = await authService.changePassword({ currentPassword, newPassword });
      setPwMessage({ type: 'success', text: res.data?.message || 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to change password'
      });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F0] text-[#171717] font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E4E1] shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#171717] text-white rounded-lg flex items-center justify-center font-bold text-sm tracking-tight">
              L
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-[#171717]">LearnSpace</span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Admin Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#171717]">{user?.name}</span>
              <span className="text-[11px] text-[#686868]">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E4E1] bg-white text-xs font-semibold text-[#686868] hover:text-[#171717] hover:bg-[#F2F2F0] transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl border border-[#E4E4E1] p-6 sm:p-8 mb-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium mb-3">
                <ShieldAlert size={13} />
                <span>Privileged System Administrator</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">
                Welcome back, {user?.name}
              </h1>
              <p className="text-sm text-[#686868] mt-1">
                Phase 2 Authorization is active. You have full administrative privileges to manage roles, users, and platform security.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <Activity size={13} />
                Cluster: Atlas Live
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                <Server size={13} />
                API v1.0.0
              </span>
            </div>
          </div>
        </div>

        {/* Admin Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-[#E4E4E1] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#686868]">Role Provisioning</span>
              <Users size={16} className="text-[#637D91]" />
            </div>
            <div className="text-2xl font-bold text-[#171717]">Security Enforced</div>
            <p className="text-xs text-[#686868] mt-1">
              Public registration limited to Student & Pending Instructor.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E4E4E1] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#686868]">Instructor Requests</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-[#171717]">Approval Workflow</div>
            <p className="text-xs text-[#686868] mt-1">
              Instructors require admin status promotion before course publishing.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E4E4E1] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#686868]">Session Security</span>
              <CheckCircle2 size={16} className="text-[#A8B5A0]" />
            </div>
            <div className="text-2xl font-bold text-[#171717]">HttpOnly JWT</div>
            <p className="text-xs text-[#686868] mt-1">
              Strict cookie policies with anti-CSRF and credential validation.
            </p>
          </div>
        </div>

        {/* Two-Column Section: System Info & Security */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Admin Role Policy Guidelines */}
          <div className="bg-white rounded-2xl border border-[#E4E4E1] p-6 shadow-xs">
            <h2 className="text-lg font-bold text-[#171717] mb-2 flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-600" />
              Administrative Security Policy
            </h2>
            <p className="text-xs text-[#686868] mb-4">
              LearnSpace adheres to the Principle of Least Privilege across all tiers.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-[#E4E4E1] bg-[#F2F2F0]/60 text-xs">
                <span className="font-bold text-[#171717] block mb-0.5">Admin Provisioning CLI</span>
                <p className="text-[#686868]">
                  Admins must be provisioned through the offline idempotent CLI tool: <code className="bg-white px-1.5 py-0.5 rounded text-[#171717] border border-[#E4E4E1]">npm run provision:admin</code>. Public creation is rejected by backend middleware.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E4E4E1] bg-[#F2F2F0]/60 text-xs">
                <span className="font-bold text-[#171717] block mb-0.5">Role Escalation Guard</span>
                <p className="text-[#686868]">
                  Client requests containing unauthorized role mutations are sanitized on the server before saving to MongoDB Atlas.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E4E4E1] bg-[#F2F2F0]/60 text-xs">
                <span className="font-bold text-[#171717] block mb-0.5">Sensitive Rate Limiting</span>
                <p className="text-[#686868]">
                  Brute-force protection limits failed login attempts to 20/15min, and password reset dispatches to 5/15min per IP.
                </p>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="bg-white rounded-2xl border border-[#E4E4E1] p-6 shadow-xs">
            <h2 className="text-lg font-bold text-[#171717] mb-2 flex items-center gap-2">
              <KeyRound size={18} className="text-[#637D91]" />
              Admin Password Management
            </h2>
            <p className="text-xs text-[#686868] mb-4">
              Update your administrative credentials. Minimum 8 characters with at least one letter and one number.
            </p>

            {pwMessage.text && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 ${
                  pwMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {pwMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{pwMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E4E4E1] rounded-xl focus:outline-2 focus:outline-[#171717]"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  New Admin Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E4E4E1] rounded-xl focus:outline-2 focus:outline-[#171717]"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Confirm New Admin Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E4E4E1] rounded-xl focus:outline-2 focus:outline-[#171717]"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#171717] text-white text-xs font-semibold hover:bg-[#2b2b2b] transition-all disabled:opacity-50 cursor-pointer"
              >
                {pwLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
