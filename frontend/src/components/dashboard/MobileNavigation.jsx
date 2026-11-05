import React, { useEffect } from 'react';
import BrandLogo from '../ui/BrandLogo';
import {
  X,
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
  User,
} from 'lucide-react';

export default function MobileNavigation({
  isOpen,
  onClose,
  user: _user,
  role,
  activeTab,
  onSelectTab,
  logout,
  onOpenAvatarModal: _onOpenAvatarModal,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
          { id: 'announcements', label: 'Platform Announcements', icon: Megaphone },
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

  const handleSelect = (id) => {
    onSelectTab(id);
    onClose();
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id || (item.id === 'analytics' && activeTab === 'progress');
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelect(item.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
          isActive
            ? 'bg-cobalt text-white shadow-xs shadow-cobalt/20'
            : 'text-secondary hover:text-primary hover:bg-surface-subtle'
        }`}
      >
        <div className="flex items-center gap-3 truncate">
          <Icon
            size={16}
            className={`shrink-0 ${isActive ? 'text-white' : 'text-secondary'}`}
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-nav-title"
      id="mobile-nav-dialog"
      className="fixed inset-0 z-50 lg:hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] sm:max-w-xs bg-surface border-r border-border-subtle shadow-elevated flex flex-col justify-between z-10 animate-[modalSlideUp_0.15s_ease-out]">
        <div className="overflow-y-auto flex-1">
          {/* Header */}
          <div className="h-16 px-5 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-surface z-10">
            <BrandLogo
              to="/"
              onClick={onClose}
              size="sm"
              ariaLabel="LearnSpace Home"
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="w-8 h-8 rounded-full border border-border-subtle bg-surface-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Sections */}
          <div className="p-4 space-y-5">
            {/* WORKSPACE SECTION */}
            <div>
              <span id="mobile-nav-title" className="text-[10px] font-bold uppercase tracking-wider text-tertiary px-3 mb-2 block">
                Workspace
              </span>
              <nav className="space-y-1" aria-label="Mobile workspace navigation">
                {workspaceItems.map(renderNavItem)}
              </nav>
            </div>

            {/* SETTINGS SECTION */}
            <div className="pt-4 border-t border-border-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary px-3 mb-2 block">
                Settings
              </span>
              <nav className="space-y-1" aria-label="Mobile settings navigation">
                {settingsItems.map(renderNavItem)}
              </nav>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-surface-subtle/60 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border-subtle bg-surface text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
