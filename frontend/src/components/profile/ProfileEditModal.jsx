import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/useAuth';

export default function ProfileEditModal({
  isOpen,
  onClose,
  initialField = 'headline',
  onOpenAvatarModal,
}) {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const nameInputRef = useRef(null);
  const headlineInputRef = useRef(null);
  const bioInputRef = useRef(null);
  const skillInputRef = useRef(null);
  const educationInputRef = useRef(null);
  const experienceInputRef = useRef(null);

  const role = user?.role === 'instructor' ? 'instructor' : 'student';

  // Synchronize form state from user object when opened
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setHeadline(user.headline || '');
      setBio(user.bio || '');
      setSkills(Array.isArray(user.skills) ? [...user.skills] : []);
      setSkillInput('');
      setEducation(user.education || '');
      setExperience(user.experience || '');
      setErrorMessage('');
      setSuccessMessage('');

      // Auto-focus requested field
      setTimeout(() => {
        if (initialField === 'name' && nameInputRef.current) {
          nameInputRef.current.focus();
        } else if (initialField === 'headline' && headlineInputRef.current) {
          headlineInputRef.current.focus();
        } else if (initialField === 'bio' && bioInputRef.current) {
          bioInputRef.current.focus();
        } else if (initialField === 'skills' && skillInputRef.current) {
          skillInputRef.current.focus();
        } else if (initialField === 'education' && educationInputRef.current) {
          educationInputRef.current.focus();
        } else if (initialField === 'experience' && experienceInputRef.current) {
          experienceInputRef.current.focus();
        } else if (headlineInputRef.current) {
          headlineInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, user, initialField]);

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Body scroll locking when open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    const trimmed = skillInput.trim();
    if (!trimmed) return;

    // Handle comma-separated skills entry
    const parts = trimmed
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const merged = [...skills];
    parts.forEach((item) => {
      if (!merged.some((existing) => existing.toLowerCase() === item.toLowerCase()) && merged.length < 20) {
        merged.push(item);
      }
    });

    setSkills(merged);
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleKeyDownSkill = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: trimmedName,
        headline: headline.trim(),
        bio: bio.trim(),
        skills,
        education: education.trim(),
        experience: experience.trim(),
      };

      const res = await authService.updateProfile(payload);

      if (res && res.user) {
        updateUser(res.user);
        setSuccessMessage('Profile details saved successfully.');
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error || err.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-edit-modal-title"
    >
      <div className="bg-surface border border-border-subtle rounded-3xl shadow-elevated w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-[modalSlideUp_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-border-subtle bg-surface-subtle/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cobalt-soft border border-cobalt-border/50 text-cobalt flex items-center justify-center">
              <User size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 id="profile-edit-modal-title" className="text-base sm:text-lg font-bold text-primary">
                Edit Profile Details
              </h2>
              <p className="text-xs text-secondary">
                {role === 'instructor'
                  ? 'Update your teaching credentials, background, and expertise'
                  : 'Update your student details, learning interests, and academic background'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Messages */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium"
            >
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
            >
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Avatar Shortcut Callout */}
          {onOpenAvatarModal && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-subtle border border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                  {user?.avatar?.url ? (
                    <img src={user.avatar.url} alt={user?.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.slice(0, 2).toUpperCase() || 'U'
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-primary">Profile Photo</div>
                  <div className="text-[11px] text-secondary">
                    {user?.avatar?.url ? 'Custom photo uploaded' : 'No photo uploaded yet'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAvatarModal();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-xs font-semibold text-primary shadow-2xs transition-colors cursor-pointer"
              >
                <Camera size={13} className="text-cobalt" />
                <span>{user?.avatar?.url ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="edit-profile-name" className="block text-xs font-bold text-primary mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-profile-name"
              ref={nameInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt transition-colors"
            />
          </div>

          {/* Headline / Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="edit-profile-headline" className="block text-xs font-bold text-primary">
                {role === 'instructor' ? 'Professional Title / Role' : 'Headline / Learning Focus'}
              </label>
              <span className="text-[11px] text-tertiary">{headline.length}/140</span>
            </div>
            <input
              id="edit-profile-headline"
              ref={headlineInputRef}
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={
                role === 'instructor'
                  ? 'e.g. Senior Software Architect & Technical Curriculum Author'
                  : 'e.g. Computer Science Undergraduate & Aspiring Full-Stack Developer'
              }
              maxLength={140}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt transition-colors"
            />
          </div>

          {/* Bio / Biography */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="edit-profile-bio" className="block text-xs font-bold text-primary">
                {role === 'instructor' ? 'Professional Biography' : 'Personal Introduction / Bio'}
              </label>
              <span className="text-[11px] text-tertiary">{bio.length}/1500</span>
            </div>
            <textarea
              id="edit-profile-bio"
              ref={bioInputRef}
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={
                role === 'instructor'
                  ? 'Share your industry background, teaching philosophy, and what students will achieve in your courses...'
                  : 'Introduce yourself, what you are studying, your career aspirations, and what excites you about learning...'
              }
              maxLength={1500}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt transition-colors resize-y leading-relaxed"
            />
            <p className="text-[11px] text-tertiary mt-1">
              Minimum 10 characters recommended for complete profile verification.
            </p>
          </div>

          {/* Skills / Interests */}
          <div>
            <label htmlFor="edit-profile-skills-input" className="block text-xs font-bold text-primary mb-1.5">
              {role === 'instructor' ? 'Subject Expertise & Teaching Areas' : 'Learning Interests & Skills'}
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                id="edit-profile-skills-input"
                ref={skillInputRef}
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleKeyDownSkill}
                placeholder={
                  role === 'instructor'
                    ? 'e.g. Cloud Computing, Kubernetes, React'
                    : 'e.g. JavaScript, Python, Data Science'
                }
                className="flex-1 px-3.5 py-2 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt transition-colors"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover transition-colors cursor-pointer shrink-0"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>

            {/* Rendered Skill Chips */}
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-surface-subtle border border-border-subtle">
                {skills.map((skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cobalt-soft border border-cobalt-border/50 text-cobalt text-xs font-medium"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      aria-label={`Remove skill ${skill}`}
                      className="text-cobalt/70 hover:text-cobalt cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-tertiary">
                No skills added yet. Type a skill or topic and press Enter or Add.
              </p>
            )}
          </div>

          {/* Role-Specific Background Detail */}
          {role === 'instructor' ? (
            <div>
              <label htmlFor="edit-profile-experience" className="block text-xs font-bold text-primary mb-1.5">
                Industry Experience & Qualifications
              </label>
              <input
                id="edit-profile-experience"
                ref={experienceInputRef}
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 10+ years principal engineer at AWS & accredited technical educator"
                maxLength={240}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt transition-colors"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="edit-profile-education" className="block text-xs font-bold text-primary mb-1.5">
                Academic & Education Details
              </label>
              <input
                id="edit-profile-education"
                ref={educationInputRef}
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. B.S. in Computer Science - University of California, Berkeley"
                maxLength={240}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface text-primary text-xs focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt transition-colors"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile Details</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
