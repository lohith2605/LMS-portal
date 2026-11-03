const test = require('node:test');
const assert = require('node:assert');

// Authoritative Session Policy Constants matching AuthContext.jsx
const INACTIVITY_TIMEOUT_SECONDS = 10 * 60; // 600 seconds
const WARNING_WINDOW_SECONDS = 3 * 60; // 180 seconds
const WARNING_THRESHOLD_SECONDS = INACTIVITY_TIMEOUT_SECONDS - WARNING_WINDOW_SECONDS; // 420 seconds (7 minutes)

/**
 * Creates an instance of the AuthContext inactivity state machine
 * reproducing the exact logic and ref-synchronization implemented in AuthContext.jsx.
 */
function createInactivityTracker({ initialTime = 1000000, initialUserId = 'user_abc' } = {}) {
  let currentTime = initialTime;
  let isTimeoutWarningOpen = false;
  let countdownSeconds = WARNING_WINDOW_SECONDS;
  let isRefreshingSession = false;
  let loggedOut = false;
  let logoutReason = null;
  let sessionRefreshedOnServer = false;

  const isTimeoutWarningOpenRef = { current: false };
  const lastActivityRef = { current: currentTime };
  const lastThrottleRef = { current: 0 };
  const lastKeepAliveRef = { current: currentTime };
  const hadInteractionRef = { current: false };

  const handleInactivityLogout = () => {
    loggedOut = true;
    logoutReason = 'inactivity';
    isTimeoutWarningOpen = false;
    isTimeoutWarningOpenRef.current = false;
  };

  const recordUserActivity = () => {
    const now = currentTime;
    if (now - lastThrottleRef.current < 1000) return;
    lastThrottleRef.current = now;

    // Stable callback reads from ref: ignored while warning is open
    if (!isTimeoutWarningOpenRef.current) {
      lastActivityRef.current = now;
      hadInteractionRef.current = true;
    }
  };

  const tickerTick = () => {
    const inactiveSeconds = Math.floor((currentTime - lastActivityRef.current) / 1000);

    // 1. Inactivity timeout reached (10 minutes)
    if (inactiveSeconds >= INACTIVITY_TIMEOUT_SECONDS) {
      handleInactivityLogout();
    }
    // 2. Warning window active (between 7 and 10 minutes)
    else if (inactiveSeconds >= WARNING_THRESHOLD_SECONDS) {
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - inactiveSeconds);
      countdownSeconds = remaining;
      if (!isTimeoutWarningOpenRef.current) {
        isTimeoutWarningOpenRef.current = true;
        isTimeoutWarningOpen = true;
      }
    }
    // 3. Normal active state (< 7 minutes)
    else {
      if (isTimeoutWarningOpenRef.current) {
        isTimeoutWarningOpenRef.current = false;
        isTimeoutWarningOpen = false;
      }
    }
  };

  const staySignedIn = async (mockApi) => {
    isRefreshingSession = true;
    try {
      await mockApi.refreshSession();
      sessionRefreshedOnServer = true;
      lastActivityRef.current = currentTime;
      lastKeepAliveRef.current = currentTime;
      hadInteractionRef.current = false;
      isTimeoutWarningOpenRef.current = false;
      isTimeoutWarningOpen = false;
      countdownSeconds = WARNING_WINDOW_SECONDS;
    } catch (err) {
      if (err.response?.status === 401) {
        loggedOut = true;
        logoutReason = 'expired';
        isTimeoutWarningOpenRef.current = false;
        isTimeoutWarningOpen = false;
      }
      // Non-401 errors: modal stays open, timer is NOT reset
    } finally {
      isRefreshingSession = false;
    }
  };

  return {
    advanceTime: (seconds) => {
      currentTime += seconds * 1000;
    },
    tick: tickerTick,
    recordUserActivity,
    staySignedIn,
    getState: () => ({
      currentTime,
      isTimeoutWarningOpen,
      isTimeoutWarningOpenRef: isTimeoutWarningOpenRef.current,
      countdownSeconds,
      isRefreshingSession,
      loggedOut,
      logoutReason,
      lastActivity: lastActivityRef.current,
      hadInteraction: hadInteractionRef.current,
      sessionRefreshedOnServer,
    }),
  };
}

test('1. Inactivity tracking: Warning modal opens at exactly 7 minutes (420s) with 180s countdown', () => {
  const tracker = createInactivityTracker({ initialTime: 1000000 });

  // Advance to 6 minutes and 59 seconds (419s)
  tracker.advanceTime(419);
  tracker.tick();
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, false);
  assert.strictEqual(tracker.getState().countdownSeconds, 180);

  // Advance 1 more second to 7 minutes (420s)
  tracker.advanceTime(1);
  tracker.tick();
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true, 'Warning modal must open at 420s');
  assert.strictEqual(tracker.getState().isTimeoutWarningOpenRef, true, 'Ref must synchronize with state');
  assert.strictEqual(tracker.getState().countdownSeconds, 180, 'Initial countdown must be 180s (03:00)');
});

test('2. REGRESSION FIX: Opening the warning does NOT reset lastActivity timestamp or dismiss modal', () => {
  const initialTime = 2000000;
  const tracker = createInactivityTracker({ initialTime });

  // Advance to 420s (modal opens)
  tracker.advanceTime(420);
  tracker.tick();

  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true);
  assert.strictEqual(tracker.getState().lastActivity, initialTime, 'lastActivity must remain at initial timestamp');

  // Next second (421s elapsed)
  tracker.advanceTime(1);
  tracker.tick();

  // In the buggy implementation, lastActivity was reset to 420s, causing inactiveSeconds to evaluate to 1s
  // and immediately setting isTimeoutWarningOpen to false.
  // With the fix, the modal MUST remain open and countdown must tick to 179s.
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true, 'Modal must NOT disappear on subsequent tick');
  assert.strictEqual(tracker.getState().countdownSeconds, 179, 'Countdown must advance from 180s to 179s');

  // Next 5 seconds (426s total elapsed)
  for (let i = 0; i < 5; i++) {
    tracker.advanceTime(1);
    tracker.tick();
  }

  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true, 'Modal must stay open continuously');
  assert.strictEqual(tracker.getState().countdownSeconds, 174, 'Countdown must reach 174s (02:54)');
});

test('3. User activity (mouse/key/scroll) while warning is open does NOT dismiss warning or extend session', () => {
  const initialTime = 3000000;
  const tracker = createInactivityTracker({ initialTime });

  // Enter warning state (425s)
  tracker.advanceTime(425);
  tracker.tick();
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true);
  assert.strictEqual(tracker.getState().countdownSeconds, 175);

  // User moves mouse or scrolls while warning is visible
  tracker.advanceTime(1);
  tracker.recordUserActivity();
  tracker.tick();

  // Activity must have been ignored: lastActivity must NOT be updated and modal must remain open
  assert.strictEqual(tracker.getState().lastActivity, initialTime, 'lastActivity must not change on mousemove during warning');
  assert.strictEqual(tracker.getState().hadInteraction, false, 'hadInteraction must not be set during warning');
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true, 'Modal must remain open');
  assert.strictEqual(tracker.getState().countdownSeconds, 174, 'Countdown must continue decrementing');
});

test('4. Ignoring the warning counts down to 0 and triggers authoritative inactivity logout at 600s', () => {
  const initialTime = 4000000;
  const tracker = createInactivityTracker({ initialTime });

  // Advance to 599s (1 second before full 10-minute timeout)
  tracker.advanceTime(599);
  tracker.tick();
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true);
  assert.strictEqual(tracker.getState().countdownSeconds, 1, 'Only 1 second remaining');
  assert.strictEqual(tracker.getState().loggedOut, false);

  // Advance to 600s (full 10-minute inactivity timeout)
  tracker.advanceTime(1);
  tracker.tick();

  assert.strictEqual(tracker.getState().loggedOut, true, 'User must be logged out at 600s');
  assert.strictEqual(tracker.getState().logoutReason, 'inactivity');
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, false, 'Modal closes on logout');
});

test('5. Explicit "Stay Signed In" button click refreshes session, closes modal, and resets timer', async () => {
  const initialTime = 5000000;
  const tracker = createInactivityTracker({ initialTime });

  // Advance to 450s (warning open, 150s remaining)
  tracker.advanceTime(450);
  tracker.tick();
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true);
  assert.strictEqual(tracker.getState().countdownSeconds, 150);

  // Mock successful server session refresh API response
  const mockApi = {
    refreshSession: async () => ({ success: true, message: 'Session refreshed' }),
  };

  await tracker.staySignedIn(mockApi);

  const state = tracker.getState();
  assert.strictEqual(state.sessionRefreshedOnServer, true, 'Server session must be touched');
  assert.strictEqual(state.isTimeoutWarningOpen, false, 'Modal must close after successful Stay Signed In');
  assert.strictEqual(state.countdownSeconds, 180, 'Countdown must reset to 180s');
  assert.strictEqual(state.lastActivity, state.currentTime, 'lastActivity must be advanced to current time');

  // Verify next tick operates in normal active state
  tracker.advanceTime(1);
  tracker.tick();
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, false);
});

test('6. "Stay Signed In" with 401 response (already expired server-side) safely logs out user', async () => {
  const initialTime = 6000000;
  const tracker = createInactivityTracker({ initialTime });

  tracker.advanceTime(450);
  tracker.tick();
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true);

  // Mock 401 expired response from server
  const mockApi = {
    refreshSession: async () => {
      const err = new Error('Session has expired');
      err.response = { status: 401 };
      throw err;
    },
  };

  await tracker.staySignedIn(mockApi);

  assert.strictEqual(tracker.getState().loggedOut, true, 'Expired session must redirect to logout');
  assert.strictEqual(tracker.getState().logoutReason, 'expired');
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, false);
});

test('7. "Stay Signed In" with network error keeps modal open and does not falsely extend session', async () => {
  const initialTime = 7000000;
  const tracker = createInactivityTracker({ initialTime });

  tracker.advanceTime(450);
  tracker.tick();
  assert.strictEqual(tracker.getState().isTimeoutWarningOpen, true);
  assert.strictEqual(tracker.getState().countdownSeconds, 150);

  // Mock transient network failure
  const mockApi = {
    refreshSession: async () => {
      const err = new Error('Network Error: Failed to fetch');
      err.response = { status: 0 };
      throw err;
    },
  };

  await tracker.staySignedIn(mockApi);

  const state = tracker.getState();
  assert.strictEqual(state.loggedOut, false, 'Transient error should not instantly log out');
  assert.strictEqual(state.isTimeoutWarningOpen, true, 'Modal must remain open so user can retry');
  assert.strictEqual(state.lastActivity, initialTime, 'lastActivity must NOT be falsely advanced on failure');
});

