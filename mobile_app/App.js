import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Global error handler
if (__DEV__) {
  console.log('Development mode');
} else {
  // Production mode - catch all errors
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('Global error:', error);
    if (isFatal) {
      Alert.alert(
        'Beklenmeyen Hata',
        'Uygulama yeniden başlatılacak',
        [{
          text: 'Tamam',
          onPress: () => {
            // RNRestart.Restart();
          }
        }]
      );
    }
  });
}

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ApiSettingsScreen from './src/screens/ApiSettingsScreen';

// Main Screens
import DashboardScreen from './src/screens/DashboardScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import SellersScreen from './src/screens/SellersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ReportsScreen from './src/screens/ReportsScreen';

// Services
import api from './src/services/api';
import NotificationService from './src/services/NotificationService';
import NetworkService, { useNetwork } from './src/services/NetworkService';
import websocketService, { EventTypes } from './src/services/websocket';

// Components
import ErrorBoundary from './src/components/ErrorBoundary';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Orders Stack Navigator
function OrdersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0f0f1a',
          borderBottomColor: '#2a2a3e',
          borderBottomWidth: 1,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen 
        name="OrdersList" 
        component={OrdersScreen}
        options={{
          headerTitle: 'Siparişler',
        }}
      />
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen}
        options={{
          headerTitle: 'Sipariş Detayı',
        }}
      />
    </Stack.Navigator>
  );
}

// Auth Navigator (Login/Register)
function AuthNavigator({ onLogin }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLogin={onLogin} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onRegister={onLogin} />}
      </Stack.Screen>
      <Stack.Screen 
        name="ApiSettings" 
        component={ApiSettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'API Ayarları',
          headerStyle: { backgroundColor: '#0f0f1a' },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}

// Main App Navigator (Tab Navigation)
function MainNavigator({ onLogout }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Bildirimleri yükle
    NotificationService.loadFromStorage();
    setUnreadCount(NotificationService.getUnreadCount());

    // Push notifications başlat
    NotificationService.initializePushNotifications().then(token => {
      if (token) {
        console.log('Push notifications enabled:', token);
        // TODO: Token'ı backend'e kaydet
      }
    });

    // Listener ekle
    const unsubscribe = NotificationService.addListener(({ unreadCount }) => {
      setUnreadCount(unreadCount);
    });

    return () => {
      unsubscribe();
      NotificationService.cleanupPushListeners();
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Ürünler':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'Satıcılar':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Siparişler':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Raporlar':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Bildirimler':
              iconName = focused ? 'notifications' : 'notifications-outline';
              break;
            case 'Ayarlar':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#2a2a3e',
          borderTopWidth: 1,
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0f0f1a',
          borderBottomColor: '#2a2a3e',
          borderBottomWidth: 1,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          headerTitle: 'DropFlow Panel',
        }}
      />
      <Tab.Screen 
        name="Ürünler" 
        component={ProductsScreen}
        options={{
          headerTitle: 'Ürün Yönetimi',
        }}
      />
      <Tab.Screen 
        name="Satıcılar" 
        component={SellersScreen}
        options={{
          headerTitle: '👥 Satıcı Yönetimi',
        }}
      />
      <Tab.Screen 
        name="Siparişler" 
        component={OrdersStackNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Raporlar" 
        component={ReportsScreen}
        options={{
          headerTitle: 'Raporlar',
        }}
      />
      <Tab.Screen 
        name="Bildirimler" 
        component={NotificationsScreen}
        options={{
          headerTitle: 'Bildirimler',
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            fontSize: 10,
            minWidth: 18,
            height: 18,
          },
        }}
      />
      <Tab.Screen 
        name="Ayarlar"
        options={{
          headerTitle: 'Ayarlar',
        }}
      >
        {(props) => <SettingsScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isConnected = useNetwork();

  useEffect(() => {
    // Network service'i başlat
    NetworkService.initialize();
    checkAuth();
    
    // WebSocket bağlantısını kur
    const apiUrl = api.defaults.baseURL || 'http://localhost:8000';
    websocketService.connect(apiUrl);
    
    // WebSocket event listeners
    const unsubscribers = [
      websocketService.on(EventTypes.CONNECTED, () => {
        console.log('✅ Real-time senkronizasyon aktif');
      }),
      
      websocketService.on(EventTypes.PRODUCT_ADDED, (data) => {
        console.log('🆕 Yeni ürün eklendi:', data);
        // Ürünler ekranı otomatik yenilenecek
      }),
      
      websocketService.on(EventTypes.PRODUCT_UPDATED, (data) => {
        console.log('📝 Ürün güncellendi:', data);
      }),
      
      websocketService.on(EventTypes.SELLER_ADDED, (data) => {
        console.log('🏪 Yeni satıcı eklendi:', data);
      }),
      
      websocketService.on(EventTypes.ORDER_CREATED, (data) => {
        console.log('🛍️ Yeni sipariş:', data);
        NotificationService.showNotification(
          'Yeni Sipariş',
          `Sipariş #${data.order_number || data.order_id} oluşturuldu`
        );
      }),
      
      websocketService.on(EventTypes.STOCK_LOW, (data) => {
        console.log('⚠️ Düşük stok:', data);
        NotificationService.showNotification(
          'Stok Uyarısı',
          `${data.product_name} stoğu azalıyor (${data.stock})`
        );
      }),
      
      websocketService.on(EventTypes.STOCK_OUT, (data) => {
        console.log('❌ Stok bitti:', data);
        NotificationService.showNotification(
          'Stok Bitti',
          `${data.product_name} tükendi!`
        );
      }),
    ];
    
    return () => {
      NetworkService.destroy();
      // WebSocket bağlantısını kapat
      websocketService.disconnect();
      // Event listener'ları temizle
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const checkAuth = async () => {
    try {
      // API servisinin init'i bekle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Token var mı kontrol et
      if (api.token) {
        // Token geçerli mi kontrol et
        try {
          await api.getMe();
          setIsAuthenticated(true);
        } catch (e) {
          // Token geçersiz
          await api.clearAuth();
          setIsAuthenticated(false);
        }
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="light" />
          {isAuthenticated ? (
            <MainNavigator onLogout={handleLogout} />
          ) : (
            <AuthNavigator onLogin={handleLogin} />
          )}
        </NavigationContainer>
        
        {/* Offline Indicator */}
        {!isConnected && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline" size={16} color="#fff" />
            <Text style={styles.offlineText}>Çevrimdışı - Önbellekten gösteriliyor</Text>
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    zIndex: 9999,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
});
