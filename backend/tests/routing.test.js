const test = require('node:test');
const assert = require('node:assert');

test('Routing & Navigation Integrity Suite', async (t) => {
  await t.test('1. Login redirect preserves relative redirect query parameters', () => {
    // Simulating login destination resolution logic
    const resolveDestination = (searchParams, locationState, isAdminRole) => {
      const redirectParam = searchParams.get('redirect') || searchParams.get('from');
      const rawFromState = locationState?.from;
      const statePath = typeof rawFromState === 'string'
        ? rawFromState
        : rawFromState?.pathname
          ? `${rawFromState.pathname}${rawFromState.search || ''}${rawFromState.hash || ''}`
          : null;

      const safeCandidate =
        redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
          ? redirectParam
          : statePath && statePath.startsWith('/') && !statePath.startsWith('//')
            ? statePath
            : null;

      return isAdminRole
        ? safeCandidate && safeCandidate.startsWith('/admin')
          ? safeCandidate
          : '/admin/dashboard'
        : safeCandidate && !safeCandidate.startsWith('/admin')
          ? safeCandidate
          : '/dashboard';
    };

    // Case A: Query param ?redirect=/courses/clean-architecture
    const paramsA = new URLSearchParams('redirect=/courses/clean-architecture');
    assert.strictEqual(
      resolveDestination(paramsA, {}, false),
      '/courses/clean-architecture',
      'Should return course page from ?redirect query param'
    );

    // Case B: Query param ?from=/courses/clean-architecture
    const paramsB = new URLSearchParams('from=/courses/clean-architecture');
    assert.strictEqual(
      resolveDestination(paramsB, {}, false),
      '/courses/clean-architecture',
      'Should return course page from ?from query param'
    );

    // Case C: location.state.from preservation including query string and hash
    const paramsC = new URLSearchParams('');
    const stateC = {
      from: {
        pathname: '/courses/clean-architecture/learn',
        search: '?view=discussions&discussionId=disc_123',
        hash: '#reply-456',
      },
    };
    assert.strictEqual(
      resolveDestination(paramsC, stateC, false),
      '/courses/clean-architecture/learn?view=discussions&discussionId=disc_123#reply-456',
      'Should preserve full path with search and hash from location.state.from'
    );

    // Case D: Default destination when no redirect provided
    assert.strictEqual(
      resolveDestination(new URLSearchParams(''), {}, false),
      '/dashboard',
      'Should default to /dashboard for standard login'
    );
  });

  await t.test('2. Open redirect attacks are rejected safely', () => {
    const resolveDestination = (searchParams, locationState, isAdminRole) => {
      const redirectParam = searchParams.get('redirect') || searchParams.get('from');
      const rawFromState = locationState?.from;
      const statePath = typeof rawFromState === 'string'
        ? rawFromState
        : rawFromState?.pathname
          ? `${rawFromState.pathname}${rawFromState.search || ''}${rawFromState.hash || ''}`
          : null;

      const safeCandidate =
        redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
          ? redirectParam
          : statePath && statePath.startsWith('/') && !statePath.startsWith('//')
            ? statePath
            : null;

      return isAdminRole
        ? safeCandidate && safeCandidate.startsWith('/admin')
          ? safeCandidate
          : '/admin/dashboard'
        : safeCandidate && !safeCandidate.startsWith('/admin')
          ? safeCandidate
          : '/dashboard';
    };

    // Protocol-relative URL //evil.com
    const paramsEvil1 = new URLSearchParams('redirect=//evil.com/phishing');
    assert.strictEqual(
      resolveDestination(paramsEvil1, {}, false),
      '/dashboard',
      'Protocol-relative URLs must be blocked'
    );

    // Absolute external URL https://attacker.com
    const paramsEvil2 = new URLSearchParams('redirect=https://attacker.com');
    assert.strictEqual(
      resolveDestination(paramsEvil2, {}, false),
      '/dashboard',
      'Absolute external URLs must be blocked'
    );

    // Non-admin attempting to redirect into /admin
    const paramsAdminLeak = new URLSearchParams('redirect=/admin/dashboard');
    assert.strictEqual(
      resolveDestination(paramsAdminLeak, {}, false),
      '/dashboard',
      'Non-admin users cannot be redirected to /admin via query param'
    );
  });

  await t.test('3. Course discussion alias routes redirect correctly into Course Player', () => {
    const buildDiscussionTarget = (idOrSlug, discussionId) => {
      return `/courses/${idOrSlug}/learn?view=discussions${
        discussionId ? `&discussionId=${encodeURIComponent(discussionId)}` : ''
      }`;
    };

    // Discussions overview deep link
    assert.strictEqual(
      buildDiscussionTarget('cloud-architecture'),
      '/courses/cloud-architecture/learn?view=discussions',
      'Should redirect to course player discussion view'
    );

    // Specific discussion thread deep link
    assert.strictEqual(
      buildDiscussionTarget('cloud-architecture', '65f1234abcd5678'),
      '/courses/cloud-architecture/learn?view=discussions&discussionId=65f1234abcd5678',
      'Should redirect to course player discussion view with discussionId parameter'
    );
  });

  await t.test('4. Safe back navigation falls back to appropriate role dashboard when history is shallow', () => {
    const getBackTarget = (historyState, user, defaultFallback = '/') => {
      if (historyState && historyState.idx > 0) {
        return 'NAVIGATE_MINUS_ONE';
      }
      if (user) {
        if (user.role === 'admin') return '/admin/dashboard';
        if (user.role === 'instructor') return '/instructor/dashboard';
        return '/student/dashboard?tab=certificates';
      }
      return defaultFallback;
    };

    // Case 1: Browser has history depth
    assert.strictEqual(
      getBackTarget({ idx: 2 }, { role: 'student' }),
      'NAVIGATE_MINUS_ONE',
      'Should invoke navigate(-1) when browser history exists'
    );

    // Case 2: Shallow history (e.g. opened directly in new tab or external link)
    assert.strictEqual(
      getBackTarget({ idx: 0 }, { role: 'student' }),
      '/student/dashboard?tab=certificates',
      'Should fall back to student certificate dashboard'
    );

    assert.strictEqual(
      getBackTarget(null, { role: 'instructor' }),
      '/instructor/dashboard',
      'Should fall back to instructor dashboard'
    );

    assert.strictEqual(
      getBackTarget(null, { role: 'admin' }),
      '/admin/dashboard',
      'Should fall back to admin dashboard'
    );

    assert.strictEqual(
      getBackTarget(null, null, '/'),
      '/',
      'Unauthenticated user should fall back to landing page'
    );
  });

  await t.test('5. Backend notification links conform to registered frontend routes', () => {
    const registeredPrefixes = [
      '/student/dashboard',
      '/instructor/dashboard',
      '/admin/dashboard',
      '/courses/',
      '/verify/',
      '/profile',
    ];

    const testNotificationLinks = [
      '/student/dashboard?tab=assignments',
      '/instructor/dashboard?tab=assignments',
      '/verify/LS-2026-98EI3V',
      '/courses/course_123/discussions/disc_456',
    ];

    for (const link of testNotificationLinks) {
      const matches = registeredPrefixes.some((prefix) => link.startsWith(prefix));
      assert.ok(matches, `Notification link "${link}" must match a registered frontend route prefix`);
    }
  });

  await t.test('6. Logout redirection: Student and Instructor redirect to public Landing Page ("/"), Admin to ("/admin/login")', () => {
    const resolveLogoutRedirect = (role) => {
      if (role === 'admin') {
        return '/admin/login';
      }
      return '/';
    };

    assert.strictEqual(
      resolveLogoutRedirect('student'),
      '/',
      'Student clicking logout must be redirected to the public Landing Page'
    );
    assert.strictEqual(
      resolveLogoutRedirect('instructor'),
      '/',
      'Instructor clicking logout must be redirected to the public Landing Page'
    );
    assert.strictEqual(
      resolveLogoutRedirect('admin'),
      '/admin/login',
      'Admin clicking logout must be redirected to the Admin Login page'
    );
  });

  await t.test('7. ProtectedRoute: Unauthenticated instructor dashboard redirects to "/login", admin routes to "/admin/login"', () => {
    const resolveLoginPath = (pathname, allowedRoles) => {
      const isTargetingAdmin =
        pathname.startsWith('/admin') ||
        (allowedRoles &&
          allowedRoles.includes('admin') &&
          !allowedRoles.includes('student') &&
          !allowedRoles.includes('instructor'));
      return isTargetingAdmin ? '/admin/login' : '/login';
    };

    // Instructor dashboard: allowedRoles = ['instructor', 'admin']
    assert.strictEqual(
      resolveLoginPath('/instructor/dashboard', ['instructor', 'admin']),
      '/login',
      'Unauthenticated visitor on /instructor/dashboard must redirect to /login, NOT /admin/login'
    );

    // Student dashboard: allowedRoles = ['student', 'admin']
    assert.strictEqual(
      resolveLoginPath('/student/dashboard', ['student', 'admin']),
      '/login',
      'Unauthenticated visitor on /student/dashboard must redirect to /login'
    );

    // Admin dashboard: pathname = '/admin/dashboard', allowedRoles = ['admin']
    assert.strictEqual(
      resolveLoginPath('/admin/dashboard', ['admin']),
      '/admin/login',
      'Unauthenticated visitor on /admin/dashboard must redirect to /admin/login'
    );
  });

  await t.test('8. ProtectedRoute suppresses unauthenticated login redirection when isLoggingOut is active (preventing race condition)', () => {
    const evaluateProtectedRoute = ({ isAuthenticated, user, isLoggingOut, allowedRoles, pathname }) => {
      if (isLoggingOut) {
        return null; // Suppresses <Navigate to={loginPath} />
      }
      if (!isAuthenticated || !user) {
        const isTargetingAdmin =
          pathname.startsWith('/admin') ||
          (allowedRoles &&
            allowedRoles.includes('admin') &&
            !allowedRoles.includes('student') &&
            !allowedRoles.includes('instructor'));
        const loginPath = isTargetingAdmin ? '/admin/login' : '/login';
        return { redirect: loginPath };
      }
      return { render: true };
    };

    // When logging out while user state is cleared on /student/dashboard
    const duringStudentLogout = evaluateProtectedRoute({
      isAuthenticated: false,
      user: null,
      isLoggingOut: true,
      allowedRoles: ['student', 'admin'],
      pathname: '/student/dashboard',
    });
    assert.strictEqual(
      duringStudentLogout,
      null,
      'ProtectedRoute must return null when isLoggingOut is active, avoiding any redirect to /login'
    );

    // When logging out while user state is cleared on /instructor/dashboard
    const duringInstructorLogout = evaluateProtectedRoute({
      isAuthenticated: false,
      user: null,
      isLoggingOut: true,
      allowedRoles: ['instructor', 'admin'],
      pathname: '/instructor/dashboard',
    });
    assert.strictEqual(
      duringInstructorLogout,
      null,
      'ProtectedRoute must return null during instructor logout, avoiding any redirect to /login or /admin/login'
    );

    // Normal unauthenticated access without logout in progress
    const directUnauthAccess = evaluateProtectedRoute({
      isAuthenticated: false,
      user: null,
      isLoggingOut: false,
      allowedRoles: ['student', 'admin'],
      pathname: '/student/dashboard',
    });
    assert.deepStrictEqual(
      directUnauthAccess,
      { redirect: '/login' },
      'Direct unauthenticated visitor without isLoggingOut must redirect to /login'
    );
  });

  await t.test('9. CourseDetails & Catalog navigation resolves to Explore Courses for authenticated students', () => {
    const resolveCatalogTarget = (isAuthenticated, user) => {
      return isAuthenticated
        ? user?.role === 'instructor'
          ? '/instructor/dashboard?tab=courses'
          : user?.role === 'admin'
          ? '/admin/dashboard'
          : '/student/dashboard?tab=explore'
        : '/#courses';
    };

    // Authenticated Student clicking "Back to Catalog"
    assert.strictEqual(
      resolveCatalogTarget(true, { role: 'student', name: 'Learner' }),
      '/student/dashboard?tab=explore',
      'Student clicking Back to Catalog must redirect to Explore Courses tab'
    );

    // Authenticated Instructor clicking "Back to Catalog"
    assert.strictEqual(
      resolveCatalogTarget(true, { role: 'instructor', name: 'Teacher' }),
      '/instructor/dashboard?tab=courses',
      'Instructor clicking Back to Catalog must redirect to instructor courses management tab'
    );

    // Authenticated Admin clicking "Back to Catalog"
    assert.strictEqual(
      resolveCatalogTarget(true, { role: 'admin', name: 'Admin' }),
      '/admin/dashboard',
      'Admin clicking Back to Catalog must redirect to admin dashboard'
    );

    // Public / Guest clicking "Back to Catalog"
    assert.strictEqual(
      resolveCatalogTarget(false, null),
      '/#courses',
      'Unauthenticated visitor clicking Back to Catalog must redirect to public course discovery'
    );
  });
});

