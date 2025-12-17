import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

class NetworkService {
  constructor() {
    this.isConnected = true;
    this.listeners = [];
    this.unsubscribe = null;
  }

  /**
   * Network durumunu başlat
   */
  initialize() {
    this.unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      
      if (this.isConnected !== connected) {
        this.isConnected = connected;
        this.notifyListeners(connected);
      }
    });

    // İlk durumu al
    NetInfo.fetch().then(state => {
      this.isConnected = state.isConnected && state.isInternetReachable;
      this.notifyListeners(this.isConnected);
    });
  }

  /**
   * Network dinleyicisini kapat
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Listener ekle
   */
  addListener(callback) {
    this.listeners.push(callback);
    
    // İlk durumu hemen bildir
    callback(this.isConnected);

    // Listener'ı kaldırmak için fonksiyon döndür
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Listener'ları bilgilendir
   */
  notifyListeners(isConnected) {
    this.listeners.forEach(listener => listener(isConnected));
  }

  /**
   * Network durumunu al
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Network durumunu kontrol et (Promise)
   */
  async checkConnection() {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  }
}

// React Hook: useNetwork
export function useNetwork() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const networkService = new NetworkService();
    networkService.initialize();

    const unsubscribe = networkService.addListener((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
      networkService.destroy();
    };
  }, []);

  return isConnected;
}

export default new NetworkService();
