import React from 'react';
import {
  Mail,
  Camera,
  Edit3,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Sparkles,
  Plus,
} from 'lucide-react';
import { calculateProfileCompletion } from '../../utils/profileCompletion';
import AnimatedProgressBar from '../ui/AnimatedProgressBar';

export default function ProfileView({
  user,
  onOpenEditProfile,
  onOpenAvatarModal,
  className = '',
}) {
  if (!user) {
    return (
      <div className="bg-surface border border-border-subtle rounded-3xl p-8 text-center">
        <p className="text-sm text-secondary">Loading profile information...</p>
      </div>
    );
  }

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

  const roleLabels = {
    admin: 'Administrator',
    instructor: 'Instructor',
    student: 'Student',
  };

  const roleStyles = {
    admin: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300',
    instructor: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
    student: 'bg-cobalt-soft text-cobalt border-cobalt-border/50 dark:bg-cobalt/20 dark:border-cobalt/40 dark:text-accent-blue',
  };

  const avatarUrl = user?.avatar?.url;
  const skillsList = Array.isArray(user?.skills) ? user.skills.filter(Boolean) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ========================================================= */}
      {/* 1. HERO / PROFILE HEADER                                  */}
      {/* ========================================================= */}
      <section
        aria-label="Profile Header"
        className="bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5 min-w-0">
            {/* Avatar with Change Photo action */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={onOpenAvatarModal}
                title="Change profile photo"
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-primary text-white flex items-center justify-center font-extrabold text-xl overflow-hidden ring-2 ring-border-subtle group-hover:ring-cobalt transition-all cursor-pointer shadow-card focus:outline-none focus:ring-2 focus:ring-cobalt"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera size={20} />
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenAvatarModal}
                title="Change photo"
                aria-label="Change photo"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-surface border border-border-subtle text-secondary hover:text-cobalt hover:border-cobalt/40 shadow-xs transition-colors cursor-pointer"
              >
                <Camera size={13} />
              </button>
            </div>

            {/* Name, Role & Email */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight truncate">
                  {user.name}
                </h1>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    roleStyles[user.role] || roleStyles.student
                  }`}
                >
                  {roleLabels[user.role] || user.role}
                </span>
              </div>

              {user.email && (
                <div className="flex items-center gap-1.5 text-xs text-secondary mt-1 truncate">
                  <Mail size={13} className="shrink-0 text-tertiary" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}

              {user.headline ? (
                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-2 line-clamp-2 max-w-xl">
                  {user.headline}
                </p>
              ) : (
                <p className="text-xs text-tertiary italic mt-2">
                  {role === 'instructor'
                    ? 'No professional title provided yet.'
                    : 'No learning focus provided yet.'}
                </p>
              )}
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => onOpenEditProfile('headline')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 transition-all cursor-pointer hover-lift"
            >
              <Edit3 size={13} />
              <span>Edit Profile Details</span>
            </button>
            <button
              type="button"
              onClick={onOpenAvatarModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-secondary hover:text-primary hover:bg-surface-subtle text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Camera size={13} />
              <span className="hidden sm:inline">Change Photo</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. PROFILE COMPLETION STATUS                              */}
      {/* ========================================================= */}
      <section
        aria-label="Profile Completeness Status"
        className="bg-surface border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs"
      >
        {isComplete ? (
          /* Compact Completed State: No oversized card, no false verification badge */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 size={20} strokeWidth={2.25} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-primary">
                    Profile 100% Complete
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80">
                    <CheckCircle2 size={10} strokeWidth={2.5} />
                    <span>Complete</span>
                  </span>
                </div>
                <p className="text-xs text-secondary mt-0.5">
                  All {totalCount} profile criteria are fulfilled. Your profile information is up to date and active.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenEditProfile('headline')}
              className="text-xs font-semibold text-cobalt hover:text-cobalt-hover hover:underline shrink-0 text-left sm:text-right"
            >
              Update information &rarr;
            </button>
          </div>
        ) : (
          /* Incomplete State: Clear breakdown of remaining criteria */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-primary">
                    Profile Completeness
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cobalt-soft text-cobalt">
                    {completedCount} of {totalCount} completed
                  </span>
                </div>
                <p className="text-xs text-secondary mt-0.5">
                  Complete outstanding items to personalize your learning profile and verify your account details.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-cobalt">{percentage}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <AnimatedProgressBar
              progress={percentage}
              height="h-2"
              colorClass="bg-cobalt"
              ariaLabel={`Profile completion ${percentage} percent`}
            />

            {/* Incomplete Item Suggestions */}
            {incompleteItems.length > 0 && (
              <div className="pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-2.5">
                  Recommended Next Steps
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {incompleteItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.actionType === 'avatar_modal') {
                          onOpenAvatarModal();
                        } else {
                          onOpenEditProfile(item.field);
                        }
                      }}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-surface-subtle/50 hover:bg-surface-subtle hover:border-cobalt/40 transition-all text-left cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-primary group-hover:text-cobalt transition-colors truncate">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-tertiary truncate">
                          {item.suggestion}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cobalt shrink-0">
                        <span>Add</span>
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 3. PROFILE INFORMATION DETAILS                            */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Spans 2 cols): Bio, Headline, Skills */}
        <div className="lg:col-span-2 space-y-6">
          {/* Headline / Title */}
          <section className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                {role === 'instructor' ? 'Professional Title / Headline' : 'Headline & Focus'}
              </h3>
              <button
                type="button"
                onClick={() => onOpenEditProfile('headline')}
                className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
              >
                <Edit3 size={12} />
                <span>Edit</span>
              </button>
            </div>
            {user.headline ? (
              <p className="text-sm text-primary leading-relaxed">{user.headline}</p>
            ) : (
              <div className="py-4 text-center border border-dashed border-border-subtle rounded-2xl">
                <p className="text-xs text-tertiary mb-2">No headline added yet.</p>
                <button
                  type="button"
                  onClick={() => onOpenEditProfile('headline')}
                  className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Headline</span>
                </button>
              </div>
            )}
          </section>

          {/* Biography / Personal Introduction */}
          <section className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                {role === 'instructor' ? 'Professional Biography' : 'Personal Introduction / Bio'}
              </h3>
              <button
                type="button"
                onClick={() => onOpenEditProfile('bio')}
                className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
              >
                <Edit3 size={12} />
                <span>Edit</span>
              </button>
            </div>
            {user.bio ? (
              <p className="text-sm text-primary leading-relaxed whitespace-pre-line">{user.bio}</p>
            ) : (
              <div className="py-6 text-center border border-dashed border-border-subtle rounded-2xl">
                <p className="text-xs text-tertiary mb-2">
                  {role === 'instructor'
                    ? 'Introduce yourself, your teaching philosophy, and background.'
                    : 'Share a brief introduction, your learning goals, and what you aim to achieve.'}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenEditProfile('bio')}
                  className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Write Biography</span>
                </button>
              </div>
            )}
          </section>

          {/* Skills and Learning Interests */}
          <section className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                {role === 'instructor' ? 'Subject Expertise & Teaching Areas' : 'Skills & Learning Interests'}
              </h3>
              <button
                type="button"
                onClick={() => onOpenEditProfile('skills')}
                className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
              >
                <Edit3 size={12} />
                <span>Edit</span>
              </button>
            </div>
            {skillsList.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {skillsList.map((skill, idx) => (
                  <span
                    key={`${skill}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-semibold text-primary"
                  >
                    <Sparkles size={12} className="text-cobalt" />
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center border border-dashed border-border-subtle rounded-2xl">
                <p className="text-xs text-tertiary mb-2">No skills or topics added yet.</p>
                <button
                  type="button"
                  onClick={() => onOpenEditProfile('skills')}
                  className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Skills</span>
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Academic / Professional Background & Account Details */}
        <div className="space-y-6">
          {/* Role-Specific Background: Education for Student, Experience for Instructor */}
          <section className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {role === 'instructor' ? (
                  <Briefcase size={15} className="text-cobalt" />
                ) : (
                  <GraduationCap size={15} className="text-cobalt" />
                )}
                <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  {role === 'instructor' ? 'Industry Experience' : 'Academic Education'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenEditProfile(role === 'instructor' ? 'experience' : 'education')}
                className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
              >
                <Edit3 size={12} />
                <span>Edit</span>
              </button>
            </div>

            {role === 'instructor' ? (
              user.experience ? (
                <p className="text-sm text-primary leading-relaxed">{user.experience}</p>
              ) : (
                <div className="py-4 text-center border border-dashed border-border-subtle rounded-2xl">
                  <p className="text-xs text-tertiary mb-2">No experience listed yet.</p>
                  <button
                    type="button"
                    onClick={() => onOpenEditProfile('experience')}
                    className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Add Experience</span>
                  </button>
                </div>
              )
            ) : user.education ? (
              <p className="text-sm text-primary leading-relaxed">{user.education}</p>
            ) : (
              <div className="py-4 text-center border border-dashed border-border-subtle rounded-2xl">
                <p className="text-xs text-tertiary mb-2">No education listed yet.</p>
                <button
                  type="button"
                  onClick={() => onOpenEditProfile('education')}
                  className="text-xs font-semibold text-cobalt hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Education</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
