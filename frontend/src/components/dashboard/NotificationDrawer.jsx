import React, { useEffect } from 'react';
import { X, Bell, Calendar, Tag } from 'lucide-react';

export default function NotificationDrawer({ isOpen, onClose, announcements = [] }) {
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-border-subtle shadow-elevated flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-primary">
                <Bell size={16} />
              </div>
              <div>
                <h2 id="notifications-title" className="text-base font-bold text-primary">
                  Notifications & Announcements
                </h2>
                <p className="text-[11px] text-secondary">
                  Platform updates and course bulletins
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications panel"
              className="w-8 h-8 rounded-full border border-border-subtle bg-surface-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {announcements && announcements.length > 0 ? (
              announcements.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-border-subtle bg-surface-subtle hover:bg-white hover:shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40 flex items-center gap-1">
                      <Tag size={10} />
                      <span>{item.tag || 'Announcement'}</span>
                    </span>

                    <span className="text-[11px] text-tertiary flex items-center gap-1">
                      <Calendar size={11} />
                      <span>{item.date}</span>
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-primary mb-1">
                    {item.title}
                  </h3>

                  <p className="text-xs text-secondary leading-relaxed">
                    {item.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary mx-auto mb-3">
                  <Bell size={18} />
                </div>
                <h4 className="text-xs font-bold text-primary">No new announcements</h4>
                <p className="text-[11px] text-secondary mt-1">
                  You are completely caught up with platform communications.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border-subtle bg-surface-subtle/60 text-center">
            <span className="text-[11px] text-tertiary">
              LearnSpace Communications Feed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
