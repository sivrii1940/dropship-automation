import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@dropship_cache_';
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 dakika

class CacheService {
  /**
   * Cache'e veri kaydet
   */
  async set(key, data, expiryTime = CACHE_EXPIRY_TIME) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiryTime,
      };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Cache'den veri oku
   */
  async get(key) {
    try {
      const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Cache süresi dolmuş mu kontrol et
      if (now - cacheData.timestamp > cacheData.expiryTime) {
        await this.remove(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Cache'den belirli bir veriyi sil
   */
  async remove(key) {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return true;
    } catch (error) {
      console.error('Cache remove error:', error);
      return false;
    }
  }

  /**
   * Tüm cache'i temizle
   */
  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      return true;
    } catch (error) {
      console.error('Cache clear all error:', error);
      return false;
    }
  }

  /**
   * Süresi dolmuş cache'leri temizle
   */
  async clearExpired() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const cacheData = JSON.parse(data);
          const now = Date.now();
          if (now - cacheData.timestamp > cacheData.expiryTime) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Cache clear expired error:', error);
      return false;
    }
  }

  /**
   * Cache boyutunu al (KB)
   */
  async getCacheSize() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }
      return (totalSize / 1024).toFixed(2); // KB
    } catch (error) {
      console.error('Cache size error:', error);
      return 0;
    }
  }

  /**
   * Cache anahtarlarını listele
   */
  async getCacheKeys() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith(CACHE_PREFIX))
                 .map(key => key.replace(CACHE_PREFIX, ''));
    } catch (error) {
      console.error('Get cache keys error:', error);
      return [];
    }
  }
}

export default new CacheService();
