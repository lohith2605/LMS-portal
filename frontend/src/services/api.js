import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to normalize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'A network or server error occurred. Please try again.';

    if (error.response && error.response.data) {
      errorMessage =
        error.response.data.error ||
        error.response.data.message ||
        errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }

    error.normalizedMessage = errorMessage;
    return Promise.reject(error);
  }
);

export const authService = {
  /**
   * Register a new account
   */
  register: async ({ name, email, password, role = 'student' }) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    return res.data;
  },

  /**
   * Log in with credentials
   */
  login: async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  /**
   * Log out and clear session cookie
   */
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  /**
   * Fetch currently authenticated user profile
   */
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  /**
   * Request password reset instructions
   */
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  /**
   * Submit new password with reset token
   */
  resetPassword: async ({ token, newPassword }) => {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    return res.data;
  },

  /**
   * Change password for authenticated session
   */
  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await api.patch('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },

  /**
   * Verify email address with token
   */
  verifyEmail: async (token) => {
    const res = await api.post('/auth/verify-email', { token });
    return res.data;
  },
};

export default api;
