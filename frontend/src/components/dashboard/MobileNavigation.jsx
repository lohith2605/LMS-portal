import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  BookOpen,
  Compass,
  FileText,
  Calendar,
  Bell,
  KeyRound,
  Users,
  GraduationCap,
  CheckCircle2,
  Activity,
  LogOut,
  FolderLock,
  Award,
  FileCheck,
} from 'lucide-react';

export default function MobileNavigation({
  isOpen,
  onClose,
  user,
  role,
  activeTab,
  onSelectTab,
  logout,
  onOpenPasswordModal,
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

  if (!isOpen) return null;

  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return [
          { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard },
          { id: 'approvals', label: 'Instructor Approvals', icon: CheckCircle2 },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'moderation', label: 'Course Moderation', icon: FolderLock },
          { id: 'health', label: 'System Health', icon: Activity },
          { id: 'security', label: 'Admin Security', icon: KeyRound },
        ];
      case 'instructor':
        return [
          { id: 'overview', label: 'Teaching Overview', icon: LayoutDashboard },
          { id: 'courses', label: 'My Courses', icon: BookOpen },
          { id: 'assignments', label: 'Assignments & Projects', icon: FileCheck },
          { id: 'reviews', label: 'Submissions & Grading', icon: FileText },
          { id: 'assessments', label: 'Assessments & Quizzes', icon: Award },
          { id: 'learners', label: 'Enrolled Learners', icon: GraduationCap },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'security', label: 'Account Security', icon: KeyRound },
        ];
      case 'student':
      default:
        return [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'learning', label: 'My Learning', icon: BookOpen },
          { id: 'certificates', label: 'Earned Certificates', icon: Award },
          { id: 'explore', label: 'Explore Courses', icon: Compass },
          { id: 'assignments', label: 'Assignments', icon: FileText },
          { id: 'calendar', label: 'Schedule & Calendar', icon: Calendar },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'security', label: 'Account Security', icon: KeyRound },
        ];
    }
  };

  const navItems = getNavItems();

  const handleSelect = (id) => {
    if (id === 'security') {
      onOpenPasswordModal();
    } else {
      onSelectTab(id);
    }
    onClose();
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-nav-title"
      className="fixed inset-0 z-50 lg:hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-full bg-white border-r border-border-subtle shadow-elevated flex flex-col justify-between z-10 animate-[modalSlideUp_0.15s_ease-out]">
        <div>
          {/* Header */}
          <div className="h-16 px-5 border-b border-border-subtle flex items-center justify-between">
            <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-extrabold text-sm tracking-tight">
                L
              </div>
              <span className="font-extrabold text-sm tracking-tight text-primary">
                LearnSpace
              </span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="w-8 h-8 rounded-full border border-border-subtle bg-surface-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4">
            <span id="mobile-nav-title" className="text-[10px] font-bold uppercase tracking-wider text-tertiary px-3 mb-2 block">
              Workspace Menu
            </span>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-secondary hover:text-primary hover:bg-surface-subtle'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-white' : 'text-secondary'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-surface-subtle/60">
          <div className="p-3 bg-white border border-border-subtle rounded-2xl shadow-xs mb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="text-xs font-bold text-primary block truncate">
                {user?.name}
              </span>
              <span className="text-[10px] text-secondary block truncate">
                {user?.email}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border-subtle bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
