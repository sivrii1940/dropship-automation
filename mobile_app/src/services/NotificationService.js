/**
 * Bildirim Servisi
 * Uygulama içi bildirimler ve push notification yönetimi
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.listeners = [];
    this.notifications = [];
    this.unreadCount = 0;
    this.pushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize native push notifications
  async initializePushNotifications() {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }

      // Get push token
      this.pushToken = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push Token:', this.pushToken);

      // Setup listeners
      this.setupPushListeners();

      return this.pushToken;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return null;
    }
  }

  setupPushListeners() {
    // Listener for foreground notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Add to in-app notifications
      this.addNotification({
        type: notification.request.content.data?.type || 'info',
        title: notification.request.content.title,
        message: notification.request.content.body,
        icon: notification.request.content.data?.icon || 'notifications',
        color: notification.request.content.data?.color || '#3b82f6',
      });
    });

    // Listener for notification interaction
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // Handle navigation or action
    });
  }

  async sendPushNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge:', error);
    }
  }

  getPushToken() {
    return this.pushToken;
  }

  cleanupPushListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Listener ekle (component'ler için)
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Tüm listener'ları bilgilendir
  notifyListeners() {
    this.listeners.forEach(callback => callback({
      notifications: this.notifications,
      unreadCount: this.unreadCount
    }));
  }

  // Yeni bildirim ekle
  async addNotification(notification) {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };

    this.notifications.unshift(newNotification);
    this.unreadCount++;

    // En fazla 100 bildirim tut
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    await this.saveToStorage();
    this.notifyListeners();

    // Send native push notification if enabled
    if (Device.isDevice) {
      await this.sendPushNotification(notification.title, notification.message, {
        type: notification.type,
        icon: notification.icon,
        color: notification.color,
      });
    }

    // Update badge count
    await this.setBadgeCount(this.unreadCount);

    return newNotification;
  }

  // Bildirim türleri
  async notifyNewOrder(orderNumber, customerName, total) {
    return this.addNotification({
      type: 'new_order',
      title: 'Yeni Sipariş!',
      message: `#${orderNumber} - ${customerName} - $${total}`,
      icon: 'cart',
      color: '#10b981'
    });
  }

  async notifyOrderProcessed(orderNumber) {
    return this.addNotification({
      type: 'order_processed',
      title: 'Sipariş İşlendi',
      message: `#${orderNumber} Trendyol'a hazırlandı`,
      icon: 'checkmark-circle',
      color: '#3b82f6'
    });
  }

  async notifyPaymentPending(orderNumber) {
    return this.addNotification({
      type: 'payment_pending',
      title: 'Ödeme Bekliyor',
      message: `#${orderNumber} için Trendyol'da ödeme yapın`,
      icon: 'card',
      color: '#8b5cf6'
    });
  }

  async notifyStockAlert(productName, status) {
    return this.addNotification({
      type: 'stock_alert',
      title: status === 'out_of_stock' ? 'Stok Bitti!' : 'Stok Güncellendi',
      message: productName,
      icon: status === 'out_of_stock' ? 'warning' : 'cube',
      color: status === 'out_of_stock' ? '#ef4444' : '#f59e0b'
    });
  }

  async notifyError(message) {
    return this.addNotification({
      type: 'error',
      title: 'Hata',
      message: message,
      icon: 'alert-circle',
      color: '#ef4444'
    });
  }

  async notifySuccess(message) {
    return this.addNotification({
      type: 'success',
      title: 'Başarılı',
      message: message,
      icon: 'checkmark-circle',
      color: '#10b981'
    });
  }

  // Bildirimi okundu işaretle
  async markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Tümünü okundu işaretle
  async markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
    await this.saveToStorage();
    this.notifyListeners();
  }

  // Bildirimi sil
  async deleteNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.notifications[index];
      if (!notification.read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      this.notifications.splice(index, 1);
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Tüm bildirimleri temizle
  async clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
    await this.saveToStorage();
    this.notifyListeners();
  }

  // AsyncStorage'a kaydet
  async saveToStorage() {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(this.notifications));
      await AsyncStorage.setItem('unreadCount', String(this.unreadCount));
    } catch (e) {
      console.error('Notification save error:', e);
    }
  }

  // AsyncStorage'dan yükle
  async loadFromStorage() {
    try {
      const notificationsStr = await AsyncStorage.getItem('notifications');
      const unreadStr = await AsyncStorage.getItem('unreadCount');
      
      if (notificationsStr) {
        this.notifications = JSON.parse(notificationsStr);
      }
      if (unreadStr) {
        this.unreadCount = parseInt(unreadStr) || 0;
      }
      
      this.notifyListeners();
    } catch (e) {
      console.error('Notification load error:', e);
    }
  }

  // Getter'lar
  getNotifications() {
    return this.notifications;
  }

  getUnreadCount() {
    return this.unreadCount;
  }
}

export default new NotificationService();
