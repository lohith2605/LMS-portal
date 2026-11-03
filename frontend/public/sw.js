/**
 * LearnSpace LMS Service Worker for Desktop Notification Activation
 * Reuses existing LMS tabs on notification click and navigates safely.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Validate and sanitize destination to trusted relative path
 */
function sanitizeDestination(rawLink) {
  if (typeof rawLink === 'string') {
    const trimmed = rawLink.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
  }
  return '/student/dashboard?tab=assignments';
}

/**
 * Identify whether a client window is an Instructor or Admin tab.
 * Used to prevent routing student assignments into instructor/admin workspaces.
 */
function isPrivilegedStaffTab(clientUrl) {
  if (!clientUrl) return false;
  try {
    const url = new URL(clientUrl, self.location.origin);
    const path = url.pathname.toLowerCase();
    return path.startsWith('/admin') || path.startsWith('/instructor');
  } catch {
    return false;
  }
}

/**
 * Check whether a client window belongs to a student / learning workflow.
 */
function isStudentLearningTab(clientUrl) {
  if (!clientUrl) return false;
  try {
    const url = new URL(clientUrl, self.location.origin);
    const path = url.pathname.toLowerCase();
    return (
      path.startsWith('/student') ||
      path.startsWith('/courses') ||
      path.startsWith('/verify')
    );
  } catch {
    return false;
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = sanitizeDestination(event.notification.data?.link);
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    (async () => {
      let windowClients = [];
      try {
        windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
      } catch (err) {
        console.warn('[SW] clients.matchAll error:', err);
      }

      // Filter clients strictly to the same origin
      const sameOriginClients = windowClients.filter((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      // Priority 1: Existing student learning tab (e.g. /student/dashboard or /courses/...)
      // Never select an instructor or admin tab!
      let targetClient = sameOriginClients.find(
        (client) => !isPrivilegedStaffTab(client.url) && isStudentLearningTab(client.url)
      );

      // Priority 2: Any existing neutral LMS tab (e.g. / or public landing page) that is NOT instructor/admin
      if (!targetClient) {
        targetClient = sameOriginClients.find(
          (client) => !isPrivilegedStaffTab(client.url)
        );
      }

      // If a suitable existing LMS tab was found: FOCUS and NAVIGATE it (do NOT open a new tab)
      if (targetClient) {
        let focusedClient = null;
        try {
          focusedClient = await targetClient.focus();
        } catch (focusErr) {
          console.warn('[SW] client.focus() failed:', focusErr);
        }

        const clientToNavigate = focusedClient || targetClient;

        // Try in-app React Router navigation via postMessage first (smooth SPA transition without full reload)
        let messageSent = false;
        if (typeof clientToNavigate.postMessage === 'function') {
          try {
            clientToNavigate.postMessage({
              type: 'NOTIFICATION_NAVIGATE',
              link: targetPath,
              url: targetUrl,
            });
            messageSent = true;
          } catch (msgErr) {
            console.warn('[SW] postMessage failed:', msgErr);
          }
        }

        // If postMessage was not supported or if the client cannot receive messages, use WindowClient.navigate()
        if (!messageSent && typeof clientToNavigate.navigate === 'function') {
          try {
            await clientToNavigate.navigate(targetUrl);
          } catch (navErr) {
            console.warn('[SW] client.navigate() failed:', navErr);
          }
        }

        return; // Successfully reused existing tab; do NOT open a new window
      }

      // Fallback: ONLY when no suitable existing LMS tab exists (or only staff tabs are open), open a new window
      if (self.clients.openWindow) {
        try {
          return await self.clients.openWindow(targetUrl);
        } catch (openErr) {
          console.warn('[SW] clients.openWindow() failed:', openErr);
        }
      }
    })()
  );
});
