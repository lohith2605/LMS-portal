import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, KeyRound, ShieldCheck, ExternalLink, ChevronDown, Camera, User, Cookie, Edit3 } from 'lucide-react';
import { useCookieConsent } from '../../context/CookieConsentContext';
import { calculateProfileCompletion } from '../../utils/profileCompletion';

export default function ProfileMenu({
  user,
  logout,
  onOpenPasswordModal,
  onOpenAvatarModal,
  onOpenProfileModal,
  onSelectTab,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const { openPreferences } = useCookieConsent();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const roleStyles = {
    admin: 'bg-rose-100 text-rose-800',
    instructor: 'bg-accent-sage-pale text-accent-sage-dark',
    student: 'bg-accent-blue-pale text-accent-blue-dark',
  };

  const avatarUrl = user?.avatar?.url;
  const completion = user ? calculateProfileCompletion(user) : null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="group flex items-center gap-2.5 p-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle hover-lift transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold tracking-tight ring-2 ring-border-subtle group-hover:ring-accent transition-all overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name || 'Profile'}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="hidden md:flex flex-col text-left pr-1">
          <span className="text-xs font-bold text-primary truncate max-w-[120px]">
            {user?.name}
          </span>
          <span className="text-[10px] text-secondary capitalize">
            {user?.role}
          </span>
        </div>
        <ChevronDown size={14} className="text-secondary hidden md:block" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-surface-elevated border border-border-subtle rounded-2xl shadow-elevated py-2 z-50 animate-[modalSlideUp_0.15s_ease-out]"
        >
          {/* User Details Header */}
          <div className="px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-primary truncate">
                {user?.name}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  roleStyles[user?.role] || roleStyles.student
                }`}
              >
                {user?.role}
              </span>
            </div>
            <p className="text-[11px] text-secondary truncate">{user?.email}</p>

            {/* Compact Profile Completion Indicator */}
            {completion && (
              <div className="mt-2.5 pt-2 border-t border-border-subtle/50">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-secondary font-medium">Profile completeness</span>
                  <span
                    className={`font-bold ${
                      completion.isComplete
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-cobalt'
                    }`}
                  >
                    {completion.percentage}%
                  </span>
                </div>
                <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden mt-1 ring-1 ring-border-subtle/30">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      completion.isComplete ? 'bg-emerald-500' : 'bg-cobalt'
                    }`}
                    style={{ width: `${completion.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              to="/profile"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                if (onSelectTab) onSelectTab('profile');
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-primary hover:bg-surface-subtle transition-colors text-left"
            >
              <User size={14} className="text-cobalt" />
              <span>View Profile</span>
            </Link>

            {onOpenProfileModal && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onOpenProfileModal('headline');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-secondary hover:text-primary hover:bg-surface-subtle transition-colors text-left cursor-pointer"
              >
                <Edit3 size={14} className="text-secondary" />
                <span>Edit Profile Details</span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                if (onOpenAvatarModal) onOpenAvatarModal();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-secondary hover:text-primary hover:bg-surface-subtle transition-colors text-left cursor-pointer"
            >
              <Camera size={14} className="text-secondary" />
              <span>Change Photo</span>
            </button>

            {onSelectTab && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onSelectTab('security');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-secondary hover:text-primary hover:bg-surface-subtle transition-colors text-left cursor-pointer"
              >
                <ShieldCheck size={14} className="text-cobalt" />
                <span className="font-semibold text-primary">Account Security & 2FA</span>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenPasswordModal();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-secondary hover:text-primary hover:bg-surface-subtle transition-colors text-left cursor-pointer"
            >
              <KeyRound size={14} className="text-secondary" />
              <span>Change Password</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                openPreferences();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-secondary hover:text-primary hover:bg-surface-subtle transition-colors text-left cursor-pointer"
            >
              <Cookie size={14} className="text-secondary" />
              <span>Cookie Settings</span>
            </button>

            <Link
              to="/"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-secondary hover:text-primary hover:bg-surface-subtle transition-colors text-left"
            >
              <ExternalLink size={14} className="text-secondary" />
              <span>LearnSpace Home</span>
            </Link>
          </div>

          {/* Session Footer */}
          <div className="pt-1 mt-1 border-t border-border-subtle px-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
