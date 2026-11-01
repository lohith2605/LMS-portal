import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function AnnouncementsTab({
  data,
  notifications = [],
  unreadCount = 0,
  markAsRead,
  markAllAsRead,
}) {
  const announcements = data?.announcements || [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-primary mb-1">
            Notifications & Platform Bulletins
          </h2>
          <p className="text-xs text-secondary">
            Real-time alerts, assignment feedback, discussion replies, and platform updates.
          </p>
        </div>
        {unreadCount > 0 && markAllAsRead && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-bold rounded-xl bg-surface-subtle hover:bg-white border border-border-subtle text-primary transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* In-app Activity & Notifications */}
      {notifications && notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary">
              Recent Activity & Alerts ({notifications.length})
            </h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {notifications.map((item) => (
              <div
                key={item._id}
                className={`p-4 rounded-2xl border transition-all ${
                  !item.isRead
                    ? 'bg-blue-50/40 border-blue-200 shadow-xs'
                    : 'bg-white border-border-subtle'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-subtle text-primary border border-border-subtle">
                        {(item.type || 'notification').replace('_', ' ')}
                      </span>
                      <span className="text-xs text-tertiary">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-primary mb-1">{item.title}</h4>
                    <p className="text-xs text-secondary leading-relaxed">{item.message}</p>
                    {item.link && (
                      <div className="mt-2.5">
                        <Link
                          to={item.link}
                          onClick={() => {
                            if (!item.isRead && markAsRead) markAsRead(item._id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-accent-blue-dark hover:underline"
                        >
                          <span>View details</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}
                  </div>
                  {!item.isRead && markAsRead && (
                    <button
                      type="button"
                      onClick={() => markAsRead(item._id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg text-secondary hover:text-primary hover:bg-white border border-border-subtle transition-colors cursor-pointer shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Announcements */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary px-1">
          System Announcements
        </h3>
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                  {ann.tag}
                </span>
                <span className="text-xs text-tertiary">{ann.date}</span>
              </div>
              <h3 className="text-sm font-bold text-primary mb-1.5">{ann.title}</h3>
              <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                {ann.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

