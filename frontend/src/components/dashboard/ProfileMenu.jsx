import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, KeyRound, ExternalLink, ChevronDown } from 'lucide-react';

export default function ProfileMenu({ user, logout, onOpenPasswordModal }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 p-1.5 rounded-xl border border-border-subtle bg-white hover:bg-surface-subtle transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold tracking-tight">
          {initials}
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
          className="absolute right-0 mt-2 w-64 bg-white border border-border-subtle rounded-2xl shadow-elevated py-2 z-50 animate-[modalSlideUp_0.15s_ease-out]"
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
          </div>

          {/* Menu Items */}
          <div className="py-1">
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
              <span>Security & Password</span>
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
