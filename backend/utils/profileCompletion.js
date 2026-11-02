/**
 * Profile Completion Utility
 * Computes deterministic, role-specific profile completion metrics for students and instructors.
 */

/**
 * Validates whether an avatar URL represents a real uploaded image
 * rather than a placeholder, default, or empty value.
 * @param {Object|string|null} avatar
 * @returns {boolean}
 */
const isValidAvatar = (avatar) => {
  if (!avatar) return false;
  const url = typeof avatar === 'string' ? avatar : avatar.url;
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 5) return false;
  if (
    trimmed.includes('placeholder') ||
    trimmed.includes('default-avatar') ||
    trimmed.includes('via.placeholder') ||
    trimmed.includes('avatar-placeholder')
  ) {
    return false;
  }
  return true;
};

/**
 * Calculates profile completion metrics for a given user.
 * @param {Object} user - Sanitized user object or User mongoose document
 * @returns {Object} Calculated completion metrics
 */
const calculateProfileCompletion = (user) => {
  if (!user || typeof user !== 'object') {
    return {
      percentage: 0,
      completedCount: 0,
      totalCount: 6,
      isComplete: false,
      items: [],
      incompleteItems: [],
      suggestedItems: [],
    };
  }

  const role = user.role === 'instructor' ? 'instructor' : 'student';

  // Extract fields safely
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  const headline = typeof user.headline === 'string' ? user.headline.trim() : '';
  const bio = typeof user.bio === 'string' ? user.bio.trim() : '';
  const education = typeof user.education === 'string' ? user.education.trim() : '';
  const experience = typeof user.experience === 'string' ? user.experience.trim() : '';
  const rawSkills = Array.isArray(user.skills) ? user.skills : [];
  const validSkills = rawSkills.filter(
    (s) => typeof s === 'string' && s.trim().length > 0
  );

  // Define completion status for each criteria
  const isNameComplete = name.length >= 2;
  const isAvatarComplete = isValidAvatar(user.avatar);
  const isHeadlineComplete = headline.length >= 3;
  const isBioComplete = bio.length >= 10;
  const isSkillsComplete = validSkills.length >= 1;

  let items = [];

  if (role === 'instructor') {
    const isExperienceComplete = experience.length >= 3;

    items = [
      {
        id: 'name',
        label: 'Full Name',
        suggestion: 'Provide your full name',
        completed: isNameComplete,
        field: 'name',
        actionType: 'profile_modal',
      },
      {
        id: 'avatar',
        label: 'Profile Photo',
        suggestion: 'Upload a professional photo',
        completed: isAvatarComplete,
        field: 'avatar',
        actionType: 'avatar_modal',
      },
      {
        id: 'headline',
        label: 'Professional Title',
        suggestion: 'Add your professional title',
        completed: isHeadlineComplete,
        field: 'headline',
        actionType: 'profile_modal',
      },
      {
        id: 'bio',
        label: 'Professional Biography',
        suggestion: 'Write a professional biography',
        completed: isBioComplete,
        field: 'bio',
        actionType: 'profile_modal',
      },
      {
        id: 'skills',
        label: 'Subject Expertise',
        suggestion: 'List your teaching areas & expertise',
        completed: isSkillsComplete,
        field: 'skills',
        actionType: 'profile_modal',
      },
      {
        id: 'experience',
        label: 'Experience & Qualifications',
        suggestion: 'Add industry experience & credentials',
        completed: isExperienceComplete,
        field: 'experience',
        actionType: 'profile_modal',
      },
    ];
  } else {
    // Student role
    const isEducationComplete = education.length >= 3;

    items = [
      {
        id: 'name',
        label: 'Full Name',
        suggestion: 'Provide your full name',
        completed: isNameComplete,
        field: 'name',
        actionType: 'profile_modal',
      },
      {
        id: 'avatar',
        label: 'Profile Photo',
        suggestion: 'Upload a profile photo',
        completed: isAvatarComplete,
        field: 'avatar',
        actionType: 'avatar_modal',
      },
      {
        id: 'headline',
        label: 'Student Headline',
        suggestion: 'Add a student headline or focus',
        completed: isHeadlineComplete,
        field: 'headline',
        actionType: 'profile_modal',
      },
      {
        id: 'bio',
        label: 'Introduction / Bio',
        suggestion: 'Write a short personal introduction',
        completed: isBioComplete,
        field: 'bio',
        actionType: 'profile_modal',
      },
      {
        id: 'skills',
        label: 'Learning Interests & Skills',
        suggestion: 'Add skills or learning topics of interest',
        completed: isSkillsComplete,
        field: 'skills',
        actionType: 'profile_modal',
      },
      {
        id: 'education',
        label: 'Academic / Education Details',
        suggestion: 'Add your university, school, or degree',
        completed: isEducationComplete,
        field: 'education',
        actionType: 'profile_modal',
      },
    ];
  }

  const totalCount = items.length;
  const completedCount = items.filter((item) => item.completed).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const incompleteItems = items.filter((item) => !item.completed);
  const suggestedItems = incompleteItems.slice(0, 3);
  const isComplete = completedCount === totalCount && totalCount > 0;

  return {
    role,
    percentage,
    completedCount,
    totalCount,
    isComplete,
    items,
    incompleteItems,
    suggestedItems,
  };
};

module.exports = {
  isValidAvatar,
  calculateProfileCompletion,
};

