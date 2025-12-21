import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationService from '../services/NotificationService';
import api from '../services/api';

const NotificationItem = ({ notification, onPress, onDelete }) => {
  const timeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        !notification.read && styles.notificationUnread
      ]}
      onPress={() => onPress(notification)}
    >
      <View style={[styles.iconContainer, { backgroundColor: notification.color + '20' }]}>
        <Ionicons 
          name={notification.icon || 'notifications'} 
          size={24} 
          color={notification.color || '#3b82f6'} 
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>{timeAgo(notification.timestamp)}</Text>
      </View>

      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => onDelete(notification.id)}
      >
        <Ionicons name="close" size={20} color="#64748b" />
      </TouchableOpacity>

      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);

  const loadNotifications = useCallback(async () => {
    // Önce local storage'dan yükle
    await NotificationService.loadFromStorage();
    setNotifications(NotificationService.getNotifications());
    setUnreadCount(NotificationService.getUnreadCount());
    
    // API'den yeni bildirimleri kontrol et
    try {
      const response = await api.checkNewOrders();
      if (response.success) {
        setPendingOrders(response.data.pending_orders);
        
        // API'den gelen bildirimleri local'e ekle (yeni olanları)
        for (const notif of response.data.notifications) {
          const exists = NotificationService.getNotifications().find(
            n => n.message === notif.message && n.type === notif.type
          );
          if (!exists) {
            await NotificationService.addNotification({
              type: notif.type,
              title: notif.title,
              message: notif.message,
              icon: getIconForType(notif.type),
              color: getColorForType(notif.type)
            });
          }
        }
      }
    } catch (err) {
      console.error('API notification check error:', err);
    }
  }, []);

  const getIconForType = (type) => {
    const icons = {
      'order_sync': 'sync',
      'new_order': 'cart',
      'order_processed': 'checkmark-circle',
      'stock_sync': 'cube',
      'stock_alert': 'warning',
      'product_sync': 'layers',
      'error': 'alert-circle',
    };
    return icons[type] || 'notifications';
  };

  const getColorForType = (type) => {
    const colors = {
      'order_sync': '#3b82f6',
      'new_order': '#10b981',
      'order_processed': '#10b981',
      'stock_sync': '#f59e0b',
      'stock_alert': '#ef4444',
      'product_sync': '#8b5cf6',
      'error': '#ef4444',
    };
    return colors[type] || '#3b82f6';
  };

  useEffect(() => {
    loadNotifications();

    // Listener ekle
    const unsubscribe = NotificationService.addListener(({ notifications, unreadCount }) => {
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    });

    return unsubscribe;
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handlePress = async (notification) => {
    await NotificationService.markAsRead(notification.id);
    
    // Bildirim türüne göre yönlendir
    switch (notification.type) {
      case 'new_order':
      case 'order_processed':
      case 'payment_pending':
        navigation.navigate('Siparişler');
        break;
      case 'stock_alert':
        navigation.navigate('Ürünler');
        break;
      default:
        break;
    }
  };

  const handleDelete = async (notificationId) => {
    await NotificationService.deleteNotification(notificationId);
  };

  const markAllRead = async () => {
    await NotificationService.markAllAsRead();
  };

  const clearAll = async () => {
    Alert.alert(
      'Tüm Bildirimleri Sil',
      'Tüm bildirimleri silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => NotificationService.clearAll()
        }
      ]
    );
  };

  // Test bildirimi (geliştirme için)
  const testNotification = async () => {
    await NotificationService.notifyNewOrder('1001', 'Test Müşteri', '99.99');
  };

  return (
    <View style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="notifications" size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.headerButton} onPress={markAllRead}>
              <Ionicons name="checkmark-done" size={22} color="#3b82f6" />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.headerButton} onPress={clearAll}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bildirim Listesi */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#64748b" />
          <Text style={styles.emptyText}>Henüz bildirim yok</Text>
          <Text style={styles.emptySubtext}>
            Yeni siparişler ve stok değişiklikleri burada görünecek
          </Text>
          
          {/* Test butonu - geliştirme için */}
          {__DEV__ && (
            <TouchableOpacity style={styles.testButton} onPress={testNotification}>
              <Text style={styles.testButtonText}>Test Bildirimi Gönder</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={handlePress}
              onDelete={handleDelete}
            />
          )}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingBottom: 75,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  notificationUnread: {
    backgroundColor: '#1e2a3e',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 24,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    color: '#a0aec0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    color: '#64748b',
    fontSize: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 40,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  testButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
