import React, { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';
import { AuthContext } from './authContextInstance';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
   * Perform login and set user state
   */
  const login = async ({ email, password }) => {
    setError(null);
    try {
      const data = await authService.login({ email, password });
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.normalizedMessage);
      throw err;
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
   * Log out, clear cookie, and reset user state
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout error:', err.message);
    } finally {
      setUser(null);
      setError(null);
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
    register,
    logout,
    checkAuth,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
