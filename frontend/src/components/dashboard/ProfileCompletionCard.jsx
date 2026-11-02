import React from 'react';
import {
  Camera,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import AnimatedProgressBar from '../ui/AnimatedProgressBar';
import { calculateProfileCompletion } from '../../utils/profileCompletion';

export default function ProfileCompletionCard({
  user,
  onOpenEditProfile,
  onOpenAvatarModal,
  className = '',
}) {
  if (!user) return null;

  const completion = calculateProfileCompletion(user);
  const {
    percentage,
    completedCount,
    totalCount,
    isComplete,
    incompleteItems,
    role,
  } = completion;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleItemClick = (item) => {
    if (item.actionType === 'avatar_modal') {
      if (onOpenAvatarModal) onOpenAvatarModal();
    } else {
      if (onOpenEditProfile) onOpenEditProfile(item.field);
    }
  };

  const handlePrimaryAction = () => {
    if (isComplete) {
      if (onOpenEditProfile) onOpenEditProfile('headline');
      return;
    }

    // Direct user to the first incomplete item
    const firstIncomplete = incompleteItems[0];
    if (firstIncomplete) {
      handleItemClick(firstIncomplete);
    } else {
      if (onOpenEditProfile) onOpenEditProfile('headline');
    }
  };

  return (
    <section
      aria-label="Profile Completion"
      className={`bg-surface border border-border-subtle rounded-3xl p-5 sm:p-6 lg:p-7 shadow-xs transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Left Column: Avatar + Overview + Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-4">
            {/* Avatar with click-to-edit action */}
            <button
              type="button"
              onClick={onOpenAvatarModal}
              title="Click to update profile photo"
              className="relative group shrink-0 focus:outline-none focus:ring-2 focus:ring-cobalt rounded-2xl cursor-pointer"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-sm sm:text-base overflow-hidden ring-2 ring-border-subtle group-hover:ring-cobalt transition-all">
                {user?.avatar?.url ? (
                  <img
                    src={user.avatar.url}
                    alt={user?.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 p-1 rounded-lg border shadow-2xs transition-transform group-hover:scale-110 ${
                  isComplete
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-800'
                    : 'bg-surface border-border-subtle text-secondary group-hover:text-primary'
                }`}
              >
                {isComplete ? <CheckCircle2 size={12} strokeWidth={2.5} /> : <Camera size={12} />}
              </div>
            </button>

            {/* Title & Explanation */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm sm:text-base font-extrabold text-primary tracking-tight">
                  {isComplete ? 'Your profile is complete' : 'Complete your profile'}
                </h3>
                {isComplete ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck size={11} strokeWidth={2} />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cobalt-soft text-cobalt text-[10px] font-bold">
                    Setup In Progress
                  </span>
                )}
              </div>

              <p className="text-xs text-secondary leading-relaxed">
                {isComplete
                  ? role === 'instructor'
                    ? 'Your educator credentials and profile are fully visible to prospective students.'
                    : 'Your learner profile is fully personalized and ready for cohort collaboration.'
                  : role === 'instructor'
                  ? 'Add your credentials, biography, and subject expertise to build trust with students.'
                  : 'Add a few details to personalize your LearnSpace experience and learning record.'}
              </p>

              {/* Progress Summary and Bar */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-primary">
                    <span className="text-cobalt">{percentage}%</span> complete
                  </span>
                  <span className="text-tertiary text-[11px] font-medium">
                    {completedCount} of {totalCount} items completed
                  </span>
                </div>

                <AnimatedProgressBar
                  progress={percentage}
                  height="h-2"
                  colorClass={isComplete ? 'bg-emerald-600' : 'bg-cobalt'}
                  ariaLabel={`Profile completion ${percentage} percent`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Primary Action */}
        <div className="flex items-center shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className={`group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer hover-lift btn-press ${
              isComplete
                ? 'bg-surface hover:bg-surface-subtle text-primary border border-border-subtle hover:border-border-medium'
                : 'bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-cobalt/25'
            }`}
          >
            <span>{isComplete ? 'Edit Profile Details' : 'Complete Profile'}</span>
            <ArrowRight size={14} className="group-hover-nudge-x" />
          </button>
        </div>
      </div>
    </section>
  );
}
