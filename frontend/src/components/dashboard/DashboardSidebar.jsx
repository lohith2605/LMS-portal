import React from 'react';
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
  User,
} from 'lucide-react';

export default function DashboardSidebar({
  id = 'dashboard-sidebar',
  user: _user,
  role,
  activeTab,
  onSelectTab,
  logout,
  isCollapsed = false,
  onToggleCollapse,
  onOpenAvatarModal: _onOpenAvatarModal,
}) {
  const getNavSections = () => {
    let workspaceItems = [];
    switch (role) {
      case 'admin':
        workspaceItems = [
          { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard },
          { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
          { id: 'approvals', label: 'Instructor Approvals', icon: ShieldAlert },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'moderation', label: 'Course Moderation', icon: Library },
        ];
        break;
      case 'instructor':
        workspaceItems = [
          { id: 'overview', label: 'Teaching Overview', icon: LayoutDashboard },
          { id: 'analytics', label: 'Course Analytics', icon: BarChart3 },
          { id: 'courses', label: 'My Courses', icon: Library },
          { id: 'assignments', label: 'Assignments & Projects', icon: ClipboardList },
          { id: 'reviews', label: 'Submissions & Grading', icon: Inbox },
          { id: 'assessments', label: 'Assessments & Quizzes', icon: ListChecks },
          { id: 'learners', label: 'Enrolled Learners', icon: Users },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
        ];
        break;
      case 'student':
      default:
        workspaceItems = [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'analytics', label: 'Learning Progress', icon: BarChart3 },
          { id: 'learning', label: 'My Learning', icon: BookOpen },
          { id: 'certificates', label: 'Earned Certificates', icon: Award },
          { id: 'explore', label: 'Explore Courses', icon: Compass },
          { id: 'assignments', label: 'Assignments', icon: ClipboardList },
          { id: 'calendar', label: 'Schedule & Calendar', icon: CalendarDays },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
        ];
        break;
    }

    const settingsItems = [
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'security', label: 'Account Security', icon: ShieldCheck, badge: '2FA' },
    ];

    return { workspaceItems, settingsItems };
  };

  const { workspaceItems, settingsItems } = getNavSections();

  const roleBadges = {
    admin: 'bg-rose-100 text-rose-800 border-rose-200',
    instructor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    student: 'bg-cobalt-soft text-cobalt border-cobalt-border',
  };

  const renderExpandedNavItem = (item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id || (item.id === 'analytics' && activeTab === 'progress');
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectTab(item.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-left ${
          isActive
            ? 'bg-cobalt text-white shadow-xs shadow-cobalt/20'
            : 'text-secondary hover:text-primary hover:bg-surface-subtle'
        }`}
      >
        <div className="flex items-center gap-3 truncate">
          <Icon
            size={17}
            strokeWidth={1.75}
            aria-hidden="true"
            className={`transition-transform duration-200 group-hover:translate-x-0.5 shrink-0 ${
              isActive ? 'text-white' : 'text-secondary group-hover:text-primary'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge && (
          <span
            className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md uppercase shrink-0 transition-colors ${
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-cobalt-soft text-cobalt border border-cobalt-border/60'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const renderCollapsedNavItem = (item, isSettings = false) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id || (item.id === 'analytics' && activeTab === 'progress');
    const tooltipText = isSettings ? `${item.label} (2FA)` : item.label;

    return (
      <div key={item.id} className="relative group w-full flex justify-center">
        <button
          type="button"
          onClick={() => onSelectTab(item.id)}
          aria-label={tooltipText}
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
          {tooltipText}
          <span className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
        </span>
      </div>
    );
  };

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

        {/* Navigation Sections */}
        {!isCollapsed ? (
          <div className="p-4 flex-1 overflow-y-auto">
            {/* WORKSPACE SECTION */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-tertiary px-3 mb-2">
              Workspace
            </div>
            <nav className="space-y-1" aria-label="Workspace navigation">
              {workspaceItems.map(renderExpandedNavItem)}
            </nav>

            {/* SETTINGS SECTION */}
            <div className="pt-5 mt-5 border-t border-border-subtle">
              <div className="text-[10px] font-bold uppercase tracking-wider text-tertiary px-3 mb-2 flex items-center justify-between">
                <span>Settings</span>
              </div>
              <nav className="space-y-1" aria-label="Settings navigation">
                {settingsItems.map(renderExpandedNavItem)}
              </nav>
            </div>
          </div>
        ) : (
          <div className="py-4 px-2.5 flex-1 overflow-y-auto space-y-1 flex flex-col items-center">
            {/* Collapsed Workspace Navigation */}
            <nav className="space-y-1.5 flex flex-col items-center w-full" aria-label="Workspace navigation">
              {workspaceItems.map((item) => renderCollapsedNavItem(item, false))}
            </nav>

            {/* Divider for Settings */}
            <div className="w-8 border-t border-border-subtle my-2.5" role="separator" aria-label="Settings divider" />

            {/* Collapsed Settings Navigation */}
            <nav className="space-y-1.5 flex flex-col items-center w-full" aria-label="Settings navigation">
              {settingsItems.map((item) => renderCollapsedNavItem(item, true))}
            </nav>
          </div>
        )}
      </div>

      {/* User & Session Footer */}
      {!isCollapsed ? (
        <div className="p-4 border-t border-border-subtle bg-surface-subtle/50">
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
