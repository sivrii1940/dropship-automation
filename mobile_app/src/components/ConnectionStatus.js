import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import websocketService from '../services/websocket';

/**
 * WebSocket Bağlantı Durumu Göstergesi
 * Ekranın üst kısmında küçük bir gösterge olarak kullanılır
 */
export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Bağlantı durumunu kontrol et
    const checkConnection = () => {
      const status = websocketService.getConnectionStatus();
      setIsConnected(status.isConnected);
    };

    // İlk kontrol
    checkConnection();

    // Her 5 saniyede bir kontrol et
    const interval = setInterval(checkConnection, 5000);

    // WebSocket event listeners
    const unsubscribers = [
      websocketService.on('connected', () => {
        setIsConnected(true);
        // Fade in animasyonu
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // 3 saniye sonra fade out
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }, 3000);
        });
      }),
      
      websocketService.on('disconnected', () => {
        setIsConnected(false);
      }),
      
      websocketService.on('error', () => {
        setIsConnected(false);
      }),
    ];

    // Cleanup
    return () => {
      clearInterval(interval);
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // Bağlıysa gösterme (sadece bağlantı kurulduğunda kısa süre göster)
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={[styles.badge, styles.disconnected]}>
          <Ionicons name="cloud-offline-outline" size={12} color="#fff" />
          <Text style={styles.text}>Offline</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.badge, styles.connected]}>
        <Ionicons name="cloud-done-outline" size={12} color="#fff" />
        <Text style={styles.text}>Real-time aktif</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  connected: {
    backgroundColor: '#10b981',
  },
  disconnected: {
    backgroundColor: '#ef4444',
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
