import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { notificationService } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { NotificationContext } from './notificationContextInstance';
import NotificationToastContainer from '../components/ui/NotificationToastContainer';
import {
  showDesktopNotification,
  registerNotificationServiceWorker,
} from '../utils/desktopNotification';

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const initialFetchDoneRef = useRef(false);
  const processedNotificationIdsRef = useRef(new Set());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleToastNavigate = useCallback((link) => {
    if (link) {
      navigate(link);
    }
  }, [navigate]);

  // Listen for desktop notification navigation events relayed by Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    registerNotificationServiceWorker();

    if (typeof navigator.serviceWorker.startMessages === 'function') {
      navigator.serviceWorker.startMessages();
    }

    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_NAVIGATE' && event.data.link) {
        handleToastNavigate(event.data.link);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [handleToastNavigate]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationService.getUnreadCount();
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Ignore background refresh failure
    }
  }, [user]);

  const fetchNotifications = useCallback(async (params = { limit: 20 }) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await notificationService.getNotifications(params);
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (err) {
      setError(err.normalizedMessage || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Connect socket and register listener when authenticated
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setToasts([]);
      processedNotificationIdsRef.current.clear();
      initialFetchDoneRef.current = false;
      disconnectSocket();
      return;
    }

    // Load initial notification data
    fetchNotifications({ limit: 20 });
    fetchUnreadCount();

    // Initialize socket connection
    const socket = connectSocket();

    const handleNewNotification = (notif) => {
      if (!notif || !notif._id) return;
      const notifId = String(notif._id);

      // Deduplicate: ignore if this exact notification ID was already received/processed recently
      if (processedNotificationIdsRef.current.has(notifId)) {
        return;
      }
      processedNotificationIdsRef.current.add(notifId);

      // Bound set size to prevent unbounded memory usage
      if (processedNotificationIdsRef.current.size > 200) {
        const first = processedNotificationIdsRef.current.values().next().value;
        processedNotificationIdsRef.current.delete(first);
      }

      setNotifications((prev) => {
        const exists = prev.some((n) => String(n._id) === notifId);
        if (exists) {
          return prev;
        }
        return [notif, ...prev];
      });

      // Increment unread count only for genuinely new unread notifications
      if (!notif.isRead) {
        setUnreadCount((prev) => prev + 1);
      }

      // 1. In-app toast popup
      setToasts((prev) => [
        {
          id: notifId,
          title: notif.title || 'New Notification',
          message: notif.message || '',
          link: notif.link || '',
          type: notif.type,
          createdAt: notif.createdAt || new Date(),
        },
        ...prev.filter((t) => t.id !== notifId),
      ]);

      // 2. Browser/Windows desktop notification (deduplicated across tabs)
      showDesktopNotification(notif, handleToastNavigate);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [user, fetchNotifications, fetchUnreadCount, handleToastNavigate]);

  const markAsRead = useCallback(async (id) => {
    if (!id) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationService.markAsRead(id);
    } catch {
      // Fallback: sync state with server
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch {
      // Fallback: sync state with server
      fetchNotifications({ limit: 20 });
      fetchUnreadCount();
    }
  }, [fetchNotifications, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    error,
    toasts,
    dismissToast,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onNavigate={handleToastNavigate}
      />
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
