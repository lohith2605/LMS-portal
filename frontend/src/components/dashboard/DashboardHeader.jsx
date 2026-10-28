import React from 'react';
import { Menu, Bell } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

export default function DashboardHeader({
  title,
  subtitle,
  role,
  user,
  logout,
  onOpenMobileNav,
  onOpenNotifications,
  unreadCount = 0,
  onOpenPasswordModal,
}) {
  const roleBadges = {
    admin: 'bg-rose-100 text-rose-800 border-rose-200',
    instructor: 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0]/40',
    student: 'bg-accent-blue-pale text-accent-blue-dark border-[#637D91]/30',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border-subtle h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation drawer"
          className="lg:hidden p-2 rounded-xl border border-border-subtle bg-white text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <Menu size={18} />
        </button>

        {title ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-extrabold text-primary tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <span className="text-[11px] text-secondary hidden sm:block">
                  {subtitle}
                </span>
              )}
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border hidden sm:inline-block ${
                roleBadges[role] || roleBadges.student
              }`}
            >
              {role}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Trigger */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="View announcements"
          className="relative p-2 rounded-xl border border-border-subtle bg-white text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-sage-dark animate-pulse" />
          )}
        </button>

        {/* Profile Dropdown */}
        <ProfileMenu
          user={user}
          logout={logout}
          onOpenPasswordModal={onOpenPasswordModal}
        />
      </div>
    </header>
  );
}
