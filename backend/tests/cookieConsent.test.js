const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Mock browser environment for Node.js test runner
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class MockCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

// Set up globals
const mockLocalStorage = new MockStorage();
const mockWindow = {
  localStorage: mockLocalStorage,
  dispatchEvent: (event) => {
    mockWindow.listeners.forEach((l) => l(event));
  },
  listeners: [],
  addEventListener: (type, handler) => {
    mockWindow.listeners.push(handler);
  },
  removeEventListener: (type, handler) => {
    mockWindow.listeners = mockWindow.listeners.filter((l) => l !== handler);
  },
};

global.window = mockWindow;
global.CustomEvent = MockCustomEvent;

// Dynamically import ES Module under test
describe('LearnSpace Cookie Consent & Preferences Engine', async () => {
  const {
    CONSENT_STORAGE_KEY,
    CONSENT_POLICY_VERSION,
    COOKIE_CATEGORIES,
    CATEGORY_DETAILS,
    getStoredConsent,
    hasUserConsented,
    isCategoryAllowed,
    saveConsent,
    acceptAll,
    rejectOptional,
    saveCustomPreferences,
    clearConsent,
    enforceConsent,
    onConsentChange,
  } = await import('../../frontend/src/utils/cookieConsent.js');

  beforeEach(() => {
    mockLocalStorage.clear();
    mockWindow.listeners = [];
    delete mockWindow['learnspace_analytics_enabled'];
    delete mockWindow['learnspace_marketing_enabled'];
  });

  it('1. Returns null and indicates unconsented when no record exists (First Visit / Banner Shown)', () => {
    assert.strictEqual(getStoredConsent(), null);
    assert.strictEqual(hasUserConsented(), false);
    // Optional categories default to disallowed
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.PREFERENCES), false);
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.ANALYTICS), false);
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.MARKETING), false);
    // Essential is always allowed
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.ESSENTIAL), true);
  });

  it('2. Accept All enables all applicable categories and persists valid record', () => {
    const consent = acceptAll();
    assert.strictEqual(consent.status, 'all');
    assert.strictEqual(consent.categories.essential, true);
    assert.strictEqual(consent.categories.preferences, true);
    assert.strictEqual(consent.categories.analytics, true);
    assert.strictEqual(consent.categories.marketing, true);
    assert.strictEqual(consent.policyVersion, CONSENT_POLICY_VERSION);
    assert.ok(consent.timestamp);

    // Stored in localStorage
    assert.strictEqual(hasUserConsented(), true);
    const stored = getStoredConsent();
    assert.deepStrictEqual(stored.categories, {
      essential: true,
      preferences: true,
      analytics: true,
      marketing: true,
    });
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.ANALYTICS), true);
    assert.strictEqual(mockWindow['learnspace_analytics_enabled'], true);
  });

  it('3. Reject Optional disables all optional categories while keeping essential enabled', () => {
    const consent = rejectOptional();
    assert.strictEqual(consent.status, 'essential_only');
    assert.strictEqual(consent.categories.essential, true);
    assert.strictEqual(consent.categories.preferences, false);
    assert.strictEqual(consent.categories.analytics, false);
    assert.strictEqual(consent.categories.marketing, false);

    assert.strictEqual(hasUserConsented(), true);
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.ESSENTIAL), true);
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.PREFERENCES), false);
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.ANALYTICS), false);
    assert.strictEqual(isCategoryAllowed(COOKIE_CATEGORIES.MARKETING), false);
    assert.strictEqual(mockWindow['learnspace_analytics_enabled'], false);
    assert.strictEqual(mockWindow['learnspace_marketing_enabled'], false);
  });

  it('4. Custom preferences persist exact selected values and always enforce essential=true', () => {
    // Attempting to pass essential: false must be prevented
    const consent = saveCustomPreferences({
      essential: false,
      preferences: true,
      analytics: false,
      marketing: false,
    });

    assert.strictEqual(consent.status, 'custom');
    assert.strictEqual(consent.categories.essential, true, 'Essential category must never be disabled');
    assert.strictEqual(consent.categories.preferences, true);
    assert.strictEqual(consent.categories.analytics, false);
    assert.strictEqual(consent.categories.marketing, false);

    const reloaded = getStoredConsent();
    assert.strictEqual(reloaded.categories.essential, true);
    assert.strictEqual(reloaded.categories.preferences, true);
    assert.strictEqual(reloaded.categories.analytics, false);
  });

  it('5. Malformed, corrupted, or non-JSON storage is handled gracefully without throwing', () => {
    mockLocalStorage.setItem(CONSENT_STORAGE_KEY, '{invalid-json-payload');
    assert.doesNotThrow(() => {
      const consent = getStoredConsent();
      assert.strictEqual(consent, null);
      assert.strictEqual(hasUserConsented(), false);
    });
  });

  it('6. Outdated policy version invalidates old decision and prompts for fresh consent', () => {
    const oldRecord = {
      status: 'all',
      categories: { essential: true, preferences: true, analytics: true, marketing: true },
      timestamp: '2025-01-01T00:00:00.000Z',
      policyVersion: '0.9.0', // Outdated version
    };
    mockLocalStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(oldRecord));

    assert.strictEqual(getStoredConsent(), null, 'Old policy version must be invalidated');
    assert.strictEqual(hasUserConsented(), false);
  });

  it('7. EnforceConsent clears non-essential preferences storage when rejected', () => {
    mockLocalStorage.setItem('learnspace_sidebar_collapsed', 'true');

    // User rejects optional
    rejectOptional();

    // Preferences key must be cleaned up
    assert.strictEqual(mockLocalStorage.getItem('learnspace_sidebar_collapsed'), null);
  });

  it('8. Consent change dispatches custom event and triggers registered listeners', () => {
    let notifiedConsent = null;
    const unsubscribe = onConsentChange((detail) => {
      notifiedConsent = detail;
    });

    acceptAll();
    assert.ok(notifiedConsent);
    assert.strictEqual(notifiedConsent.status, 'all');

    unsubscribe();
    rejectOptional();
    // After unsubscribe, notifiedConsent should not have updated to essential_only
    assert.strictEqual(notifiedConsent.status, 'all');
  });

  it('9. Never stores passwords, tokens, JWTs, or secrets in consent storage', () => {
    acceptAll();
    const raw = mockLocalStorage.getItem(CONSENT_STORAGE_KEY);
    assert.strictEqual(raw.includes('password'), false);
    assert.strictEqual(raw.includes('token'), false);
    assert.strictEqual(raw.includes('Bearer'), false);
    assert.strictEqual(raw.includes('jwt'), false);
    assert.strictEqual(raw.includes('secret'), false);
  });

  it('10. Metadata definitions contain accurate details for all 4 categories', () => {
    assert.ok(CATEGORY_DETAILS[COOKIE_CATEGORIES.ESSENTIAL]);
    assert.strictEqual(CATEGORY_DETAILS[COOKIE_CATEGORIES.ESSENTIAL].required, true);
    assert.ok(CATEGORY_DETAILS[COOKIE_CATEGORIES.PREFERENCES]);
    assert.strictEqual(CATEGORY_DETAILS[COOKIE_CATEGORIES.PREFERENCES].required, false);
    assert.ok(CATEGORY_DETAILS[COOKIE_CATEGORIES.ANALYTICS]);
    assert.strictEqual(CATEGORY_DETAILS[COOKIE_CATEGORIES.ANALYTICS].required, false);
    assert.ok(CATEGORY_DETAILS[COOKIE_CATEGORIES.MARKETING]);
    assert.strictEqual(CATEGORY_DETAILS[COOKIE_CATEGORIES.MARKETING].required, false);
  });
});

