/**
 * Centralized Social Media Configuration for LearnSpace LMS
 * Official social media profiles can be configured via environment variables
 * or updated directly in this configuration module.
 */

export const SOCIAL_LINKS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    handle: '@learnspace-lms',
    url: import.meta.env.VITE_SOCIAL_LINKEDIN_URL || 'https://linkedin.com/company/learnspace-lms',
    ariaLabel: 'Visit LearnSpace on LinkedIn (opens in new tab)',
  },
  {
    id: 'github',
    name: 'GitHub',
    handle: '@lohith2605',
    url: import.meta.env.VITE_SOCIAL_GITHUB_URL || 'https://github.com/lohith2605/LMS-portal',
    ariaLabel: 'Visit LearnSpace repository on GitHub (opens in new tab)',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@learnspace_lms',
    url: import.meta.env.VITE_SOCIAL_YOUTUBE_URL || 'https://youtube.com/@learnspace-lms',
    ariaLabel: 'Visit LearnSpace on YouTube (opens in new tab)',
  },
  {
    id: 'twitter',
    name: 'X (formerly Twitter)',
    handle: '@learnspace_lms',
    url: import.meta.env.VITE_SOCIAL_TWITTER_URL || 'https://x.com/learnspace_lms',
    ariaLabel: 'Visit LearnSpace on X (opens in new tab)',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: '@learnspace.lms',
    url: import.meta.env.VITE_SOCIAL_FACEBOOK_URL || 'https://facebook.com/learnspace.lms',
    ariaLabel: 'Visit LearnSpace on Facebook (opens in new tab)',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@learnspace_lms',
    url: import.meta.env.VITE_SOCIAL_INSTAGRAM_URL || 'https://instagram.com/learnspace_lms',
    ariaLabel: 'Visit LearnSpace on Instagram (opens in new tab)',
  },
];

export const CONTACT_INFO = {
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@learnspace.io',
  hours: 'Monday – Friday: 9:00 AM – 6:00 PM UTC',
  location: 'Global Learning Cloud & Academic Network',
};
