import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  X,
} from 'lucide-react';
import { reviewService } from '../../services/api';

/**
 * StarRatingDisplay: Renders visual star indicators for a rating (1-5)
 */
function StarRatingDisplay({ rating = 0, size = 16, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-[#D4D4D0]'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * InteractiveStarPicker: 1-5 clickable and keyboard-accessible star rating input
 */
function InteractiveStarPicker({ rating, onChange, disabled }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Select rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = (hoverRating || rating) >= star;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            disabled={disabled}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            onClick={() => !disabled && onChange(star)}
            className={`p-1 rounded-lg transition-transform focus:outline-none focus:ring-2 focus:ring-primary ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <Star
              size={24}
              className={`${
                active
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-[#D4D4D0] hover:text-amber-300'
              } transition-colors`}
            />
          </button>
        );
      })}
      <span className="text-xs font-bold text-primary ml-2 min-w-[60px]">
        {hoverRating || rating ? `${hoverRating || rating} of 5 stars` : 'Select stars'}
      </span>
    </div>
  );
}

export default function CourseReviewsSection({ courseIdOrSlug, isEnrolled, user }) {
  // Reviews and summary state
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  });
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Student review & eligibility state
  const [eligibility, setEligibility] = useState({
    eligible: false,
    reason: null,
    existingReview: null,
  });
  const [_checkingEligibility, setCheckingEligibility] = useState(false);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewTextInput, setReviewTextInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch reviews
  const fetchReviews = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const data = await reviewService.getCourseReviews(courseIdOrSlug, {
          page,
          limit: pagination.limit,
          sort,
        });

        setReviews(data.reviews || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        setError(err.normalizedMessage || 'Failed to load course reviews.');
      } finally {
        setLoading(false);
      }
    },
    [courseIdOrSlug, pagination.limit, sort]
  );

  // Check student eligibility and fetch own review
  const checkEligibility = useCallback(async () => {
    if (!user || user.role !== 'student') {
      setEligibility({
        eligible: false,
        reason: !user ? 'Log in to submit a review.' : 'Only enrolled students can review courses.',
        existingReview: null,
      });
      return;
    }

    try {
      setCheckingEligibility(true);
      const data = await reviewService.getMyReview(courseIdOrSlug);
      setEligibility(data);

      if (data.existingReview) {
        setRatingInput(data.existingReview.rating);
        setReviewTextInput(data.existingReview.reviewText || '');
      }
    } catch {
      // Ignored non-fatal check
    } finally {
      setCheckingEligibility(false);
    }
  }, [courseIdOrSlug, user]);

  useEffect(() => {
    fetchReviews(1);
    checkEligibility();
  }, [fetchReviews, checkEligibility]);

  // Handle Submit or Update Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!ratingInput || ratingInput < 1 || ratingInput > 5) {
      setFormFeedback({ type: 'error', text: 'Please select a star rating between 1 and 5.' });
      return;
    }

    if (reviewTextInput.trim().length > 0 && reviewTextInput.trim().length < 3) {
      setFormFeedback({
        type: 'error',
        text: 'Review text must be at least 3 characters long if provided.',
      });
      return;
    }

    if (reviewTextInput.trim().length > 1000) {
      setFormFeedback({
        type: 'error',
        text: 'Review text cannot exceed 1000 characters.',
      });
      return;
    }

    try {
      setSubmitting(true);
      if (eligibility.existingReview) {
        // Edit existing review
        const res = await reviewService.updateReview(
          courseIdOrSlug,
          eligibility.existingReview._id,
          {
            rating: ratingInput,
            reviewText: reviewTextInput.trim(),
          }
        );
        setFormFeedback({ type: 'success', text: 'Your review has been successfully updated!' });
        setIsEditing(false);
        if (res.summary) setSummary(res.summary);
      } else {
        // Create new review
        const res = await reviewService.createReview(courseIdOrSlug, {
          rating: ratingInput,
          reviewText: reviewTextInput.trim(),
        });
        setFormFeedback({ type: 'success', text: 'Thank you! Your review has been submitted.' });
        setIsEditing(false);
        if (res.summary) setSummary(res.summary);
      }

      await checkEligibility();
      await fetchReviews(1);
    } catch (err) {
      setFormFeedback({
        type: 'error',
        text: err.normalizedMessage || 'Failed to submit review. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Review
  const handleDeleteReview = async () => {
    if (!eligibility.existingReview) return;

    try {
      setSubmitting(true);
      setFormFeedback(null);
      const res = await reviewService.deleteReview(
        courseIdOrSlug,
        eligibility.existingReview._id
      );

      setFormFeedback({ type: 'success', text: 'Your review has been removed.' });
      setDeleteConfirmOpen(false);
      setIsEditing(false);
      setRatingInput(5);
      setReviewTextInput('');

      if (res.summary) setSummary(res.summary);
      await checkEligibility();
      await fetchReviews(1);
    } catch (err) {
      setFormFeedback({
        type: 'error',
        text: err.normalizedMessage || 'Failed to delete review.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Distribution calculations
  const total = summary.totalReviews || 0;
  const getPercentage = (count) => {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <section className="bg-white border border-[#E4E4E1] rounded-2xl p-6 sm:p-8 shadow-sm space-y-8" aria-label="Course Ratings and Reviews">
      {/* Header & Overall Summary */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#171717]">Student Ratings & Reviews</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F2F2F0] text-secondary border border-[#E4E4E1]">
              {total} {total === 1 ? 'review' : 'reviews'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => fetchReviews(pagination.page)}
            disabled={loading}
            className="p-1.5 rounded-xl border border-[#E4E4E1] bg-white text-secondary hover:text-[#171717] transition-colors cursor-pointer"
            title="Refresh reviews"
            aria-label="Refresh reviews"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-xs text-secondary">
          Genuine feedback submitted by learners who have enrolled in this course track.
        </p>
      </div>

      {/* Aggregate Statistics Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#FAFAFA] border border-[#E4E4E1] rounded-xl p-5 sm:p-6">
        {/* Left: Big Average Rating */}
        <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[#E4E4E1] pb-5 md:pb-0 md:pr-6">
          <div className="text-4xl sm:text-5xl font-black text-[#171717] tracking-tight">
            {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '0.0'}
          </div>
          <div className="my-2">
            <StarRatingDisplay rating={summary.averageRating} size={18} />
          </div>
          <p className="text-xs font-semibold text-secondary">
            {total > 0 ? `Based on ${total} verified ${total === 1 ? 'review' : 'reviews'}` : 'No ratings recorded yet'}
          </p>
        </div>

        {/* Right: 5-Star Distribution Bars (2 cols on md) */}
        <div className="md:col-span-2 space-y-2 justify-center flex flex-col">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.distribution ? summary.distribution[stars] || 0 : 0;
            const pct = getPercentage(count);

            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-secondary w-14 shrink-0 flex items-center gap-1">
                  <span>{stars}</span>
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                </span>

                <div className="flex-1 h-2.5 bg-[#E4E4E1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="font-medium text-tertiary w-10 text-right shrink-0">
                  {pct}%
                </span>
                <span className="text-[11px] text-tertiary w-8 text-right shrink-0">
                  ({count})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Review Form / Callout */}
      <div className="border-t border-[#E4E4E1] pt-6">
        {eligibility.existingReview && !isEditing ? (
          // Student already reviewed - Show summary card with edit/delete triggers
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-900">Your Submitted Review</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {eligibility.existingReview.moderationStatus === 'approved' ? 'Active' : 'Under Review'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <StarRatingDisplay rating={eligibility.existingReview.rating} size={15} />
                  <span className="text-xs font-bold text-[#171717]">
                    {eligibility.existingReview.rating} of 5 stars
                  </span>
                </div>
                {eligibility.existingReview.reviewText && (
                  <p className="text-xs text-secondary mt-2 italic leading-relaxed">
                    &ldquo;{eligibility.existingReview.reviewText}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setRatingInput(eligibility.existingReview.rating);
                    setReviewTextInput(eligibility.existingReview.reviewText || '');
                    setFormFeedback(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E4E4E1] bg-white text-xs font-semibold text-primary hover:bg-[#F2F2F0] transition cursor-pointer shadow-xs"
                >
                  <Edit3 size={13} />
                  <span>Edit Review</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && (
              <div className="mt-4 pt-4 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                <span className="text-rose-800 font-semibold">
                  Are you sure you want to permanently delete your review?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="px-2.5 py-1 rounded bg-white border border-[#E4E4E1] font-medium text-secondary hover:text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteReview}
                    disabled={submitting}
                    className="px-3 py-1 rounded bg-rose-600 text-white font-bold hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : eligibility.eligible || isEditing ? (
          // Form for submitting or editing
          <form onSubmit={handleSubmitReview} className="bg-[#FAFAFA] border border-[#E4E4E1] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#171717]">
                {isEditing ? 'Edit Your Review' : 'Write a Course Review'}
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormFeedback(null);
                  }}
                  className="text-xs text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            {/* Star Rating Selector */}
            <div>
              <label className="block text-xs font-bold text-secondary mb-1.5">
                Your Overall Rating <span className="text-rose-500">*</span>
              </label>
              <InteractiveStarPicker
                rating={ratingInput}
                onChange={setRatingInput}
                disabled={submitting}
              />
            </div>

            {/* Review Text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="course-review-text" className="text-xs font-bold text-secondary">
                  Your Review (Optional)
                </label>
                <span className="text-[11px] text-tertiary">
                  {reviewTextInput.length} / 1000 characters
                </span>
              </div>
              <textarea
                id="course-review-text"
                rows={3}
                maxLength={1000}
                value={reviewTextInput}
                onChange={(e) => setReviewTextInput(e.target.value)}
                placeholder="Share your learning experience, curriculum depth, instructor pacing, and practical exercises..."
                disabled={submitting}
                className="w-full text-xs p-3 rounded-xl border border-[#E4E4E1] bg-white text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-tertiary"
              />
            </div>

            {/* Form Feedback Alert */}
            {formFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  formFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {formFeedback.type === 'success' ? (
                  <CheckCircle2 size={14} className="shrink-0" />
                ) : (
                  <AlertCircle size={14} className="shrink-0" />
                )}
                <span>{formFeedback.text}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#2e2e2e] transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting
                  ? 'Saving...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Submit Review'}
              </button>
            </div>
          </form>
        ) : (
          // Ineligible Callout
          <div className="bg-[#FAFAFA] border border-[#E4E4E1] rounded-xl p-4 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-secondary">
              <MessageSquare size={16} className="text-tertiary shrink-0" />
              <span>
                {eligibility.reason ||
                  (isEnrolled
                    ? 'Submit a review to share your thoughts on this course track.'
                    : 'Enroll in this course to share your rating and review.')}
              </span>
            </div>
            {!user ? (
              <Link
                to={`/login?redirect=/courses/${courseIdOrSlug}`}
                className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold hover:bg-[#2e2e2e] transition whitespace-nowrap"
              >
                Log In
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {/* Review List & Controls */}
      <div className="space-y-4 pt-4 border-t border-[#E4E4E1]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#171717]">
            Reviews ({total})
          </h3>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <span className="text-tertiary font-medium">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E4E4E1] bg-[#FAFAFA] text-primary font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchReviews(pagination.page)}
              className="font-bold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Reviews Listing */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 rounded-xl border border-[#E4E4E1] bg-[#FAFAFA] h-24" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 px-4 bg-[#FAFAFA] rounded-xl border border-dashed border-[#E4E4E1]">
            <Star size={24} className="text-tertiary mx-auto mb-2" />
            <h4 className="text-xs font-bold text-primary">No reviews published yet</h4>
            <p className="text-[11px] text-secondary mt-1">
              Be the first enrolled student to complete lessons and leave feedback for this course.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => {
              const authorInitials = rev.student?.name
                ? rev.student.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'ST';

              const formattedDate = new Date(rev.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <article
                  key={rev._id}
                  className="p-4 sm:p-5 rounded-xl border border-[#E4E4E1] bg-[#FAFAFA] hover:border-[#D4D4D0] transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {rev.student?.avatar ? (
                        <img
                          src={rev.student.avatar}
                          alt={rev.student.name}
                          className="w-8 h-8 rounded-full object-cover border border-[#E4E4E1]"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                          aria-hidden="true"
                        >
                          {authorInitials}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-primary">
                          {rev.student?.name || 'Verified Learner'}
                        </div>
                        <span className="text-[10px] text-tertiary">{formattedDate}</span>
                      </div>
                    </div>

                    <StarRatingDisplay rating={rev.rating} size={14} />
                  </div>

                  {rev.reviewText && (
                    <p className="text-xs text-secondary leading-relaxed pt-1">
                      {rev.reviewText}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#E4E4E1] text-xs">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchReviews(pagination.page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E4E4E1] bg-white text-secondary hover:text-primary transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span className="font-semibold text-tertiary">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchReviews(pagination.page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E4E4E1] bg-white text-secondary hover:text-primary transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
