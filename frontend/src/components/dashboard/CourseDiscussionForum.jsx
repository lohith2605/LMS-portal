import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  HelpCircle,
  Pin,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Send,
  MoreVertical,
  Trash2,
  Edit3,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  CornerDownRight,
  Sparkles,
} from 'lucide-react';
import { discussionService } from '../../services/api';

export default function CourseDiscussionForum({
  courseId,
  courseTitle = 'Course Discussion',
  currentUser,
}) {
  // Navigation & View: 'list' | 'thread'
  const [activeView, setActiveView] = useState('list');
  const [selectedDiscussionId, setSelectedDiscussionId] = useState(null);

  // Listing State
  const [discussions, setDiscussions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canModerate, setCanModerate] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'question' | 'discussion'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'answered' | 'unanswered'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'most_active' | 'oldest'

  // Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState('question');
  const [createTitle, setCreateTitle] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Thread View State
  const [threadDiscussion, setThreadDiscussion] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);

  // Reply Composer State
  const [replyBody, setReplyBody] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState(null);

  // Edit Discussion State
  const [isEditingDiscussion, setIsEditingDiscussion] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  // Edit Reply State
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyBody, setEditReplyBody] = useState('');
  const [editReplySubmitting, setEditReplySubmitting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Course Discussions List
  const fetchDiscussions = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        sort: sortBy,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const data = await discussionService.getCourseDiscussions(courseId, params);
      setDiscussions(data.discussions || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      setCanModerate(Boolean(data.permissions?.canModerate));
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to load course discussions.');
    } finally {
      setLoading(false);
    }
  }, [courseId, page, limit, sortBy, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    if (activeView === 'list') {
      fetchDiscussions();
    }
  }, [fetchDiscussions, activeView]);

  // Load Discussion Thread
  const fetchThread = useCallback(async (discId) => {
    if (!discId) return;
    try {
      setThreadLoading(true);
      setThreadError(null);
      const data = await discussionService.getDiscussionById(discId);
      setThreadDiscussion(data.discussion);
      setThreadReplies(data.replies || []);
      setCanModerate(Boolean(data.permissions?.canModerate));
      setEditTitle(data.discussion.title);
      setEditBody(data.discussion.body);
    } catch (err) {
      setThreadError(err.normalizedMessage || 'Failed to load discussion thread.');
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const openThread = (discussion) => {
    setSelectedDiscussionId(discussion._id);
    setActiveView('thread');
    fetchThread(discussion._id);
  };

  const backToList = () => {
    setActiveView('list');
    setSelectedDiscussionId(null);
    setThreadDiscussion(null);
    setThreadReplies([]);
    setIsEditingDiscussion(false);
    fetchDiscussions();
  };

  // Submit New Discussion
  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    if (createTitle.trim().length < 5) {
      setCreateError('Title must be at least 5 characters long.');
      return;
    }
    if (createBody.trim().length < 10) {
      setCreateError('Content must be at least 10 characters long.');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);
      const res = await discussionService.createDiscussion(courseId, {
        title: createTitle.trim(),
        body: createBody.trim(),
        type: createType,
      });

      setIsCreateModalOpen(false);
      setCreateTitle('');
      setCreateBody('');
      setCreateType('question');

      // Open newly created discussion directly
      if (res.discussion) {
        openThread(res.discussion);
      } else {
        fetchDiscussions();
      }
    } catch (err) {
      setCreateError(err.normalizedMessage || 'Failed to create discussion.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Submit Reply
  const handlePostReply = async (e) => {
    e.preventDefault();
    if (replyBody.trim().length < 2) {
      setReplyError('Reply must be at least 2 characters long.');
      return;
    }

    try {
      setReplySubmitting(true);
      setReplyError(null);
      await discussionService.createReply(threadDiscussion._id, {
        body: replyBody.trim(),
      });
      setReplyBody('');
      fetchThread(threadDiscussion._id);
    } catch (err) {
      setReplyError(err.normalizedMessage || 'Failed to post reply.');
    } finally {
      setReplySubmitting(false);
    }
  };

  // Save Discussion Edits
  const handleSaveDiscussionEdit = async () => {
    try {
      setEditSubmitting(true);
      setEditError(null);
      const res = await discussionService.updateDiscussion(threadDiscussion._id, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
      setThreadDiscussion(res.discussion);
      setIsEditingDiscussion(false);
    } catch (err) {
      setEditError(err.normalizedMessage || 'Failed to update discussion.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete Discussion
  const handleDeleteDiscussion = async (discId) => {
    if (!window.confirm('Are you sure you want to delete this discussion topic?')) return;
    try {
      await discussionService.deleteDiscussion(discId);
      if (activeView === 'thread') {
        backToList();
      } else {
        fetchDiscussions();
      }
    } catch (err) {
      alert(err.normalizedMessage || 'Failed to delete discussion.');
    }
  };

  // Toggle Pin
  const handleTogglePin = async (discId) => {
    try {
      await discussionService.togglePinDiscussion(discId);
      if (activeView === 'thread') {
        fetchThread(discId);
      } else {
        fetchDiscussions();
      }
    } catch (err) {
      alert(err.normalizedMessage || 'Failed to toggle pin.');
    }
  };

  // Toggle Lock
  const handleToggleLock = async (discId) => {
    try {
      await discussionService.toggleLockDiscussion(discId);
      if (activeView === 'thread') {
        fetchThread(discId);
      } else {
        fetchDiscussions();
      }
    } catch (err) {
      alert(err.normalizedMessage || 'Failed to toggle lock.');
    }
  };

  // Toggle Accepted Answer
  const handleToggleAcceptedAnswer = async (replyId) => {
    try {
      await discussionService.toggleAcceptedAnswer(threadDiscussion._id, replyId);
      fetchThread(threadDiscussion._id);
    } catch (err) {
      alert(err.normalizedMessage || 'Failed to update accepted answer.');
    }
  };

  // Delete Reply
  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    try {
      await discussionService.deleteReply(threadDiscussion._id, replyId);
      fetchThread(threadDiscussion._id);
    } catch (err) {
      alert(err.normalizedMessage || 'Failed to delete reply.');
    }
  };

  // Save Reply Edit
  const handleSaveReplyEdit = async (replyId) => {
    try {
      setEditReplySubmitting(true);
      await discussionService.updateReply(threadDiscussion._id, replyId, {
        body: editReplyBody.trim(),
      });
      setEditingReplyId(null);
      setEditReplyBody('');
      fetchThread(threadDiscussion._id);
    } catch (err) {
      alert(err.normalizedMessage || 'Failed to update reply.');
    } finally {
      setEditReplySubmitting(false);
    }
  };

  // Format Dates
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --------------------------------------------------------------------------
  // VIEW: DISCUSSION THREAD & REPLIES
  // --------------------------------------------------------------------------
  if (activeView === 'thread') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-2">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={backToList}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-border-subtle text-xs font-semibold text-secondary hover:text-primary hover:border-border-medium transition cursor-pointer shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to All Topics</span>
          </button>

          <div className="flex items-center gap-2">
            {canModerate && threadDiscussion && (
              <>
                <button
                  type="button"
                  onClick={() => handleTogglePin(threadDiscussion._id)}
                  title={threadDiscussion.isPinned ? 'Unpin from top' : 'Pin to top'}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    threadDiscussion.isPinned
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-white text-secondary border-border-subtle hover:text-primary'
                  }`}
                >
                  <Pin size={13} className={threadDiscussion.isPinned ? 'fill-current' : ''} />
                  <span>{threadDiscussion.isPinned ? 'Pinned' : 'Pin'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLock(threadDiscussion._id)}
                  title={threadDiscussion.isLocked ? 'Unlock discussion' : 'Lock discussion'}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    threadDiscussion.isLocked
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-white text-secondary border-border-subtle hover:text-primary'
                  }`}
                >
                  {threadDiscussion.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                  <span>{threadDiscussion.isLocked ? 'Locked' : 'Lock'}</span>
                </button>
              </>
            )}

            {threadDiscussion?.canDelete && (
              <button
                type="button"
                onClick={() => handleDeleteDiscussion(threadDiscussion._id)}
                title="Delete Discussion"
                className="p-2 rounded-xl bg-white border border-border-subtle text-red-600 hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {threadLoading ? (
          <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center shadow-xs">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-secondary">Loading discussion thread...</p>
          </div>
        ) : threadError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-xs">
            <AlertCircle size={16} className="inline mr-2" />
            <span>{threadError}</span>
          </div>
        ) : threadDiscussion ? (
          <>
            {/* Main Question / Topic Card */}
            <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs relative">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      threadDiscussion.type === 'question'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0]/40'
                    }`}
                  >
                    {threadDiscussion.type === 'question' ? (
                      <HelpCircle size={11} />
                    ) : (
                      <MessageSquare size={11} />
                    )}
                    <span>{threadDiscussion.type}</span>
                  </span>

                  {threadDiscussion.type === 'question' && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        threadDiscussion.isAnswered
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {threadDiscussion.isAnswered ? (
                        <>
                          <CheckCircle2 size={11} />
                          <span>Answered</span>
                        </>
                      ) : (
                        <>
                          <Clock size={11} />
                          <span>Needs Answer</span>
                        </>
                      )}
                    </span>
                  )}

                  {threadDiscussion.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Pin size={10} className="fill-current" />
                      <span>Pinned</span>
                    </span>
                  )}

                  {threadDiscussion.isLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                      <Lock size={10} />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                {threadDiscussion.canEdit && !isEditingDiscussion && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDiscussion(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Title & Body / Edit Mode */}
              {isEditingDiscussion ? (
                <div className="space-y-4 pt-2">
                  {editError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                      {editError}
                    </p>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:bg-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Content</label>
                    <textarea
                      rows={5}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:bg-white focus:outline-none focus:border-primary resize-y"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTitle(threadDiscussion.title);
                        setEditBody(threadDiscussion.body);
                        setIsEditingDiscussion(false);
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:text-primary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={editSubmitting}
                      onClick={handleSaveDiscussionEdit}
                      className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-black transition cursor-pointer disabled:opacity-50"
                    >
                      {editSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-lg font-bold text-primary mb-3">
                    {threadDiscussion.title}
                  </h1>

                  <div className="text-sm text-secondary leading-relaxed whitespace-pre-wrap mb-6">
                    {threadDiscussion.body}
                  </div>
                </>
              )}

              {/* Author Footer */}
              <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-tertiary">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center font-bold text-primary text-xs uppercase">
                    {threadDiscussion.author?.name ? threadDiscussion.author.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <span className="font-semibold text-primary">
                      {threadDiscussion.author?.name || 'Community Member'}
                    </span>
                    {threadDiscussion.author?.role === 'instructor' && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                        Instructor
                      </span>
                    )}
                    {threadDiscussion.author?.role === 'admin' && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                <span>Posted on {formatDate(threadDiscussion.createdAt)}</span>
              </div>
            </div>

            {/* Replies List Header */}
            <div className="flex items-center justify-between px-1 pt-2">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <span>Responses & Answers</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-subtle border border-border-subtle text-xs text-secondary">
                  {threadReplies.length}
                </span>
              </h2>
            </div>

            {/* Replies List */}
            {threadReplies.length === 0 ? (
              <div className="bg-white border border-border-subtle rounded-2xl p-8 text-center shadow-xs">
                <MessageSquare size={24} className="mx-auto mb-2 text-tertiary" />
                <h3 className="text-xs font-bold text-primary">No responses yet</h3>
                <p className="text-xs text-secondary mt-1">
                  Be the first to provide guidance or contribute your insights.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {threadReplies.map((reply) => {
                  const isAccepted = Boolean(reply.isAccepted);
                  const isEditingThis = editingReplyId === reply._id;

                  return (
                    <div
                      key={reply._id}
                      className={`rounded-2xl p-5 border transition shadow-xs ${
                        isAccepted
                          ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300'
                          : 'bg-white border-border-subtle'
                      }`}
                    >
                      {/* Accepted Answer Banner */}
                      {isAccepted && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-3 pb-2 border-b border-emerald-200">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span>Accepted Solution</span>
                          <span className="text-[11px] font-normal text-emerald-700 ml-1">
                            — Verified by question author or instructor
                          </span>
                        </div>
                      )}

                      {/* Reply Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center font-bold text-primary text-[11px] uppercase">
                            {reply.author?.name ? reply.author.name.charAt(0) : 'U'}
                          </div>
                          <span className="text-xs font-bold text-primary">
                            {reply.author?.name || 'Participant'}
                          </span>
                          {reply.author?.role === 'instructor' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                              Instructor
                            </span>
                          )}
                          {reply.author?.role === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Admin
                            </span>
                          )}
                          <span className="text-[11px] text-tertiary">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>

                        {/* Reply Action Controls */}
                        <div className="flex items-center gap-2">
                          {/* Mark / Unmark Accepted Answer */}
                          {reply.canAccept && (
                            <button
                              type="button"
                              onClick={() => handleToggleAcceptedAnswer(reply._id)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                                isAccepted
                                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                  : 'bg-surface-subtle text-secondary border-border-subtle hover:text-emerald-700 hover:border-emerald-300'
                              }`}
                            >
                              <Check size={12} />
                              <span>{isAccepted ? 'Unmark Solution' : 'Accept Solution'}</span>
                            </button>
                          )}

                          {reply.canEdit && !isEditingThis && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReplyId(reply._id);
                                setEditReplyBody(reply.body);
                              }}
                              className="text-tertiary hover:text-secondary p-1 rounded transition cursor-pointer"
                              title="Edit reply"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}

                          {reply.canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteReply(reply._id)}
                              className="text-tertiary hover:text-red-600 p-1 rounded transition cursor-pointer"
                              title="Delete reply"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reply Content / Edit Mode */}
                      {isEditingThis ? (
                        <div className="space-y-3 pt-1">
                          <textarea
                            rows={3}
                            value={editReplyBody}
                            onChange={(e) => setEditReplyBody(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:bg-white focus:outline-none focus:border-primary resize-y"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReplyId(null);
                                setEditReplyBody('');
                              }}
                              className="px-3 py-1 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:text-primary cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={editReplySubmitting}
                              onClick={() => handleSaveReplyEdit(reply._id)}
                              className="px-3.5 py-1 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-black transition cursor-pointer disabled:opacity-50"
                            >
                              {editReplySubmitting ? 'Saving...' : 'Update'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-secondary leading-relaxed whitespace-pre-wrap pl-8">
                          {reply.body}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply Composer Card */}
            <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs">
              {threadDiscussion.isLocked ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700">
                  <Lock size={15} className="shrink-0" />
                  <span>
                    This discussion has been locked by an educator. New contributions are currently disabled.
                  </span>
                </div>
              ) : (
                <form onSubmit={handlePostReply} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CornerDownRight size={14} className="text-accent-blue-dark" />
                    <label className="text-xs font-bold text-primary">
                      {threadDiscussion.type === 'question' ? 'Your Answer' : 'Your Contribution'}
                    </label>
                  </div>

                  {replyError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                      {replyError}
                    </p>
                  )}

                  <textarea
                    rows={3}
                    required
                    placeholder={
                      threadDiscussion.type === 'question'
                        ? 'Write a clear, helpful answer to assist with this question...'
                        : 'Share your perspective, code snippets, or thoughts...'
                    }
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:bg-white focus:outline-none focus:border-primary transition resize-y"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-tertiary">
                      Be respectful and concise. Supports plain text.
                    </span>

                    <button
                      type="submit"
                      disabled={replySubmitting || !replyBody.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-black transition cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <Send size={12} />
                      <span>{replySubmitting ? 'Posting...' : 'Submit Response'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: COURSE DISCUSSION LIST (DEFAULT)
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-border-subtle rounded-2xl p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-blue-dark mb-1">
            <MessageSquare size={13} />
            <span>Community Q&A</span>
          </div>
          <h2 className="text-base font-bold text-primary mb-1">
            {courseTitle} Discussion Forum
          </h2>
          <p className="text-xs text-secondary leading-relaxed max-w-xl">
            Ask technical questions, discuss curriculum concepts with fellow peers, and learn from verified educator answers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-black transition cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
        >
          <Plus size={14} />
          <span>New Question or Topic</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search questions or discussions by topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-subtle border border-border-subtle rounded-xl text-xs text-primary focus:bg-white focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-secondary">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-surface-subtle border border-border-subtle rounded-xl text-xs font-medium text-primary focus:bg-white focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="newest">Recent Activity</option>
              <option value="most_active">Most Discussed</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-subtle">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-tertiary uppercase mr-1">Type:</span>
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'question', label: 'Questions' },
              { id: 'discussion', label: 'General' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTypeFilter(t.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  typeFilter === t.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-subtle text-secondary hover:text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status Filter for Questions */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-tertiary uppercase mr-1">Status:</span>
            {[
              { id: 'all', label: 'Any' },
              { id: 'answered', label: 'Answered' },
              { id: 'unanswered', label: 'Unanswered' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStatusFilter(s.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === s.id
                    ? 'bg-accent-blue-dark text-white'
                    : 'bg-surface-subtle text-secondary hover:text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Discussion List Content */}
      {loading ? (
        <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-secondary">Loading discussions...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-xs">
          <AlertCircle size={16} className="inline mr-2" />
          <span>{error}</span>
        </div>
      ) : discussions.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center mx-auto mb-3 text-secondary">
            <MessageSquare size={22} />
          </div>
          <h3 className="text-sm font-bold text-primary mb-1">No discussions found</h3>
          <p className="text-xs text-secondary max-w-sm mx-auto mb-4">
            {debouncedSearch || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No topics match your active search and filter criteria. Try clearing filters.'
              : 'There are no questions or discussions posted in this course yet. Be the first to start a conversation!'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
              setStatusFilter('all');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-black transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Ask First Question</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((d) => (
            <div
              key={d._id}
              onClick={() => openThread(d)}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition hover:border-border-medium hover:shadow-card cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                d.isPinned ? 'border-amber-300/80 bg-amber-50/20' : 'border-border-subtle'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* Pinned pill */}
                  {d.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Pin size={10} className="fill-current" />
                      <span>Pinned</span>
                    </span>
                  )}

                  {/* Type pill */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      d.type === 'question'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0]/40'
                    }`}
                  >
                    {d.type === 'question' ? <HelpCircle size={10} /> : <MessageSquare size={10} />}
                    <span>{d.type}</span>
                  </span>

                  {/* Answer status */}
                  {d.type === 'question' && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        d.isAnswered
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {d.isAnswered ? (
                        <>
                          <CheckCircle2 size={10} />
                          <span>Solved</span>
                        </>
                      ) : (
                        <>
                          <Clock size={10} />
                          <span>Unsolved</span>
                        </>
                      )}
                    </span>
                  )}

                  {/* Locked status */}
                  {d.isLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                      <Lock size={10} />
                      <span>Locked</span>
                    </span>
                  )}

                  <span className="text-[11px] text-tertiary">
                    {formatDate(d.lastActivityAt || d.createdAt)}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-primary mb-1 line-clamp-1 hover:text-accent-blue-dark transition">
                  {d.title}
                </h3>

                <p className="text-xs text-secondary line-clamp-2 leading-relaxed mb-3">
                  {d.body}
                </p>

                <div className="flex items-center gap-2 text-xs text-tertiary">
                  <span className="font-medium text-primary">
                    {d.author?.name || 'Community Member'}
                  </span>
                  {d.author?.role === 'instructor' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-sage-pale text-accent-sage-dark border border-[#A8B5A0]/40">
                      Instructor
                    </span>
                  )}
                  <span>•</span>
                  <span>{d.replyCount} {d.replyCount === 1 ? 'response' : 'responses'}</span>
                </div>
              </div>

              {/* Reply Badge Indicator */}
              <div className="shrink-0 flex sm:flex-col items-center justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                <div
                  className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border ${
                    d.isAnswered
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : d.replyCount > 0
                      ? 'bg-surface-subtle text-primary border-border-subtle'
                      : 'bg-white text-tertiary border-border-subtle'
                  }`}
                >
                  <span className="text-sm font-bold leading-none">{d.replyCount}</span>
                  <span className="text-[9px] font-semibold uppercase mt-0.5">replies</span>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 px-2">
              <span className="text-xs text-secondary">
                Page {page} of {totalPages} ({totalCount} total topics)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl bg-white border border-border-subtle text-secondary hover:text-primary disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl bg-white border border-border-subtle text-secondary hover:text-primary disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* CREATION MODAL */}
      {/* -------------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-border-subtle rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-elevated">
            <h3 className="text-base font-bold text-primary mb-1">
              Start a Topic or Ask a Question
            </h3>
            <p className="text-xs text-secondary mb-4 leading-relaxed">
              Your inquiry will be visible to enrolled learners and course educators.
            </p>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDiscussion} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateType('question')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      createType === 'question'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-300'
                        : 'bg-surface-subtle text-secondary border-border-subtle hover:text-primary'
                    }`}
                  >
                    <HelpCircle size={14} />
                    <span>Technical Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateType('discussion')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      createType === 'discussion'
                        ? 'bg-accent-sage-pale text-accent-sage-dark border-[#A8B5A0] ring-1 ring-[#A8B5A0]'
                        : 'bg-surface-subtle text-secondary border-border-subtle hover:text-primary'
                    }`}
                  >
                    <MessageSquare size={14} />
                    <span>General Discussion</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Title (min. 5 chars)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How does optimistic locking prevent lost updates?"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:bg-white focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Description & Context (min. 10 chars)
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Provide context, code snippets, or error output to help others assist..."
                  value={createBody}
                  onChange={(e) => setCreateBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface-subtle border border-border-subtle rounded-xl text-primary focus:bg-white focus:outline-none focus:border-primary transition resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-black transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {createSubmitting ? 'Publishing...' : 'Publish Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

