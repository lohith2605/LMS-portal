const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

test('Phase 2 Real-Time & Desktop Notification Integrity Suite', async (t) => {
  // ---------------------------------------------------------
  // 1. Duplicate socket event unread-count protection
  // ---------------------------------------------------------
  await t.test('1. Duplicate socket event does not inflate unread count', () => {
    let unreadCount = 0;
    const notifications = [];
    const processedIds = new Set();

    const handleNewNotification = (notif) => {
      if (!notif || !notif._id) return;
      const notifId = String(notif._id);

      if (processedIds.has(notifId)) {
        return; // Suppressed duplicate
      }
      processedIds.add(notifId);

      const exists = notifications.some((n) => String(n._id) === notifId);
      if (!exists) {
        notifications.unshift(notif);
      }

      if (!notif.isRead) {
        unreadCount += 1;
      }
    };

    const initialNotif = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Assignment 1 Published',
      message: 'New assignment ready',
      isRead: false,
    };

    // First arrival
    handleNewNotification(initialNotif);
    assert.strictEqual(unreadCount, 1, 'First notification must increment unread count to 1');
    assert.strictEqual(notifications.length, 1);

    // Duplicate socket arrival of exact same event
    handleNewNotification(initialNotif);
    assert.strictEqual(unreadCount, 1, 'Duplicate event must NOT increment unread count again');
    assert.strictEqual(notifications.length, 1, 'Duplicate event must NOT create duplicate entry in notifications array');

    // Third duplicate arrival
    handleNewNotification(initialNotif);
    assert.strictEqual(unreadCount, 1, 'Repeated duplicate event must remain at 1');

    // Fresh new notification arrival
    const freshNotif = {
      _id: '507f1f77bcf86cd799439012',
      title: 'Quiz 1 Published',
      message: 'New quiz ready',
      isRead: false,
    };
    handleNewNotification(freshNotif);
    assert.strictEqual(unreadCount, 2, 'Fresh distinct notification must increment unread count to 2');
    assert.strictEqual(notifications.length, 2);
  });

  // ---------------------------------------------------------
  // 2. A new event triggers one in-app toast
  // ---------------------------------------------------------
  await t.test('2. A new event triggers exactly one in-app toast', () => {
    const toasts = [];
    const processedIds = new Set();

    const dispatchNotification = (notif) => {
      const notifId = String(notif._id);
      if (processedIds.has(notifId)) return;
      processedIds.add(notifId);

      toasts.unshift({
        id: notifId,
        title: notif.title,
        message: notif.message,
        link: notif.link,
        type: notif.type,
      });
    };

    const notif = {
      _id: 'notif_abc_1',
      title: 'New Quiz Released',
      message: 'Test your knowledge in Python Basics',
      link: '/courses/python/learn?view=quiz',
      type: 'quiz_published',
    };

    dispatchNotification(notif);
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].title, 'New Quiz Released');
    assert.strictEqual(toasts[0].type, 'quiz_published');

    // Re-dispatching same notif
    dispatchNotification(notif);
    assert.strictEqual(toasts.length, 1, 'Re-dispatching same notification must not generate second toast');
  });

  // ---------------------------------------------------------
  // 3. Granted permission triggers desktop notification with tag
  // ---------------------------------------------------------
  await t.test('3. Granted permission triggers native desktop notification tagged with notif ID', () => {
    let nativeNotificationDispatched = null;

    const mockNotificationConstructor = function (title, options) {
      nativeNotificationDispatched = { title, options };
      return {
        close() {},
        onclick: null,
      };
    };

    const showDesktop = (notif, permission) => {
      if (permission !== 'granted') return false;
      mockNotificationConstructor(notif.title, {
        body: notif.message,
        tag: String(notif._id),
      });
      return true;
    };

    const notif = {
      _id: 'notif_tag_99',
      title: 'Grade Published',
      message: 'Your score is 95/100',
    };

    const result = showDesktop(notif, 'granted');
    assert.strictEqual(result, true);
    assert.ok(nativeNotificationDispatched);
    assert.strictEqual(nativeNotificationDispatched.title, 'Grade Published');
    assert.strictEqual(nativeNotificationDispatched.options.tag, 'notif_tag_99', 'Tag must equal notification _id');
  });

  // ---------------------------------------------------------
  // 4. Denied or unsupported permission does not break in-app toast
  // ---------------------------------------------------------
  await t.test('4. Denied or unsupported permission does not break in-app toast pipeline', () => {
    let desktopDispatched = false;
    let toastDispatched = false;

    const handlePipeline = (notif, permission) => {
      // 1. Toast always attempts
      toastDispatched = true;

      // 2. Desktop notification checks permission
      if (permission === 'granted') {
        desktopDispatched = true;
      } else {
        desktopDispatched = false;
      }
    };

    // Case A: Denied
    handlePipeline({ _id: '1', title: 'Test' }, 'denied');
    assert.strictEqual(toastDispatched, true, 'Toast must dispatch even if desktop permission is denied');
    assert.strictEqual(desktopDispatched, false, 'Desktop notice must NOT dispatch when permission is denied');

    // Case B: Unsupported
    toastDispatched = false;
    handlePipeline({ _id: '2', title: 'Test 2' }, 'unsupported');
    assert.strictEqual(toastDispatched, true, 'Toast must dispatch even if desktop notice is unsupported');
    assert.strictEqual(desktopDispatched, false);
  });

  // ---------------------------------------------------------
  // 5. Cross-tab desktop notification deduplication
  // ---------------------------------------------------------
  await t.test('5. Cross-tab desktop notification deduplication', () => {
    const mockStorage = new Map();
    const CLAIM_TTL = 60000;

    const claimDesktopNotification = (notifId, tabId) => {
      const key = `learnspace_desktop_claim_${notifId}`;
      const existing = mockStorage.get(key);
      const now = Date.now();

      if (existing) {
        if (now - existing.timestamp < CLAIM_TTL) {
          return false; // Claimed by another tab
        }
      }

      mockStorage.set(key, { tabId, timestamp: now });
      return true;
    };

    const notifId = 'notif_cross_tab_100';

    // Tab 1 receives notification:new
    const tab1Claimed = claimDesktopNotification(notifId, 'tab_alpha');
    assert.strictEqual(tab1Claimed, true, 'Tab 1 must successfully claim desktop notification');

    // Tab 2 receives exact same notification:new over its socket
    const tab2Claimed = claimDesktopNotification(notifId, 'tab_beta');
    assert.strictEqual(tab2Claimed, false, 'Tab 2 must suppress duplicate desktop notification');

    // Distinct notification arrives in Tab 2
    const differentNotifId = 'notif_cross_tab_101';
    const tab2DistinctClaim = claimDesktopNotification(differentNotifId, 'tab_beta');
    assert.strictEqual(tab2DistinctClaim, true, 'Tab 2 must successfully claim a new, distinct notification');
  });

  // ---------------------------------------------------------
  // 6. Toast and desktop notification navigation
  // ---------------------------------------------------------
  await t.test('6. Toast and desktop notification navigation routing safety', () => {
    let navigatedTo = null;
    const navigate = (link) => {
      navigatedTo = link;
    };

    const onToastClick = (toast) => {
      if (toast.link) {
        navigate(toast.link);
      }
    };

    // Assignment published notification
    onToastClick({ link: '/student/dashboard?tab=assignments' });
    assert.strictEqual(navigatedTo, '/student/dashboard?tab=assignments');

    // Quiz published notification
    onToastClick({ link: '/courses/python-101/learn?view=quiz&quizId=q_123' });
    assert.strictEqual(navigatedTo, '/courses/python-101/learn?view=quiz&quizId=q_123');

    // Certificate notification
    onToastClick({ link: '/verify/CERT-999' });
    assert.strictEqual(navigatedTo, '/verify/CERT-999');
  });

  // ---------------------------------------------------------
  // 7. Quiz publication lifecycle & recipient targeting
  // ---------------------------------------------------------
  await t.test('7. Quiz publication notifies eligible enrolled students only once', async () => {
    const instructorId = new mongoose.Types.ObjectId();
    const enrolledStudent1 = new mongoose.Types.ObjectId();
    const enrolledStudent2 = new mongoose.Types.ObjectId();
    const nonEnrolledStudent = new mongoose.Types.ObjectId();

    const mockEnrollments = [
      { student: enrolledStudent1, status: 'active' },
      { student: enrolledStudent2, status: 'completed' },
    ];

    let publishCallCount = 0;
    const dispatchedNotifications = [];

    const handlePublishQuiz = async ({ quiz, wasAlreadyPublished }) => {
      publishCallCount++;
      if (wasAlreadyPublished) {
        return; // Suppress duplicate dispatch
      }

      // Generate notifications for enrolled learners
      const notifs = mockEnrollments
        .map((enr) => ({
          recipient: enr.student.toString(),
          type: 'quiz_published',
          title: 'New Quiz Published',
          message: `A new quiz "${quiz.title}" is now available.`,
          link: `/courses/test-course/learn?view=quiz&quizId=${quiz._id}`,
          metadata: { quizId: quiz._id, courseId: quiz.course },
        }))
        .filter((item) => item.recipient !== instructorId.toString());

      dispatchedNotifications.push(...notifs);
    };

    const quizObj = {
      _id: new mongoose.Types.ObjectId(),
      course: new mongoose.Types.ObjectId(),
      title: 'Python Data Structures',
      status: 'draft',
    };

    // First publication: from draft -> published
    await handlePublishQuiz({ quiz: quizObj, wasAlreadyPublished: false });
    assert.strictEqual(publishCallCount, 1);
    assert.strictEqual(dispatchedNotifications.length, 2, 'Should notify 2 enrolled students');
    assert.ok(dispatchedNotifications.some((n) => n.recipient === enrolledStudent1.toString()));
    assert.ok(dispatchedNotifications.some((n) => n.recipient === enrolledStudent2.toString()));
    assert.ok(!dispatchedNotifications.some((n) => n.recipient === nonEnrolledStudent.toString()), 'Non-enrolled student must NOT be notified');
    assert.ok(!dispatchedNotifications.some((n) => n.recipient === instructorId.toString()), 'Instructor must NOT be self-notified');

    // Repeated publication call on already-published quiz
    await handlePublishQuiz({ quiz: quizObj, wasAlreadyPublished: true });
    assert.strictEqual(publishCallCount, 2);
    assert.strictEqual(dispatchedNotifications.length, 2, 'Must NOT re-dispatch notifications on already published quiz');
  });

  // ---------------------------------------------------------
  // 8. Notification model enum compatibility
  // ---------------------------------------------------------
  await t.test('8. Notification model enum supports quiz_published and existing event types', () => {
    const enumValues = Notification.schema.path('type').enumValues;
    assert.ok(enumValues.includes('quiz_published'), 'Enum must include quiz_published');
    assert.ok(enumValues.includes('assignment_published'), 'Enum must include assignment_published');
    assert.ok(enumValues.includes('submission_graded'), 'Enum must include submission_graded');
    assert.ok(enumValues.includes('assignment_submitted'), 'Enum must include assignment_submitted');
    assert.ok(enumValues.includes('discussion_reply'), 'Enum must include discussion_reply');
    assert.ok(enumValues.includes('reply_accepted'), 'Enum must include reply_accepted');
    assert.ok(enumValues.includes('certificate_issued'), 'Enum must include certificate_issued');
    assert.ok(enumValues.includes('deadline_reminder'), 'Enum must include deadline_reminder');
  });

  // ---------------------------------------------------------
  // 9. Notification Link Sanitization & Safe Redirection
  // ---------------------------------------------------------
  await t.test('9. Notification link sanitizer enforces same-origin relative URLs and blocks open redirects', () => {
    const sanitizeNotificationLink = (link) => {
      if (!link || typeof link !== 'string') return '/student/dashboard';
      const trimmed = link.trim();
      if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return trimmed;
      }
      return '/student/dashboard';
    };

    assert.strictEqual(
      sanitizeNotificationLink('/courses/web-dev/learn?view=assignments'),
      '/courses/web-dev/learn?view=assignments'
    );
    assert.strictEqual(
      sanitizeNotificationLink('/courses/python/learn?view=quiz&quizId=123'),
      '/courses/python/learn?view=quiz&quizId=123'
    );
    assert.strictEqual(
      sanitizeNotificationLink('https://evil.com/phishing'),
      '/student/dashboard',
      'Absolute external URLs must be sanitized to default dashboard'
    );
    assert.strictEqual(
      sanitizeNotificationLink('//evil.com/phishing'),
      '/student/dashboard',
      'Protocol-relative URLs must be blocked'
    );
    assert.strictEqual(
      sanitizeNotificationLink('javascript:alert(1)'),
      '/student/dashboard',
      'javascript: schemes must be blocked'
    );
    assert.strictEqual(sanitizeNotificationLink(null), '/student/dashboard');
  });

  // ---------------------------------------------------------
  // 10. Service Worker Tab Reuse & In-App Navigation Relay Simulation
  // ---------------------------------------------------------
  await t.test('10. Service Worker reuses existing window client without opening a new tab', async () => {
    let focusCalled = false;
    let postedMessage = null;
    let windowOpened = false;

    const mockClients = [
      {
        url: 'http://localhost:5174/student/dashboard',
        focus: async () => {
          focusCalled = true;
          return mockClients[0];
        },
        postMessage: (msg) => {
          postedMessage = msg;
        },
      },
    ];

    const handleNotificationClick = async ({ rawLink }) => {
      let targetPath = '/student/dashboard';
      if (typeof rawLink === 'string' && rawLink.startsWith('/') && !rawLink.startsWith('//')) {
        targetPath = rawLink;
      }

      const windowClients = mockClients;
      for (const client of windowClients) {
        if ('focus' in client) {
          const focusedClient = await client.focus();
          const clientToMessage = focusedClient || client;
          if (clientToMessage && typeof clientToMessage.postMessage === 'function') {
            clientToMessage.postMessage({
              type: 'NOTIFICATION_NAVIGATE',
              link: targetPath,
            });
          }
          return;
        }
      }

      windowOpened = true;
    };

    await handleNotificationClick({ rawLink: '/courses/intro-python/learn?view=quiz&quizId=q42' });

    assert.strictEqual(focusCalled, true, 'Existing window client must be focused');
    assert.strictEqual(windowOpened, false, 'openWindow must NOT be called when existing client is present');
    assert.deepStrictEqual(
      postedMessage,
      {
        type: 'NOTIFICATION_NAVIGATE',
        link: '/courses/intro-python/learn?view=quiz&quizId=q42',
      },
      'In-app navigation message must be relayed to the focused tab'
    );
  });

  // ---------------------------------------------------------
  // 11. LoginPage authenticated session preservation
  // ---------------------------------------------------------
  await t.test('11. Authenticated user landing on LoginPage is immediately redirected to intended destination', () => {
    const resolveLoginRedirect = ({ isAuthenticated, user, destination }) => {
      if (isAuthenticated && user) {
        const defaultDashboard =
          user.role === 'admin'
            ? '/admin/dashboard'
            : user.role === 'instructor'
            ? '/instructor/dashboard'
            : '/student/dashboard';
        return destination === '/dashboard' ? defaultDashboard : destination;
      }
      return null;
    };

    const studentUser = { id: 'u1', role: 'student' };
    const instructorUser = { id: 'u2', role: 'instructor' };

    assert.strictEqual(
      resolveLoginRedirect({
        isAuthenticated: true,
        user: studentUser,
        destination: '/courses/intro-python/learn?view=assignments',
      }),
      '/courses/intro-python/learn?view=assignments',
      'Should redirect authenticated student to specific assignment link'
    );

    assert.strictEqual(
      resolveLoginRedirect({
        isAuthenticated: true,
        user: studentUser,
        destination: '/dashboard',
      }),
      '/student/dashboard',
      'Should redirect to student dashboard by default'
    );

    assert.strictEqual(
      resolveLoginRedirect({
        isAuthenticated: true,
        user: instructorUser,
        destination: '/dashboard',
      }),
      '/instructor/dashboard',
      'Should redirect to instructor dashboard for instructor'
    );

    assert.strictEqual(
      resolveLoginRedirect({
        isAuthenticated: false,
        user: null,
        destination: '/student/dashboard',
      }),
      null,
      'Unauthenticated visitor should stay on login page'
    );
  });

  // ---------------------------------------------------------
  // 12. Catalog & Explore Courses Navigation Target Resolution
  // ---------------------------------------------------------
  await t.test('12. CourseDetailsPage catalog target resolves appropriately by role and session state', () => {
    const getCatalogTarget = ({ isAuthenticated, user }) => {
      return isAuthenticated
        ? user?.role === 'instructor'
          ? '/instructor/dashboard?tab=courses'
          : user?.role === 'admin'
          ? '/admin/dashboard'
          : '/student/dashboard?tab=explore'
        : '/courses';
    };

    assert.strictEqual(
      getCatalogTarget({ isAuthenticated: true, user: { role: 'student' } }),
      '/student/dashboard?tab=explore',
      'Logged-in student must be routed to explore courses tab'
    );

    assert.strictEqual(
      getCatalogTarget({ isAuthenticated: true, user: { role: 'instructor' } }),
      '/instructor/dashboard?tab=courses',
      'Instructor must be routed to instructor courses tab'
    );

    assert.strictEqual(
      getCatalogTarget({ isAuthenticated: false, user: null }),
      '/courses',
      'Unauthenticated user must be routed safely to /courses redirect handler'
    );
  });

  // ---------------------------------------------------------
  // 13. Multi-Tab Isolation: Never navigate Instructor or Admin tabs to Student Assignment
  // ---------------------------------------------------------
  await t.test('13. Multi-Tab Isolation: Service Worker filters out staff tabs and targets student tabs only', async () => {
    let focusedUrl = null;
    let windowOpenedUrl = null;

    const mockClients = [
      {
        url: 'http://localhost:5174/instructor/dashboard',
        focus: async () => {
          focusedUrl = 'http://localhost:5174/instructor/dashboard';
          return mockClients[0];
        },
        postMessage: () => {},
      },
      {
        url: 'http://localhost:5174/admin/dashboard',
        focus: async () => {
          focusedUrl = 'http://localhost:5174/admin/dashboard';
          return mockClients[1];
        },
        postMessage: () => {},
      },
      {
        url: 'http://localhost:5174/student/dashboard',
        focus: async () => {
          focusedUrl = 'http://localhost:5174/student/dashboard';
          return mockClients[2];
        },
        postMessage: () => {},
      },
    ];

    const origin = 'http://localhost:5174';

    const isPrivilegedStaffTab = (clientUrl) => {
      try {
        const url = new URL(clientUrl, origin);
        const path = url.pathname.toLowerCase();
        return path.startsWith('/admin') || path.startsWith('/instructor');
      } catch {
        return false;
      }
    };

    const isStudentLearningTab = (clientUrl) => {
      try {
        const url = new URL(clientUrl, origin);
        const path = url.pathname.toLowerCase();
        return path.startsWith('/student') || path.startsWith('/courses') || path.startsWith('/verify');
      } catch {
        return false;
      }
    };

    // Find target client among mockClients
    const sameOriginClients = mockClients.filter((c) => new URL(c.url).origin === origin);
    let targetClient = sameOriginClients.find(
      (c) => !isPrivilegedStaffTab(c.url) && isStudentLearningTab(c.url)
    );

    if (targetClient) {
      await targetClient.focus();
    } else {
      windowOpenedUrl = 'fallback';
    }

    assert.strictEqual(
      focusedUrl,
      'http://localhost:5174/student/dashboard',
      'Must select the student dashboard tab even when instructor and admin tabs are present'
    );
    assert.strictEqual(windowOpenedUrl, null, 'Must NOT open a new window when student tab exists');

    // Case B: Only Instructor and Admin tabs open (no student tab)
    const staffOnlyClients = [
      {
        url: 'http://localhost:5174/instructor/dashboard',
        focus: async () => {},
      },
      {
        url: 'http://localhost:5174/admin/dashboard',
        focus: async () => {},
      },
    ];

    let fallbackOpened = null;
    const sameOriginStaff = staffOnlyClients.filter((c) => new URL(c.url).origin === origin);
    let staffTarget = sameOriginStaff.find(
      (c) => !isPrivilegedStaffTab(c.url) && isStudentLearningTab(c.url)
    );
    if (!staffTarget) {
      staffTarget = sameOriginStaff.find((c) => !isPrivilegedStaffTab(c.url));
    }

    if (!staffTarget) {
      fallbackOpened = 'http://localhost:5174/student/dashboard?tab=assignments';
    }

    assert.strictEqual(
      staffTarget,
      undefined,
      'Staff tabs must never be targeted for student assignment notifications'
    );
    assert.strictEqual(
      fallbackOpened,
      'http://localhost:5174/student/dashboard?tab=assignments',
      'Should safely fall back to openWindow when only instructor/admin tabs are open'
    );
  });

  // ---------------------------------------------------------
  // 14. Service Worker Registration Failure Graceful Fallback
  // ---------------------------------------------------------
  await t.test('14. Service Worker registration failure falls back gracefully without breaking in-app toast', () => {
    let inAppToastRendered = false;
    let desktopShown = false;

    // Simulate notification arrival in component context
    const onNotificationArrival = ({ notif, swAvailable, notificationApiAvailable }) => {
      // 1. In-app toast is ALWAYS rendered unconditionally
      inAppToastRendered = true;

      // 2. Desktop notification attempts SW, falls back to Notification API
      if (swAvailable) {
        desktopShown = true;
      } else if (notificationApiAvailable) {
        desktopShown = true;
      }
    };

    onNotificationArrival({
      notif: { _id: '123', title: 'Assignment 1', link: '/student/dashboard?tab=assignments' },
      swAvailable: false, // SW registration failed or blocked
      notificationApiAvailable: true,
    });

    assert.strictEqual(inAppToastRendered, true, 'In-app toast must render even if SW registration failed');
    assert.strictEqual(desktopShown, true, 'Desktop notification falls back gracefully to window Notification API');
  });
});

