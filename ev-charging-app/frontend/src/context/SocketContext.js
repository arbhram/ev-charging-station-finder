import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/miscServices';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket,        setSocket]        = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const { user, isAuthenticated } = useAuth();

  // Load persisted notifications from API on login
  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getAll({ limit: 30 });
      const list = data.data || [];
      setNotifications(list);
      setUnreadCount(data.unreadCount ?? list.filter((n) => !n.isRead).length);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Fetch existing notifications
    loadNotifications();

    // Open Socket.IO connection
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      newSocket.emit('join', user.id || user._id);
    });

    // Incoming real-time notification — prepend and bump count
    newSocket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    newSocket.on('station_update', (data) => {
      console.log('Station update:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave', user.id || user._id);
      newSocket.close();
    };
  }, [isAuthenticated, user]); // eslint-disable-line

  // Mark a single notification as read (locally + API)
  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try { await notificationService.markAsRead(id); } catch { /* ignore */ }
  }, []);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try { await notificationService.markAllAsRead(); } catch { /* ignore */ }
  }, []);

  // Remove a notification
  const removeNotification = useCallback(async (id) => {
    setNotifications((prev) => {
      const n = prev.find((x) => x._id === id);
      if (n && !n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((x) => x._id !== id);
    });
    try { await notificationService.delete(id); } catch { /* ignore */ }
  }, []);

  const value = {
    socket,
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    removeNotification,
    loadNotifications,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
