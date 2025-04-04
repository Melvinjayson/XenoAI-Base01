/**
 * Notification Service
 * Manages browser push notifications and application notifications
 */

type NotificationPermissionStatus = 'default' | 'granted' | 'denied';
export type NotificationCategory = 'insight' | 'research' | 'task' | 'system' | 'productivity';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  category?: NotificationCategory;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface StoredNotification extends NotificationOptions {
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
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    // Load permission status
    this.permissionStatus = Notification.permission as NotificationPermissionStatus;
    
    // Load notification history from localStorage
    this.loadNotificationHistory();

    // Register service worker for push notifications if available
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered with scope:', registration.scope);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
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
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission as NotificationPermissionStatus;
    }

    return this.permissionStatus;
  }

  /**
   * Show a notification
   * @param options NotificationOptions
   * @returns Promise<boolean> Whether the notification was shown
   */
  public async showNotification(options: NotificationOptions): Promise<boolean> {
    // Store notification in history first
    const notification = this.storeNotification(options);
    
    // Notify listeners
    this.notifyListeners(notification);

    // Check if we should attempt to display a browser notification
    if (!('Notification' in window)) {
      return false;
    }

    if (this.permissionStatus !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }

    try {
      // Show browser notification
      const browserNotification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag,
        data: { ...options.data, id: notification.id },
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      });

      browserNotification.onclick = () => {
        // Mark as read when clicked
        this.markAsRead(notification.id);
        
        // Focus window
        window.focus();
        
        // Close notification
        browserNotification.close();
      };

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  /**
   * Store a notification in history
   * @param options NotificationOptions
   */
  private storeNotification(options: NotificationOptions): StoredNotification {
    const notification: StoredNotification = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false,
      ...options
    };

    // Add to history (at the beginning)
    this.notificationHistory.unshift(notification);
    
    // Limit history size
    if (this.notificationHistory.length > this.HISTORY_LIMIT) {
      this.notificationHistory = this.notificationHistory.slice(0, this.HISTORY_LIMIT);
    }

    // Save to localStorage
    this.saveNotificationHistory();

    return notification;
  }

  /**
   * Handle push notification from service worker
   * @param data Notification data
   */
  private handlePushNotification(data: any) {
    const options: NotificationOptions = {
      title: data.title || 'New Notification',
      body: data.body || '',
      icon: data.icon,
      badge: data.badge,
      data: data.data || {},
      category: data.category
    };

    this.showNotification(options);
  }

  /**
   * Save notification history to localStorage
   */
  private saveNotificationHistory() {
    try {
      localStorage.setItem('notification_history', JSON.stringify(this.notificationHistory));
    } catch (error) {
      console.error('Failed to save notification history:', error);
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
      console.error('Failed to load notification history:', error);
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
        console.error('Notification listener error:', error);
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
    return this.notificationHistory;
  }

  /**
   * Mark a notification as read
   * @param id Notification ID
   */
  public markAsRead(id: string): void {
    const index = this.notificationHistory.findIndex(n => n.id === id);
    if (index >= 0) {
      this.notificationHistory[index].read = true;
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
      return this.notificationHistory.filter(n => n.category === category && !n.read).length;
    }
    return this.notificationHistory.filter(n => !n.read).length;
  }
}

export const notificationService = NotificationService.getInstance();