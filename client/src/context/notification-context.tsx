import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  notificationService, 
  NotificationService 
} from '@/lib/notification-service';

// Re-export types for convenience
export type { NotificationOptions, StoredNotification, NotificationCategory } from '@/lib/notification-service';

interface NotificationContextValue {
  showNotification: (options: any) => Promise<boolean>;
  notifications: any[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // Initialize
    updateNotificationState();

    // Add listener for new notifications
    const removeListener = notificationService.addListener(() => {
      updateNotificationState();
    });

    return () => {
      removeListener();
    };
  }, []);

  const updateNotificationState = () => {
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());
  };

  const showNotification = async (options: any) => {
    const result = await notificationService.showNotification(options);
    updateNotificationState();
    return result;
  };

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
    updateNotificationState();
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
    updateNotificationState();
  };

  const clearAll = () => {
    notificationService.clearAll();
    updateNotificationState();
  };

  const value = {
    showNotification,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};