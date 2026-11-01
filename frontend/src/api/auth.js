import { authService, sessionService } from '../services/api';

/**
 * Authentication & Session Management Client API
 * Bridges application components to session control and authentication endpoints.
 */

export const refreshSession = async () => {
  return sessionService.refreshSession();
};

export const logout = async () => {
  return authService.logout();
};

export const getCurrentSession = async () => {
  return sessionService.getCurrentSession();
};

export const getSessions = async () => {
  return sessionService.getSessions();
};

export const revokeSession = async (sessionId) => {
  return sessionService.revokeSession(sessionId);
};

export const revokeOtherSessions = async () => {
  return sessionService.revokeOtherSessions();
};

export { authService, sessionService };
export default {
  refreshSession,
  logout,
  getCurrentSession,
  getSessions,
  revokeSession,
  revokeOtherSessions,
  authService,
  sessionService,
};

