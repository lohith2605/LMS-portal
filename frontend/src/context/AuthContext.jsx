import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, sessionService } from '../services/api';
import { disconnectSocket } from '../services/socket';
import SessionTimeoutModal from '../components/SessionTimeoutModal';
import { AuthContext } from './authContextInstance';

// Authoritative LearnSpace Session Inactivity Policy:
// - 10-minute inactivity timeout (600 seconds)
// - 3-minute warning countdown (180 seconds, triggered after 7 minutes of inactivity)
// - 8-hour absolute session lifetime
const INACTIVITY_TIMEOUT_SECONDS = 10 * 60; // 600 seconds
const WARNING_WINDOW_SECONDS = 3 * 60; // 180 seconds
const WARNING_THRESHOLD_SECONDS = INACTIVITY_TIMEOUT_SECONDS - WARNING_WINDOW_SECONDS; // 420 seconds (7 minutes)
const KEEP_ALIVE_INTERVAL_SECONDS = 3 * 60; // 180 seconds (throttled sliding keep-alive when actively learning)

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inactivity tracking state
  const [isTimeoutWarningOpen, setIsTimeoutWarningOpen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(WARNING_WINDOW_SECONDS);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);

  const lastActivityRef = useRef(0);
  const lastThrottleRef = useRef(0);
  const lastKeepAliveRef = useRef(0);
  const hadInteractionRef = useRef(false);

  /**
   * Log out, clear cookie, and reset user state
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout error:', err.message);
    } finally {
      disconnectSocket();
      setUser(null);
      setError(null);
      setIsTimeoutWarningOpen(false);
    }
  };

  /**
   * Authoritative Inactivity Logout Handler
   */
  const handleInactivityLogout = useCallback(async () => {
    const role = user?.role;
    try {
      await sessionService.revokeSession('current');
    } catch {
      // In case session is already revoked or expired server-side
    } finally {
      disconnectSocket();
      setUser(null);
      setIsTimeoutWarningOpen(false);
      const targetLogin = role === 'admin' ? '/admin/login?reason=inactivity' : '/login?reason=inactivity';
      navigate(targetLogin, { replace: true });
    }
  }, [user, navigate]);

  /**
   * Genuine user activity recorder (throttled to 1000ms)
   */
  const recordUserActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current < 1000) return;
    lastThrottleRef.current = now;

    // Only update activity timestamp if warning modal is not currently active
    // (If the modal is visible, user must explicitly click "Stay Signed In")
    if (!isTimeoutWarningOpen) {
      lastActivityRef.current = now;
      hadInteractionRef.current = true;
    }
  }, [isTimeoutWarningOpen]);

  /**
   * Inactivity and Learning Continuity Monitor
   */
  useEffect(() => {
    if (!user) {
      setIsTimeoutWarningOpen(false);
      setCountdownSeconds(WARNING_WINDOW_SECONDS);
      return;
    }

    // Reset activity timestamps when authenticated session initializes
    lastActivityRef.current = Date.now();
    lastKeepAliveRef.current = Date.now();
    hadInteractionRef.current = false;

    const activityEvents = [
      'mousemove',
      'mousedown',
      'click',
      'keydown',
      'touchstart',
      'touchmove',
      'scroll',
      'wheel',
    ];

    const mediaEvents = [
      'play',
      'pause',
      'seeking',
      'seeked',
      'volumechange',
      'ratechange',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordUserActivity, { passive: true });
    });

    mediaEvents.forEach((evt) => {
      document.addEventListener(evt, recordUserActivity, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const inactiveSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
        if (inactiveSeconds >= INACTIVITY_TIMEOUT_SECONDS) {
          handleInactivityLogout();
        } else if (inactiveSeconds >= WARNING_THRESHOLD_SECONDS) {
          const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - inactiveSeconds);
          setCountdownSeconds(remaining);
          setIsTimeoutWarningOpen(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 1-second authoritative client ticker
    const timer = setInterval(() => {
      const inactiveSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);

      // 1. Inactivity timeout reached (10 minutes)
      if (inactiveSeconds >= INACTIVITY_TIMEOUT_SECONDS) {
        handleInactivityLogout();
      }
      // 2. Warning window active (between 7 and 10 minutes)
      else if (inactiveSeconds >= WARNING_THRESHOLD_SECONDS) {
        const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - inactiveSeconds);
        setCountdownSeconds(remaining);
        setIsTimeoutWarningOpen(true);
      }
      // 3. Normal active state (< 7 minutes)
      else {
        setIsTimeoutWarningOpen(false);

        // Learning continuity: If active learner interactions occurred, periodically slide the server idle window
        const timeSinceKeepAlive = Date.now() - lastKeepAliveRef.current;
        if (hadInteractionRef.current && timeSinceKeepAlive >= KEEP_ALIVE_INTERVAL_SECONDS * 1000) {
          lastKeepAliveRef.current = Date.now();
          hadInteractionRef.current = false;
          sessionService.refreshSession().catch((err) => {
            if (err.response?.status === 401) {
              handleInactivityLogout();
            }
          });
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordUserActivity);
      });
      mediaEvents.forEach((evt) => {
        document.removeEventListener(evt, recordUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(timer);
    };
  }, [user, recordUserActivity, handleInactivityLogout]);

  /**
   * "Stay Signed In" Button Click Handler
   */
  const handleStaySignedIn = async () => {
    setIsRefreshingSession(true);
    try {
      await sessionService.refreshSession();
      // Server successfully refreshed session idle window
      lastActivityRef.current = Date.now();
      lastKeepAliveRef.current = Date.now();
      hadInteractionRef.current = false;
      setIsTimeoutWarningOpen(false);
      setCountdownSeconds(WARNING_WINDOW_SECONDS);
    } catch (err) {
      console.warn('Stay Signed In refresh failed:', err.message);
      // If refresh failed because session has expired or been revoked on the server
      disconnectSocket();
      setUser(null);
      setIsTimeoutWarningOpen(false);
      const targetLogin = user?.role === 'admin' ? '/admin/login?reason=expired' : '/login?reason=expired';
      navigate(targetLogin, { replace: true });
    } finally {
      setIsRefreshingSession(false);
    }
  };

  /**
   * Warning Modal "Log Out" Button Click Handler
   */
  const handleTimeoutLogout = async () => {
    const role = user?.role;
    try {
      await logout();
    } finally {
      disconnectSocket();
      setIsTimeoutWarningOpen(false);
      const targetLogin = role === 'admin' ? '/admin/login' : '/login';
      navigate(targetLogin, { replace: true });
    }
  };

  /**
   * Check for an existing authenticated session on page load
   */
  const checkAuth = useCallback(async () => {
    try {
      setError(null);
      const data = await authService.getMe();
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      // 401 unauthenticated on startup is normal for public visitors
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await authService.getMe();
        if (mounted) {
          if (data && data.user) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Perform login and set user state (Student and Instructor common portal)
   */
  const login = async ({ email, password }) => {
    setError(null);
    try {
      const data = await authService.login({ email, password });
      if (data.user) {
        setUser(data.user);
      }
      return data;
    } catch (err) {
      setError(err.normalizedMessage);
      throw err;
    }
  };

  /**
   * Perform administrator login and set user state (Dedicated Administrator portal)
   */
  const adminLogin = async ({ email, password }) => {
    setError(null);
    try {
      const data = await authService.adminLogin({ email, password });
      if (data.user) {
        setUser(data.user);
      }
      return data;
    } catch (err) {
      setError(err.normalizedMessage);
      throw err;
    }
  };

  /**
   * Log in or register with verified Firebase Google ID token
   */
  const loginWithGoogle = async (idToken) => {
    setError(null);
    try {
      const data = await authService.googleLogin(idToken);
      if (data.user) {
        setUser(data.user);
      }
      return data;
    } catch (err) {
      setError(err.normalizedMessage);
      throw err;
    }
  };

  /**
   * Complete MFA login by saving verified user profile in state
   */
  const completeMfaLogin = (userData) => {
    if (userData) {
      setUser(userData);
    }
  };

  /**
   * Perform registration and set user state if approved
   */
  const register = async ({ name, email, password, role }) => {
    setError(null);
    try {
      const data = await authService.register({ name, email, password, role });
      // If user was granted active session immediately, update user state
      if (data.user && data.user.accountStatus === 'active') {
        setUser(data.user);
      }
      return data;
    } catch (err) {
      setError(err.normalizedMessage);
      throw err;
    }
  };

  /**
   * Refresh current user profile
   */
  const refreshUser = async () => {
    try {
      const data = await authService.getMe();
      if (data && data.user) {
        setUser(data.user);
      }
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  };

  /**
   * Directly update user in context (e.g. after avatar upload or profile change)
   */
  const updateUser = (updatedUser) => {
    setUser((prev) => (typeof updatedUser === 'function' ? updatedUser(prev) : { ...prev, ...updatedUser }));
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    login,
    adminLogin,
    loginWithGoogle,
    completeMfaLogin,
    register,
    logout,
    checkAuth,
    refreshUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {user && (
        <SessionTimeoutModal
          isOpen={isTimeoutWarningOpen}
          countdownSeconds={countdownSeconds}
          onStaySignedIn={handleStaySignedIn}
          onLogout={handleTimeoutLogout}
          isRefreshing={isRefreshingSession}
        />
      )}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
