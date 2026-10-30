import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo, { LearnSpaceLogoIcon } from '../ui/BrandLogo';
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
  ChevronLeft,
} from 'lucide-react';

export default function DashboardSidebar({
  id = 'dashboard-sidebar',
  user,
  role,
  activeTab,
  onSelectTab,
  logout,
  isCollapsed = false,
  onToggleCollapse,
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
    instructor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    student: 'bg-cobalt-soft text-cobalt border-cobalt-border',
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
    <aside
      id={id}
      aria-label="Sidebar navigation"
      className={`bg-surface border-r border-border-subtle flex flex-col justify-between shrink-0 h-screen sticky top-0 hidden lg:flex transition-[width] duration-300 ease-in-out z-20 overflow-visible ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        {!isCollapsed ? (
          <div className="h-16 px-6 border-b border-border-subtle flex items-center justify-between">
            <BrandLogo
              to="/"
              size="sm"
              subtitle="Learning Platform"
              ariaLabel="LearnSpace Learning Platform"
            />

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  roleBadges[role] || roleBadges.student
                }`}
              >
                {role}
              </span>

              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-16 px-2 border-b border-border-subtle flex items-center justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="w-10 h-10 rounded-xl bg-cobalt text-white border border-cobalt-border/30 shadow-xs flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
            >
              <LearnSpaceLogoIcon className="w-5 h-5" animate />
            </button>
          </div>
        )}

        {/* Navigation Section */}
        {!isCollapsed ? (
          <div className="p-4 flex-1 overflow-y-auto">
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
                        ? 'bg-cobalt text-white shadow-xs shadow-cobalt/20'
                        : 'text-secondary hover:text-primary hover:bg-surface-subtle'
                    }`}
                  >
                    <Icon
                      size={17}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className={`transition-transform duration-200 group-hover:translate-x-0.5 shrink-0 ${
                        isActive ? 'text-white' : 'text-secondary group-hover:text-primary'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ) : (
          <div className="py-4 px-2.5 flex-1 overflow-y-auto space-y-1">
            <nav className="space-y-1.5 flex flex-col items-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <div key={item.id} className="relative group w-full flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.id === 'security') {
                          onOpenPasswordModal();
                        } else {
                          onSelectTab(item.id);
                        }
                      }}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-cobalt text-white shadow-xs shadow-cobalt/20 scale-105'
                          : 'text-secondary hover:text-primary hover:bg-surface-subtle'
                      }`}
                    >
                      <Icon
                        size={19}
                        strokeWidth={isActive ? 2 : 1.75}
                        aria-hidden="true"
                        className={`transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-secondary group-hover:text-primary'
                        }`}
                      />
                    </button>

                    {/* Floating Tooltip */}
                    <span
                      role="tooltip"
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-primary text-white text-[11px] font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-md shadow-black/10 z-50 border border-white/10"
                    >
                      {item.label}
                      <span className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                    </span>
                  </div>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User & Session Footer */}
      {!isCollapsed ? (
        <div className="p-4 border-t border-border-subtle bg-surface-subtle/50">
          <div className="p-3 bg-surface border border-border-subtle rounded-2xl shadow-xs mb-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenAvatarModal}
                title="Click to edit profile picture"
                aria-label="Click to edit profile picture"
                className="w-8 h-8 rounded-lg bg-cobalt text-white flex items-center justify-center text-xs font-bold overflow-hidden ring-1 ring-border-subtle hover:ring-2 hover:ring-focus-ring/50 transition-all cursor-pointer shrink-0"
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
      ) : (
        <div className="p-3 border-t border-border-subtle bg-surface-subtle/50 flex flex-col items-center gap-2.5">
          {/* User Avatar with Tooltip */}
          <div className="relative group">
            <button
              type="button"
              onClick={onOpenAvatarModal}
              aria-label="Edit Profile Picture"
              className="w-10 h-10 rounded-xl bg-cobalt text-white flex items-center justify-center text-xs font-bold overflow-hidden ring-1 ring-border-subtle hover:ring-2 hover:ring-focus-ring/50 transition-all cursor-pointer shrink-0 shadow-xs"
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
            <span
              role="tooltip"
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-primary text-white text-[11px] font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-md shadow-black/10 z-50 border border-white/10"
            >
              {user?.name || 'Profile'}
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
            </span>
          </div>

          {/* Sign Out with Tooltip */}
          <div className="relative group">
            <button
              type="button"
              onClick={logout}
              aria-label="Sign Out"
              className="w-10 h-10 rounded-xl border border-border-subtle bg-surface flex items-center justify-center text-secondary hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all cursor-pointer"
            >
              <LogOut size={15} />
            </button>
            <span
              role="tooltip"
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-primary text-white text-[11px] font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-md shadow-black/10 z-50 border border-white/10"
            >
              Sign Out
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
