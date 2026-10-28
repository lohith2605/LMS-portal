import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { notificationService } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { NotificationContext } from './notificationContextInstance';

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const initialFetchDoneRef = useRef(false);

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
      setNotifications((prev) => [notif, ...prev.filter((n) => n._id !== notif._id)]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [user, fetchNotifications, fetchUnreadCount]);

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
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
