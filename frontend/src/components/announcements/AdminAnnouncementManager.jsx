import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users,
  RefreshCw,
  X,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { announcementService } from '../../services/api';

const PRIORITY_BADGES = {
  urgent: 'bg-rose-100 text-rose-800 border-rose-300',
  high: 'bg-amber-100 text-amber-800 border-amber-300',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ROLE_LABELS = {
  all: 'All Users',
  student: 'Students Only',
  instructor: 'Instructors Only',
};

export default function AdminAnnouncementManager() {
  const [announcements, setAnnouncements] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetRoles: ['all'],
    priority: 'normal',
    isPinned: false,
    expiresAt: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchAnnouncements = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await announcementService.getUserAnnouncements({
        scope: 'platform',
        page,
        limit: 10,
      });
      if (data && Array.isArray(data.announcements)) {
        setAnnouncements(data.announcements);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to load platform announcements.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements(1);
  }, [fetchAnnouncements]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      content: '',
      targetRoles: ['all'],
      priority: 'normal',
      isPinned: false,
      expiresAt: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      content: item.content || '',
      targetRoles: item.targetRoles || ['all'],
      priority: item.priority || 'normal',
      isPinned: Boolean(item.isPinned),
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (formData.title.trim().length > 150) {
      setFormError('Title must be 150 characters or less.');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('Content is required.');
      return;
    }
    if (formData.content.trim().length > 5000) {
      setFormError('Content must be 5000 characters or less.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        targetRoles: formData.targetRoles,
        priority: formData.priority,
        isPinned: formData.isPinned,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      };

      if (editingItem) {
        await announcementService.updateAnnouncement(editingItem._id, payload);
        setSuccessMsg('Platform announcement updated successfully.');
      } else {
        await announcementService.createPlatformAnnouncement(payload);
        setSuccessMsg('Platform announcement published successfully.');
      }

      setIsModalOpen(false);
      fetchAnnouncements(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setFormError(err.normalizedMessage || 'Failed to save announcement.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTogglePin = async (item) => {
    try {
      await announcementService.togglePinAnnouncement(item._id, !item.isPinned);
      setAnnouncements((prev) =>
        prev.map((a) => (a._id === item._id ? { ...a, isPinned: !item.isPinned } : a))
      );
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to update pin status.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await announcementService.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      setDeleteConfirmId(null);
      setSuccessMsg('Announcement deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to delete announcement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-accent-sage-pale/60 text-accent-sage-dark flex items-center justify-center">
              <Megaphone size={18} />
            </span>
            <h2 className="text-base font-bold text-primary">Platform Announcements</h2>
          </div>
          <p className="text-xs text-secondary">
            Broadcast platform updates, scheduled maintenance windows, and policy bulletins to students and educators.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover transition-all shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
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

      {/* Announcements List */}
      <div className="bg-white border border-border-subtle rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-subtle/50">
          <span className="text-xs font-bold text-primary">
            Published Announcements ({pagination.total})
          </span>
          <button
            type="button"
            onClick={() => fetchAnnouncements(pagination.page)}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-white transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-secondary space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-cobalt" />
            <p>Loading platform announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary mx-auto">
              <Megaphone size={20} />
            </div>
            <h4 className="text-sm font-bold text-primary">No platform announcements</h4>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              Broadcast critical information or system-wide news to keep learners and educators informed.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Announcement</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {announcements.map((item) => {
              const priorityClass = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.normal;
              const isExpired = item.expiresAt && new Date(item.expiresAt) <= new Date();

              return (
                <div
                  key={item._id}
                  className={`p-5 transition-colors ${
                    item.isPinned ? 'bg-amber-50/20' : 'hover:bg-surface-subtle/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            <Pin size={10} className="fill-amber-800" />
                            Pinned
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityClass}`}
                        >
                          {item.priority} priority
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-subtle text-secondary border border-border-subtle">
                          <Users size={10} />
                          {item.targetRoles?.map((r) => ROLE_LABELS[r] || r).join(', ') || 'All Users'}
                        </span>
                        {item.expiresAt && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                              isExpired
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Clock size={10} />
                            {isExpired ? 'Expired' : `Expires ${new Date(item.expiresAt).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-primary">{item.title}</h3>
                      <p className="text-xs text-secondary leading-relaxed whitespace-pre-line">
                        {item.content}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-tertiary pt-1">
                        <span>Posted by {item.author?.name || 'Administrator'}</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(item)}
                        title={item.isPinned ? 'Unpin announcement' : 'Pin to top'}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          item.isPinned
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'text-secondary hover:text-primary hover:bg-white border-border-subtle'
                        }`}
                      >
                        <Pin size={14} className={item.isPinned ? 'fill-amber-800' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        title="Edit announcement"
                        className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-white border border-border-subtle transition-colors cursor-pointer"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item._id)}
                        title="Delete announcement"
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between text-xs bg-surface-subtle/30">
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-surface rounded-2xl border border-border-subtle shadow-elevated p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className="text-base font-bold text-primary">
                {editingItem ? 'Edit Platform Announcement' : 'New Platform Announcement'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-primary mb-1">
                  Announcement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Scheduled System Maintenance on Sunday"
                  maxLength={150}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:ring-1 focus:ring-cobalt focus:outline-hidden"
                />
                <span className="text-[10px] text-tertiary block mt-1 text-right">
                  {formData.title.length}/150 characters
                </span>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1">
                  Announcement Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Describe the update, affected features, or scheduled timeline..."
                  maxLength={5000}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:ring-1 focus:ring-cobalt focus:outline-hidden resize-y"
                />
                <span className="text-[10px] text-tertiary block mt-1 text-right">
                  {formData.content.length}/5000 characters
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">Target Audience</label>
                  <select
                    value={formData.targetRoles[0] || 'all'}
                    onChange={(e) => setFormData({ ...formData, targetRoles: [e.target.value] })}
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-hidden"
                  >
                    <option value="all">All Users (Students & Instructors)</option>
                    <option value="student">Students Only</option>
                    <option value="instructor">Instructors Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-hidden"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Critical</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-primary mb-1">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded text-cobalt border-border-subtle focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isPinned" className="font-bold text-primary cursor-pointer select-none">
                    Pin to top of bulletin board
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl border border-border-subtle bg-white text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-cobalt text-white font-bold hover:bg-cobalt-hover transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>{editingItem ? 'Save Changes' : 'Broadcast Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-surface rounded-2xl border border-border-subtle shadow-elevated p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-primary">Delete Announcement?</h4>
              <p className="text-xs text-secondary mt-1">
                Are you sure you want to remove this announcement? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-subtle bg-white text-secondary hover:text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

