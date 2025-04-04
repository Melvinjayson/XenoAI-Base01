/**
 * Notification Service
 * Manages browser push notifications and application notifications
 */

type NotificationPermissionStatus = 'default' | 'granted' | 'denied';
type NotificationCategory = 'insight' | 'research' | 'task' | 'system' | 'productivity';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  category?: NotificationCategory;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface StoredNotification extends NotificationOptions {
  id: string;
  timestamp: number;
  read: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private permissionStatus: NotificationPermissionStatus = 'default';
  private notificationHistory: StoredNotification[] = [];
  private listeners: Array<(notification: StoredNotification) => void> = [];
  private readonly HISTORY_LIMIT = 50;

  private constructor() {
    this.init();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async init() {
    try {
      // Check if the browser supports notifications
      if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return;
      }

      // Check permission status
      this.permissionStatus = Notification.permission as NotificationPermissionStatus;
      
      // Load notification history from localStorage
      this.loadNotificationHistory();
      
      // Register service worker for push notifications if available
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          console.log('Service Worker ready for push notifications');
          
          // Listen for push notifications
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
              this.handlePushNotification(event.data.notification);
            }
          });
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  /**
   * Request permission to show notifications
   * @returns Promise<NotificationPermissionStatus>
   */
  public async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (this.permissionStatus !== 'granted') {
      try {
        const permission = await Notification.requestPermission();
        this.permissionStatus = permission as NotificationPermissionStatus;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }

    return this.permissionStatus;
  }

  /**
   * Show a notification
   * @param options NotificationOptions
   * @returns Promise<boolean> Whether the notification was shown
   */
  public async showNotification(options: NotificationOptions): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      this.storeNotification(options);
      return false;
    }

    if (this.permissionStatus !== 'granted') {
      this.permissionStatus = await this.requestPermission();
      if (this.permissionStatus !== 'granted') {
        // Still store the notification for in-app display
        this.storeNotification(options);
        return false;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge,
        tag: options.tag,
        data: {
          ...options.data,
          category: options.category || 'system',
          timestamp: Date.now()
        },
        requireInteraction: options.requireInteraction,
        renotify: options.renotify,
        silent: options.silent,
        actions: options.actions
      });

      // Handle notification clicks
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // Execute any action based on the notification data
        if (notification.data && typeof notification.data.onClick === 'function') {
          notification.data.onClick();
        }
      };

      this.storeNotification(options);
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      this.storeNotification(options);
      return false;
    }
  }

  /**
   * Store a notification in history
   * @param options NotificationOptions
   */
  private storeNotification(options: NotificationOptions): StoredNotification {
    const notification: StoredNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
      ...options,
    };

    this.notificationHistory.unshift(notification);
    
    // Limit history size
    if (this.notificationHistory.length > this.HISTORY_LIMIT) {
      this.notificationHistory = this.notificationHistory.slice(0, this.HISTORY_LIMIT);
    }

    // Save to localStorage
    this.saveNotificationHistory();

    // Notify listeners
    this.notifyListeners(notification);
    
    return notification;
  }

  /**
   * Handle push notification from service worker
   * @param data Notification data
   */
  private handlePushNotification(data: any) {
    const options: NotificationOptions = {
      title: data.title || 'Xeno AI',
      body: data.body || '',
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      category: data.category || 'system',
      requireInteraction: data.requireInteraction,
      renotify: data.renotify,
      silent: data.silent,
      actions: data.actions
    };

    this.storeNotification(options);
  }

  /**
   * Save notification history to localStorage
   */
  private saveNotificationHistory() {
    try {
      localStorage.setItem('notification_history', JSON.stringify(this.notificationHistory));
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }

  /**
   * Load notification history from localStorage
   */
  private loadNotificationHistory() {
    try {
      const history = localStorage.getItem('notification_history');
      if (history) {
        this.notificationHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
      this.notificationHistory = [];
    }
  }

  /**
   * Notify all listeners about a new notification
   * @param notification StoredNotification
   */
  private notifyListeners(notification: StoredNotification) {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Add a notification listener
   * @param listener Function to call when a new notification is received
   * @returns Function to remove the listener
   */
  public addListener(listener: (notification: StoredNotification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get all notifications
   * @param category Optional category to filter by
   * @returns StoredNotification[]
   */
  public getNotifications(category?: NotificationCategory): StoredNotification[] {
    if (category) {
      return this.notificationHistory.filter(n => n.category === category);
    }
    return [...this.notificationHistory];
  }

  /**
   * Mark a notification as read
   * @param id Notification ID
   */
  public markAsRead(id: string): void {
    const notification = this.notificationHistory.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveNotificationHistory();
    }
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): void {
    this.notificationHistory.forEach(n => {
      n.read = true;
    });
    this.saveNotificationHistory();
  }

  /**
   * Clear all notifications
   */
  public clearAll(): void {
    this.notificationHistory = [];
    this.saveNotificationHistory();
  }

  /**
   * Get unread notification count
   * @param category Optional category to filter by
   * @returns number
   */
  public getUnreadCount(category?: NotificationCategory): number {
    if (category) {
      return this.notificationHistory.filter(n => !n.read && n.category === category).length;
    }
    return this.notificationHistory.filter(n => !n.read).length;
  }
}

export const notificationService = NotificationService.getInstance();