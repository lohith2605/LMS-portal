/**
 * Centralized Social Media Configuration for LearnSpace LMS
 * Official social media profiles can be configured via environment variables
 * or updated directly in this configuration module.
 */

export const SOCIAL_LINKS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    // Set to official URL or leave null/placeholder
    url: import.meta.env.VITE_SOCIAL_LINKEDIN_URL || null,
    ariaLabel: 'Visit LearnSpace on LinkedIn (opens in new tab)',
    placeholderNote: 'Official LinkedIn handle pending verification',
  },
  {
    id: 'github',
    name: 'GitHub',
    url: import.meta.env.VITE_SOCIAL_GITHUB_URL || 'https://github.com/lohith2605/LMS-portal',
    ariaLabel: 'Visit LearnSpace repository on GitHub (opens in new tab)',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: import.meta.env.VITE_SOCIAL_YOUTUBE_URL || null,
    ariaLabel: 'Visit LearnSpace on YouTube (opens in new tab)',
    placeholderNote: 'Official YouTube channel pending verification',
  },
  {
    id: 'twitter',
    name: 'X (formerly Twitter)',
    url: import.meta.env.VITE_SOCIAL_TWITTER_URL || null,
    ariaLabel: 'Visit LearnSpace on X (opens in new tab)',
    placeholderNote: 'Official X handle pending verification',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    url: import.meta.env.VITE_SOCIAL_FACEBOOK_URL || null,
    ariaLabel: 'Visit LearnSpace on Facebook (opens in new tab)',
    placeholderNote: 'Official Facebook page pending verification',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: import.meta.env.VITE_SOCIAL_INSTAGRAM_URL || null,
    ariaLabel: 'Visit LearnSpace on Instagram (opens in new tab)',
    placeholderNote: 'Official Instagram profile pending verification',
  },
];

export const CONTACT_INFO = {
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@learnspace.io',
  hours: 'Monday – Friday: 9:00 AM – 6:00 PM UTC',
  location: 'Global Learning Cloud & Academic Network',
};
