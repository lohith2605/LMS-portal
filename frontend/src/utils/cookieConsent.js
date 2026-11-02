/**
 * Cookie Consent & Preferences Management Utility — LearnSpace LMS
 *
 * Implements privacy-by-default consent management in accordance with
 * GDPR / ePrivacy directives without interfering with essential HttpOnly authentication.
 */

export const CONSENT_STORAGE_KEY = 'learnspace_cookie_consent';
export const CONSENT_POLICY_VERSION = '1.0.0';
export const CONSENT_CHANGE_EVENT = 'learnspace-consent-change';

/**
 * Category Metadata for UI and Policy pages
 */
export const COOKIE_CATEGORIES = {
  ESSENTIAL: 'essential',
  PREFERENCES: 'preferences',
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
};

export const CATEGORY_DETAILS = {
  [COOKIE_CATEGORIES.ESSENTIAL]: {
    id: COOKIE_CATEGORIES.ESSENTIAL,
    name: 'Strictly Essential Cookies & Storage',
    required: true,
    defaultState: true,
    shortDescription: 'Required for core authentication, platform security, and session management.',
    longDescription:
      'These technical cookies and storage entries are essential for LearnSpace to function securely. They enable authentication via HttpOnly session cookies, maintain CSRF protections, allow Firebase Google Sign-In, and remember your cookie consent preferences.',
    cookiesList: [
      {
        name: 'jwt',
        provider: 'LearnSpace Backend (First-party)',
        type: 'HttpOnly Secure Cookie',
        duration: '7 days (or session)',
        purpose: 'Maintains authenticated learner/instructor session with cryptographic verification.',
      },
      {
        name: 'learnspace_cookie_consent',
        provider: 'LearnSpace (Local Storage)',
        type: 'Local Storage',
        duration: '1 year',
        purpose: 'Remembers your consent and cookie category choices.',
      },
      {
        name: 'learnspace_streak_celebrated_*',
        provider: 'LearnSpace (Session Storage)',
        type: 'Session Storage',
        duration: 'Current browser tab session',
        purpose: 'Prevents repeated streak celebration animations within the same active learning session.',
      },
      {
        name: '__Secure-* / Firebase Auth Tokens',
        provider: 'Google Firebase Auth',
        type: 'Session Storage / IndexedDB',
        duration: 'Session',
        purpose: 'Facilitates secure Google federated sign-in token exchange.',
      },
    ],
  },
  [COOKIE_CATEGORIES.PREFERENCES]: {
    id: COOKIE_CATEGORIES.PREFERENCES,
    name: 'Preferences & Display Settings',
    required: false,
    defaultState: false,
    shortDescription: 'Saves your UI preferences, such as light/dark mode and collapsed sidebar state.',
    longDescription:
      'These entries enable the platform to remember your personalized display choices between visits, such as your selected theme (dark or light mode) and your preferred dashboard sidebar layout.',
    cookiesList: [
      {
        name: 'learnspace-theme',
        provider: 'LearnSpace (Local Storage)',
        type: 'Local Storage',
        duration: 'Persistent until cleared',
        purpose: 'Stores your preferred light or dark theme mode.',
      },
      {
        name: 'learnspace_sidebar_collapsed',
        provider: 'LearnSpace (Local Storage)',
        type: 'Local Storage',
        duration: 'Persistent until cleared',
        purpose: 'Remembers whether the dashboard sidebar was collapsed or expanded.',
      },
    ],
  },
  [COOKIE_CATEGORIES.ANALYTICS]: {
    id: COOKIE_CATEGORIES.ANALYTICS,
    name: 'Analytics & Performance',
    required: false,
    defaultState: false,
    shortDescription: 'Measures course navigation and platform performance to help us improve.',
    longDescription:
      'Currently, LearnSpace operates without external third-party tracking scripts (such as Google Analytics or Hotjar). Enabling this category gives permission for privacy-preserving first-party telemetry should platform performance monitoring be enabled in future releases.',
    cookiesList: [
      {
        name: 'None currently active',
        provider: 'None (First-party only)',
        type: 'Optional Telemetry',
        duration: 'N/A',
        purpose: 'No third-party analytics trackers are active. Disabled by default.',
      },
    ],
  },
  [COOKIE_CATEGORIES.MARKETING]: {
    id: COOKIE_CATEGORIES.MARKETING,
    name: 'Marketing & Advertising',
    required: false,
    defaultState: false,
    shortDescription: 'LearnSpace does not use advertising or marketing tracking pixels.',
    longDescription:
      'LearnSpace is an educational learning platform and does not display advertisements, embed retargeting pixels (like Facebook Pixel or Google Ads), or sell user data to advertising networks. This category remains disabled.',
    cookiesList: [
      {
        name: 'None',
        provider: 'None',
        type: 'N/A',
        duration: 'N/A',
        purpose: 'LearnSpace does not engage in third-party advertising or commercial behavioral tracking.',
      },
    ],
  },
};

/**
 * Safe local storage read
 */
const safeGetItem = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err) {
    console.warn('LearnSpace: LocalStorage is inaccessible or restricted:', err);
  }
  return null;
};

/**
 * Safe local storage write
 */
const safeSetItem = (key, value) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch (err) {
    console.warn('LearnSpace: Failed to save to LocalStorage:', err);
  }
  return false;
};

/**
 * Safe local storage remove
 */
const safeRemoveItem = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
  } catch (err) {
    console.warn('LearnSpace: Failed to remove from LocalStorage:', err);
  }
  return false;
};

/**
 * Retrieve the current stored consent decision.
 * Returns null if no valid decision exists, if JSON is malformed, or if policy version is outdated.
 */
export const getStoredConsent = () => {
  const raw = safeGetItem(CONSENT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Check version compatibility
    if (parsed.policyVersion !== CONSENT_POLICY_VERSION) {
      return null;
    }

    // Validate categories structure
    if (!parsed.categories || typeof parsed.categories !== 'object') {
      return null;
    }

    // Essential must ALWAYS be true
    return {
      status: parsed.status || 'custom',
      categories: {
        essential: true,
        preferences: Boolean(parsed.categories.preferences),
        analytics: Boolean(parsed.categories.analytics),
        marketing: Boolean(parsed.categories.marketing),
      },
      timestamp: parsed.timestamp || new Date().toISOString(),
      policyVersion: parsed.policyVersion || CONSENT_POLICY_VERSION,
    };
  } catch {
    return null;
  }
};

/**
 * Check if the user has made an active consent decision
 */
export const hasUserConsented = () => {
  return getStoredConsent() !== null;
};

/**
 * Check if a specific category is allowed under current consent
 */
export const isCategoryAllowed = (category) => {
  if (category === COOKIE_CATEGORIES.ESSENTIAL) return true;
  const consent = getStoredConsent();
  if (!consent) return false; // Privacy by default
  return Boolean(consent.categories[category]);
};

/**
 * Enforce consent by cleaning up optional storage and notifying integrations.
 * Strictly preserves essential authentication cookies (jwt) and essential session storage.
 */
export const enforceConsent = (consent) => {
  if (!consent || !consent.categories) return;

  // 1. If Preferences cookies/storage are rejected:
  if (!consent.categories.preferences) {
    // Clean up optional layout storage
    safeRemoveItem('learnspace_sidebar_collapsed');
    // Note: 'learnspace-theme' is left in place or reset safely without breaking readable UI,
    // but future preference writes are checked against isCategoryAllowed('preferences').
  }

  // 2. If Analytics is rejected:
  if (!consent.categories.analytics) {
    // Ensure any future window tracking queues or telemetry are disabled
    if (typeof window !== 'undefined') {
      window['learnspace_analytics_enabled'] = false;
    }
  } else {
    if (typeof window !== 'undefined') {
      window['learnspace_analytics_enabled'] = true;
    }
  }

  // 3. If Marketing is rejected:
  if (!consent.categories.marketing) {
    if (typeof window !== 'undefined') {
      window['learnspace_marketing_enabled'] = false;
    }
  }

  // 4. Dispatch custom event for reactive subscribers
  if (typeof window !== 'undefined') {
    try {
      const event = new CustomEvent(CONSENT_CHANGE_EVENT, { detail: consent });
      window.dispatchEvent(event);
    } catch {
      // Fallback for older environments without CustomEvent constructor
    }
  }
};

/**
 * Save user consent decision
 */
export const saveConsent = ({ status, categories }) => {
  const consentRecord = {
    status: status || 'custom',
    categories: {
      essential: true, // Invariable
      preferences: Boolean(categories?.preferences),
      analytics: Boolean(categories?.analytics),
      marketing: Boolean(categories?.marketing),
    },
    timestamp: new Date().toISOString(),
    policyVersion: CONSENT_POLICY_VERSION,
  };

  safeSetItem(CONSENT_STORAGE_KEY, JSON.stringify(consentRecord));
  enforceConsent(consentRecord);
  return consentRecord;
};

/**
 * Shortcut: Accept All
 */
export const acceptAll = () => {
  return saveConsent({
    status: 'all',
    categories: {
      essential: true,
      preferences: true,
      analytics: true,
      marketing: true,
    },
  });
};

/**
 * Shortcut: Reject Optional
 */
export const rejectOptional = () => {
  return saveConsent({
    status: 'essential_only',
    categories: {
      essential: true,
      preferences: false,
      analytics: false,
      marketing: false,
    },
  });
};

/**
 * Save custom category selection
 */
export const saveCustomPreferences = (categories) => {
  return saveConsent({
    status: 'custom',
    categories: {
      essential: true,
      preferences: Boolean(categories?.preferences),
      analytics: Boolean(categories?.analytics),
      marketing: Boolean(categories?.marketing),
    },
  });
};

/**
 * Reset consent (used for testing or explicit user reset)
 */
export const clearConsent = () => {
  safeRemoveItem(CONSENT_STORAGE_KEY);
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: null }));
    } catch {
      // Ignore
    }
  }
};

/**
 * Subscribe to consent changes
 */
export const onConsentChange = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail);
  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
};

