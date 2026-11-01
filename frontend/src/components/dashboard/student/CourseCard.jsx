import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ArrowRight,
  Eye,
  Star,
  CheckCircle2,
  Award,
  Clock,
  Sparkles,
} from 'lucide-react';

const CATEGORY_STYLES = {
  Development: {
    badge: 'bg-cobalt-soft text-cobalt border-cobalt-border',
    accentBorder: 'hover:border-cobalt/40',
    gradient: 'from-cobalt-soft/70 to-surface-subtle',
    dot: 'bg-cobalt',
  },
  Design: {
    badge: 'bg-blue-100/70 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    accentBorder: 'hover:border-blue-400/40',
    gradient: 'from-blue-100/60 to-surface-subtle',
    dot: 'bg-blue-500',
  },
  Data: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
    accentBorder: 'hover:border-emerald-500/40',
    gradient: 'from-emerald-100/60 to-surface-subtle',
    dot: 'bg-emerald-600',
  },
  Business: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
    accentBorder: 'hover:border-amber-500/40',
    gradient: 'from-amber-100/60 to-surface-subtle',
    dot: 'bg-amber-600',
  },
  Other: {
    badge: 'bg-surface-subtle text-secondary border-border-subtle',
    accentBorder: 'hover:border-border-medium',
    gradient: 'from-surface-subtle to-surface',
    dot: 'bg-secondary',
  },
};

const getCategoryStyle = (category) => {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.Other;
};

export default function CourseCard({
  course = {},
  enrollment = null,
  variant = 'enrolled', // 'enrolled' | 'overview' | 'learning' | 'explore'
  showThumbnail = true,
  onViewCertificate,
  className = '',
}) {
  const c = course || {};
  const enr = enrollment || {};
  const courseSlug = c.slug || c._id || '';
  const totalLessons = enr.totalLessons ?? c.totalLessons ?? c.lessonsCount ?? 0;
  const completedLessons = enr.completedCount ?? 0;
  const rawProgress = enr.progressPercentage ?? (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);
  const progress = Math.min(100, Math.max(0, rawProgress));
  const duration = c.estimatedDuration || c.duration || '6 weeks';
  const instructorName = c.instructor?.name || 'Educator';
  const category = c.category || 'General';
  const catStyle = getCategoryStyle(category);

  // Determine enrollment states
  const isCompleted = progress >= 100 || enr.status === 'completed' || Boolean(enr.isCompleted);
  const isInProgress = !isCompleted && progress > 0;
  const isNotStarted = !isCompleted && progress === 0;

  const firstLessonTitle = enr.firstLessonTitle || (c.sections?.[0]?.lessons?.[0]?.title) || null;
  const nextLessonTitle = enr.nextLessonTitle || null;
  const certificateIssued = Boolean(enr.certificateIssued || enr.certificateId);
  const certificateId = enr.certificateId || null;

  // ----------------------------------------------------
  // Explore Catalog Variant
  // ----------------------------------------------------
  if (variant === 'explore') {
    const instructorInitials =
      instructorName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'LS';
    const descriptionText = c.summary || c.description || '';

    return (
      <article
        aria-label={`${c.title} course`}
        className={`group bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between ${catStyle.accentBorder} hover:shadow-card transition-all ${className}`}
      >
        <div>
          {/* Thumbnail / Gradient Cover */}
          <div className="h-36 w-full relative overflow-hidden bg-surface-subtle border-b border-border-subtle">
            {c.thumbnail ? (
              <img
                src={c.thumbnail}
                alt={c.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full bg-linear-to-br ${catStyle.gradient} flex flex-col items-center justify-center p-4 text-center`}>
                <div className="w-10 h-10 rounded-xl bg-surface/80 border border-border-subtle flex items-center justify-center text-cobalt mb-1.5 shadow-2xs">
                  <BookOpen size={20} />
                </div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                  {category}
                </span>
              </div>
            )}
            <span
              className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs border shadow-2xs ${catStyle.badge}`}
            >
              {category}
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2 text-[11px] text-tertiary">
              {c.level && (
                <span className="font-semibold px-2 py-0.5 rounded-md bg-surface-subtle text-secondary border border-border-subtle">
                  {c.level}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-medium">
                <Clock size={11} />
                <span>{duration}</span>
              </span>
            </div>

            <h3 className="text-sm font-bold text-primary mb-2 line-clamp-2 group-hover:text-cobalt transition-colors">
              <Link
                to={`/courses/${courseSlug}`}
                className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt rounded"
              >
                {c.title}
              </Link>
            </h3>

            <p className="text-xs text-secondary leading-relaxed line-clamp-3 mb-4">
              {descriptionText}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px] text-tertiary">
              <span className="inline-flex items-center gap-1 font-medium">
                <BookOpen size={12} />
                <span>{totalLessons} lessons</span>
              </span>
              {c.totalReviews > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>{Number(c.averageRating || 0).toFixed(1)}</span>
                  <span className="text-secondary font-normal">({c.totalReviews})</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-5 pt-0">
          <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6.5 h-6.5 rounded-full bg-cobalt text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {instructorInitials}
              </div>
              <span className="text-xs font-medium text-primary truncate max-w-[130px]">
                {instructorName}
              </span>
            </div>

            <Link
              to={`/courses/${courseSlug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle hover:bg-cobalt hover:text-white hover:border-cobalt active:bg-cobalt-pressed text-xs font-semibold text-primary transition-all cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
            >
              <Eye size={13} />
              <span>View Track</span>
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // ----------------------------------------------------
  // Enrolled Variants (Overview, My Learning, Enrolled)
  // ----------------------------------------------------
  const renderThumbnail = showThumbnail && (
    <div className="h-32 w-full relative overflow-hidden bg-surface-subtle border-b border-border-subtle">
      {c.thumbnail ? (
        <img
          src={c.thumbnail}
          alt={c.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full bg-linear-to-br ${catStyle.gradient} flex flex-col items-center justify-center p-3 text-center`}>
          <div className="w-9 h-9 rounded-xl bg-surface/80 border border-border-subtle flex items-center justify-center text-cobalt mb-1 shadow-2xs">
            <BookOpen size={18} />
          </div>
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
            {category}
          </span>
        </div>
      )}

      {/* Badges on Thumbnail */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs border shadow-2xs ${catStyle.badge}`}
        >
          {category}
        </span>

        {isCompleted ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
            <CheckCircle2 size={11} strokeWidth={2.5} />
            <span>Completed</span>
          </span>
        ) : isNotStarted ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface/90 text-secondary border border-border-subtle shadow-2xs">
            Not Started
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface/90 text-cobalt border border-cobalt-border shadow-2xs">
            {progress}% completed
          </span>
        )}
      </div>
    </div>
  );

  return (
    <article
      aria-label={`${c.title} - ${isCompleted ? 'Completed' : isNotStarted ? 'Not started' : `${progress}% completed`}`}
      className={`group bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between ${catStyle.accentBorder} hover:shadow-card transition-all ${className}`}
    >
      <div>
        {renderThumbnail}

        <div className="p-5">
          {/* If thumbnail is hidden (e.g. compact variant), show category and status row */}
          {!showThumbnail && (
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${catStyle.badge}`}
              >
                {category}
              </span>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                  <span>Completed</span>
                </span>
              ) : (
                <span className="text-[11px] text-secondary font-medium">
                  {isNotStarted ? 'Not Started' : `${progress}% completed`}
                </span>
              )}
            </div>
          )}

          <h3 className="font-bold text-sm text-primary mb-1 line-clamp-1 group-hover:text-cobalt transition-colors">
            <Link
              to={`/courses/${courseSlug}`}
              className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt rounded"
            >
              {c.title}
            </Link>
          </h3>
          <p className="text-xs text-secondary mb-3">
            Instructor: {instructorName}
          </p>

          {/* Progress Section */}
          <div className="space-y-2 mb-2">
            <div
              role="progressbar"
              aria-label={`${c.title} completion progress: ${progress}%`}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-1.5 bg-surface-subtle border border-border-subtle rounded-full overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-600' : 'bg-cobalt'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-tertiary">
              <span>
                {isCompleted
                  ? `${totalLessons} of ${totalLessons} lessons finished`
                  : isNotStarted
                  ? `0 of ${totalLessons} lessons finished`
                  : `${completedLessons} of ${totalLessons} lessons finished`}
              </span>
              <span>{duration}</span>
            </div>
          </div>

          {/* Contextual Lesson Subtitle */}
          {isNotStarted && firstLessonTitle && (
            <p className="text-[11px] text-secondary truncate mt-1">
              First lesson: <span className="font-semibold text-primary">{firstLessonTitle}</span>
            </p>
          )}

          {isInProgress && nextLessonTitle && (
            <p className="text-[11px] text-secondary truncate mt-1">
              Next: <span className="font-semibold text-primary">{nextLessonTitle}</span>
            </p>
          )}

          {isCompleted && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1 mt-1">
              <Sparkles size={11} />
              <span>Course curriculum completed!</span>
            </p>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 py-3 bg-surface-subtle border-t border-border-subtle flex items-center justify-between gap-2">
        {/* State: 100% / COMPLETED */}
        {isCompleted ? (
          <>
            {certificateIssued ? (
              <>
                <Link
                  to={`/courses/${courseSlug}`}
                  className="text-xs font-semibold text-secondary hover:text-primary transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt rounded"
                >
                  Review Course
                </Link>
                <Link
                  to={certificateId ? `/verify/${certificateId}` : '/student/dashboard'}
                  onClick={onViewCertificate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
                >
                  <Award size={13} />
                  <span>View Certificate</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={`/courses/${courseSlug}`}
                  className="text-xs font-semibold text-secondary hover:text-primary transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt rounded"
                >
                  Course Details
                </Link>
                <Link
                  to={`/courses/${courseSlug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
                >
                  <Star size={13} />
                  <span>Review Course</span>
                </Link>
              </>
            )}
          </>
        ) : isNotStarted ? (
          /* State: 0% / NOT STARTED */
          <>
            <Link
              to={`/courses/${courseSlug}`}
              className="text-xs font-semibold text-secondary hover:text-primary transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt rounded"
            >
              Course Details
            </Link>
            <Link
              to={`/courses/${courseSlug}/learn`}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 hover-lift btn-press transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
            >
              <span>Start Course</span>
              <ArrowRight size={13} strokeWidth={1.75} className="group-hover-nudge-x" />
            </Link>
          </>
        ) : (
          /* State: 1-99% / IN PROGRESS */
          <>
            <Link
              to={`/courses/${courseSlug}`}
              className="text-xs font-semibold text-secondary hover:text-primary transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt rounded"
            >
              Course Details
            </Link>
            <Link
              to={`/courses/${courseSlug}/learn`}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 hover-lift btn-press transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
            >
              <span>Continue Learning</span>
              <ArrowRight size={13} strokeWidth={1.75} className="group-hover-nudge-x" />
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
