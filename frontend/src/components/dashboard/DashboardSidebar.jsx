import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../ui/BrandLogo';
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  ClipboardList,
  CalendarDays,
  Megaphone,
  ShieldCheck,
  Users,
  Award,
  BarChart3,
  Library,
  Inbox,
  ListChecks,
  ShieldAlert,
  LogOut,
} from 'lucide-react';

export default function DashboardSidebar({
  user,
  role,
  activeTab,
  onSelectTab,
  logout,
  onOpenPasswordModal,
  onOpenAvatarModal,
}) {
  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return [
          { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard },
          { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
          { id: 'approvals', label: 'Instructor Approvals', icon: ShieldAlert },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'moderation', label: 'Course Moderation', icon: Library },
          { id: 'security', label: 'Admin Security', icon: ShieldCheck },
        ];
      case 'instructor':
        return [
          { id: 'overview', label: 'Teaching Overview', icon: LayoutDashboard },
          { id: 'analytics', label: 'Course Analytics', icon: BarChart3 },
          { id: 'courses', label: 'My Courses', icon: Library },
          { id: 'assignments', label: 'Assignments & Projects', icon: ClipboardList },
          { id: 'reviews', label: 'Submissions & Grading', icon: Inbox },
          { id: 'assessments', label: 'Assessments & Quizzes', icon: ListChecks },
          { id: 'learners', label: 'Enrolled Learners', icon: Users },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'security', label: 'Account Security', icon: ShieldCheck },
        ];
      case 'student':
      default:
        return [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'analytics', label: 'Learning Analytics', icon: BarChart3 },
          { id: 'learning', label: 'My Learning', icon: BookOpen },
          { id: 'certificates', label: 'Earned Certificates', icon: Award },
          { id: 'explore', label: 'Explore Courses', icon: Compass },
          { id: 'assignments', label: 'Assignments', icon: ClipboardList },
          { id: 'calendar', label: 'Schedule & Calendar', icon: CalendarDays },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'security', label: 'Account Security', icon: ShieldCheck },
        ];
    }
  };

  const navItems = getNavItems();

  const roleBadges = {
    admin: 'bg-rose-100 text-rose-800 border-rose-200',
    instructor: 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0]/40',
    student: 'bg-accent-blue-pale text-accent-blue-dark border-[#637D91]/30',
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <aside className="w-64 bg-surface border-r border-border-subtle flex flex-col justify-between shrink-0 h-screen sticky top-0 hidden lg:flex">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 border-b border-border-subtle flex items-center justify-between">
          <BrandLogo
            to="/"
            size="sm"
            subtitle="Learning Platform"
            ariaLabel="LearnSpace Learning Platform"
          />

          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              roleBadges[role] || roleBadges.student
            }`}
          >
            {role}
          </span>
        </div>

        {/* Navigation Section */}
        <div className="p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-tertiary px-3 mb-2">
            Workspace Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'security') {
                      onOpenPasswordModal();
                    } else {
                      onSelectTab(item.id);
                    }
                  }}
                  className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-left ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-secondary hover:text-primary hover:bg-surface-subtle'
                  }`}
                >
                  <Icon
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={`transition-transform duration-200 group-hover:translate-x-0.5 ${
                      isActive ? 'text-white' : 'text-secondary group-hover:text-primary'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User & Session Footer */}
      <div className="p-4 border-t border-border-subtle bg-surface-subtle/50">
        <div className="p-3 bg-surface border border-border-subtle rounded-2xl shadow-xs mb-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenAvatarModal}
              title="Click to edit profile picture"
              className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold overflow-hidden ring-1 ring-border-subtle hover:ring-2 hover:ring-accent transition-all cursor-pointer shrink-0"
            >
              {user?.avatar?.url ? (
                <img
                  src={user.avatar.url}
                  alt={user?.name || 'User avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </button>
            <div className="overflow-hidden flex-1">
              <span className="text-xs font-bold text-primary block truncate">
                {user?.name}
              </span>
              <span className="text-[10px] text-secondary block truncate">
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border-subtle bg-surface text-xs font-semibold text-secondary hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all cursor-pointer"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
