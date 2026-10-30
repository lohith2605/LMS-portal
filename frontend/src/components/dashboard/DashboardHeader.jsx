import React from 'react';
import { Menu, Bell } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

export default function DashboardHeader({
  user,
  logout,
  onOpenMobileNav,
  onOpenNotifications,
  unreadCount = 0,
  onOpenPasswordModal,
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border-subtle h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation drawer"
          className="lg:hidden p-2 rounded-xl border border-border-subtle bg-white text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Trigger with Badge */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label={unreadCount > 0 ? `View notifications (${unreadCount} unread)` : 'View notifications'}
          className="relative p-2 rounded-xl border border-border-subtle bg-white text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center leading-none shadow-xs"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
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
