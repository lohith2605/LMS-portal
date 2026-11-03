import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Pin,
  Calendar,
  BookOpen,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { announcementService } from '../../services/api';

const PRIORITY_BADGES = {
  urgent: 'bg-rose-100 text-rose-800 border-rose-300',
  high: 'bg-amber-100 text-amber-800 border-amber-300',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function StudentAnnouncementFeed() {
  const [announcements, setAnnouncements] = useState([]);
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'course' | 'platform'
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnnouncements = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = { page, limit: 10 };
        if (scopeFilter !== 'all') {
          params.scope = scopeFilter;
        }
        const data = await announcementService.getUserAnnouncements(params);
        setAnnouncements(data.announcements || []);
        if (data.pagination) setPagination(data.pagination);
      } catch (err) {
        setError(err.normalizedMessage || 'Failed to load announcements.');
      } finally {
        setIsLoading(false);
      }
    },
    [scopeFilter]
  );

  useEffect(() => {
    fetchAnnouncements(1);
  }, [fetchAnnouncements]);

  return (
    <div className="space-y-6">
      {/* Scope Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border-subtle p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scopeFilter === 'all'
                ? 'bg-cobalt text-white shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-subtle'
            }`}
          >
            All Announcements
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('course')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scopeFilter === 'course'
                ? 'bg-cobalt text-white shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-subtle'
            }`}
          >
            My Course Notices
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('platform')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scopeFilter === 'platform'
                ? 'bg-cobalt text-white shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-subtle'
            }`}
          >
            Platform Updates
          </button>
        </div>

        <button
          type="button"
          onClick={() => fetchAnnouncements(pagination.page)}
          disabled={isLoading}
          className="self-end sm:self-auto p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer flex items-center gap-1 text-xs"
          title="Refresh"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchAnnouncements(pagination.page)}
            className="font-bold underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Feed */}
      {isLoading ? (
        <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center text-xs text-secondary space-y-2">
          <RefreshCw size={24} className="animate-spin mx-auto text-cobalt" />
          <p>Loading course bulletins and platform announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary mx-auto">
            <Megaphone size={20} />
          </div>
          <h4 className="text-sm font-bold text-primary">No announcements right now</h4>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            When instructors publish assignment revisions or platform admins share updates, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => {
            const priorityClass = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.normal;
            const isCourseScope = item.scope === 'course';

            return (
              <div
                key={item._id}
                className={`bg-white border rounded-2xl p-6 transition-all ${
                  item.isPinned
                    ? 'border-amber-300 bg-amber-50/15 shadow-xs'
                    : 'border-border-subtle shadow-xs hover:border-border-focus/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        <Pin size={10} className="fill-amber-800" />
                        Pinned Notice
                      </span>
                    )}

                    {isCourseScope ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cobalt-soft text-cobalt border border-cobalt-border">
                        <BookOpen size={10} />
                        {item.course?.title || 'Course Announcement'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                        <Sparkles size={10} />
                        Platform Notice
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityClass}`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <span className="text-xs text-tertiary flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-primary mb-2">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-secondary leading-relaxed whitespace-pre-line mb-3">
                  {item.content}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border-subtle/60 text-xs">
                  <span className="text-tertiary text-[11px]">
                    Posted by {item.author?.name || (isCourseScope ? 'Instructor' : 'LearnSpace Admin')}
                  </span>

                  {isCourseScope && item.course && (
                    <Link
                      to={`/courses/${item.course.slug || item.course._id}/learn?view=announcements`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-cobalt hover:underline"
                    >
                      <span>Open Course Workspace</span>
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 bg-white border border-border-subtle rounded-2xl flex items-center justify-between text-xs">
              <span className="text-secondary">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchAnnouncements(pagination.page - 1)}
                  className="px-3 py-1 rounded-lg border border-border-subtle bg-white text-primary disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchAnnouncements(pagination.page + 1)}
                  className="px-3 py-1 rounded-lg border border-border-subtle bg-white text-primary disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
