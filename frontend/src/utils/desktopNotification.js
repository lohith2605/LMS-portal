/**
 * Desktop Notification Utility for LearnSpace LMS
 * Supports native Web Notification API with cross-tab deduplication and Service Worker tab reuse.
 */

const STORAGE_PREFIX = 'learnspace_desktop_claim_';
const CLAIM_TTL_MS = 60 * 1000; // 60 seconds TTL for duplicate suppression
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Unique tab ID stable for the lifecycle of the browser window/tab
const getTabId = () => {
  if (typeof window === 'undefined') return 'server';
  if (!window.__LEARNSPACE_TAB_ID__) {
    window.__LEARNSPACE_TAB_ID__ = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  }
  return window.__LEARNSPACE_TAB_ID__;
};

// In-memory set of recently displayed desktop notification IDs in this tab
const inMemoryClaimedIds = new Set();

// Cross-tab BroadcastChannel instance
let broadcastChannel = null;
if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
  try {
    broadcastChannel = new window.BroadcastChannel('learnspace_desktop_notifications');
    broadcastChannel.onmessage = (event) => {
      if (event?.data?.type === 'DESKTOP_CLAIMED' && event.data.id) {
        inMemoryClaimedIds.add(String(event.data.id));
      }
    };
  } catch {
    // Ignore BroadcastChannel initialization failures in unsupported/restricted environments
  }
}

/**
 * Validate and sanitize notification navigation links.
 * Strictly enforces trusted, same-origin relative application paths.
 */
export const sanitizeNotificationLink = (link) => {
  if (!link || typeof link !== 'string') return '/student/dashboard';
  const trimmed = link.trim();
  // Must start with single '/' and not '//' (which represents protocol-relative external URLs)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  return '/student/dashboard';
};

/**
 * Clean up old claim keys from localStorage to prevent storage bloat
 */
const cleanupStaleClaims = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const now = Date.now();
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (val && val.timestamp && now - val.timestamp > CLEANUP_INTERVAL_MS) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore localStorage access errors
  }
};

/**
 * Attempt to claim desktop notification dispatch across multiple tabs.
 * Returns true if this tab successfully won the claim to display the OS banner.
 */
export const claimDesktopNotification = (notificationId) => {
  if (!notificationId) return false;
  const idStr = String(notificationId);

  // 1. Check in-memory deduplication in this tab
  if (inMemoryClaimedIds.has(idStr)) {
    return false;
  }

  // 2. Cross-tab localStorage coordination
  if (typeof window !== 'undefined' && window.localStorage) {
    const key = `${STORAGE_PREFIX}${idStr}`;
    const now = Date.now();
    const myTabId = getTabId();

    try {
      const existing = localStorage.getItem(key);
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed && parsed.timestamp && now - parsed.timestamp < CLAIM_TTL_MS) {
            // Already claimed by another tab (or this tab previously)
            inMemoryClaimedIds.add(idStr);
            return false;
          }
        } catch {
          // If corrupted, overwrite
        }
      }

      // Write claim
      localStorage.setItem(
        key,
        JSON.stringify({
          tabId: myTabId,
          timestamp: now,
        })
      );

      // Verify read-back to resolve race condition if another tab wrote concurrently
      const verify = localStorage.getItem(key);
      if (verify) {
        try {
          const parsed = JSON.parse(verify);
          if (parsed && parsed.tabId && parsed.tabId !== myTabId) {
            // Lost race to another tab
            inMemoryClaimedIds.add(idStr);
            return false;
          }
        } catch {
          // proceed
        }
      }
    } catch {
      // If localStorage is unavailable/disabled, fall back to in-memory check
    }
  }

  // Record claim in memory
  inMemoryClaimedIds.add(idStr);

  // Notify other tabs via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'DESKTOP_CLAIMED', id: idStr });
    } catch {
      // Ignore broadcast errors
    }
  }

  // Periodic cleanup
  cleanupStaleClaims();

  return true;
};

/**
 * Check whether desktop notification APIs are supported by the current browser environment
 */
export const isDesktopNotificationSupported = () => {
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator);
};

/**
 * Return current notification permission: 'default' | 'granted' | 'denied' | 'unsupported'
 */
export const getDesktopNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

let swRegistration = null;

/**
 * Register and activate the local Service Worker for notification activation and tab reuse
 */
export const registerNotificationServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    if (swRegistration && swRegistration.active) {
      return swRegistration;
    }

    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    // Wait for the service worker to activate if installing or waiting
    const worker = reg.installing || reg.waiting || reg.active;
    if (worker && worker.state !== 'activated') {
      await new Promise((resolve) => {
        const onStateChange = () => {
          if (worker.state === 'activated' || worker.state === 'redundant') {
            worker.removeEventListener('statechange', onStateChange);
            resolve();
          }
        };
        worker.addEventListener('statechange', onStateChange);
        setTimeout(() => {
          worker.removeEventListener('statechange', onStateChange);
          resolve();
        }, 1500);
      });
    }

    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('[desktopNotification] Service worker registration error:', err);
    return null;
  }
};

/**
 * Request notification permission strictly following an explicit user gesture
 */
export const requestDesktopNotificationPermission = async () => {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Pre-warm Service Worker registration
      registerNotificationServiceWorker();
    }
    return permission;
  } catch {
    return 'denied';
  }
};

/**
 * Display a desktop notification with existing tab reuse support.
 * Uses Service Worker notification click handling to focus the existing tab when possible,
 * with graceful fallback to native Notification constructor.
 */
export const showDesktopNotification = async (notif, onNavigate = null) => {
  if (!isDesktopNotificationSupported()) return false;
  if (getDesktopNotificationPermission() !== 'granted') return false;
  if (!notif || !notif._id) return false;

  // Deduplicate across tabs: only one tab renders the native OS notification
  if (!claimDesktopNotification(notif._id)) {
    return false;
  }

  const safeLink = sanitizeNotificationLink(notif.link);
  const options = {
    body: notif.message || '',
    tag: String(notif._id), // Browser replaces duplicate notifications with the same tag
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      link: safeLink,
      id: notif._id,
      timestamp: Date.now(),
    },
  };

  // Primary Path: Active Service Worker showNotification
  // This is required so notification clicks route through sw.js for tab reuse and in-app navigation
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await registerNotificationServiceWorker();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(notif.title || 'LearnSpace Notification', options);
        return true;
      }
    } catch (swErr) {
      console.warn('[desktopNotification] ServiceWorker showNotification failed:', swErr);
    }
  }

  // Fallback ONLY when ServiceWorker is completely unsupported or unavailable
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const desktopNotice = new Notification(notif.title || 'LearnSpace Notification', options);

      desktopNotice.onclick = () => {
        try {
          window.focus();
        } catch {
          // Ignore focus error in restricted context
        }
        desktopNotice.close();

        if (typeof onNavigate === 'function') {
          onNavigate(safeLink, notif._id);
        } else if (typeof window !== 'undefined') {
          window.location.pathname = safeLink;
        }
      };

      // Auto-close notification after 6 seconds
      setTimeout(() => {
        try {
          desktopNotice.close();
        } catch {
          // Already closed by user
        }
      }, 6000);

      return true;
    } catch (nErr) {
      console.warn('[desktopNotification] Fallback Notification error:', nErr);
      return false;
    }
  }

  return false;
};
