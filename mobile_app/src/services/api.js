import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CacheService from './CacheService';
import NetworkService from './NetworkService';

// API Base URL - Production
// Try both http and https, prioritize https
const DEFAULT_API_URL = 'https://dropzy.app';
const FALLBACK_API_URL = 'http://dropzy.app';

class ApiService {
  constructor() {
    this.baseUrl = DEFAULT_API_URL;
    this.token = null;
    this.user = null;
    this.useCache = true; // Cache kullanımı
    this.maxRetries = 3; // Maksimum retry sayısı
    this.retryDelay = 1000; // Retry arası bekleme süresi (ms)
    this.init();
  }

  async init() {
    // Kayıtlı token ve kullanıcı bilgilerini önce yükle
    const savedToken = await AsyncStorage.getItem('auth_token');
    const savedUser = await AsyncStorage.getItem('user_data');
    if (savedToken) {
      this.token = savedToken;
    }
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (e) {
        console.error('User data parse error:', e);
      }
    }

    // API URL'sini kontrol et
    const savedUrl = await AsyncStorage.getItem('api_url');
    if (savedUrl) {
      this.baseUrl = savedUrl;
      console.log('✅ Using saved API URL:', savedUrl);
    } else {
      // Try https first, fallback to http if needed
      console.log('🔍 Testing API connection...');
      try {
        console.log('📡 Trying HTTPS:', DEFAULT_API_URL + '/health');
        const response = await axios.get(DEFAULT_API_URL + '/health', { timeout: 5000 });
        console.log('✅ HTTPS response:', response.data);
        if (response.data?.status === 'healthy') {
          this.baseUrl = DEFAULT_API_URL;
          await AsyncStorage.setItem('api_url', DEFAULT_API_URL);
          console.log('✅ HTTPS working, saved URL');
        }
      } catch (error) {
        console.log('❌ HTTPS failed:', error.message);
        console.log('📡 Trying HTTP fallback...');
        try {
          console.log('📡 Trying HTTP:', FALLBACK_API_URL + '/health');
          const response = await axios.get(FALLBACK_API_URL + '/health', { timeout: 5000 });
          console.log('✅ HTTP response:', response.data);
          if (response.data?.status === 'healthy') {
            this.baseUrl = FALLBACK_API_URL;
            await AsyncStorage.setItem('api_url', FALLBACK_API_URL);
            console.log('✅ HTTP working, saved URL');
          }
        } catch (e) {
          console.error('❌ Both HTTPS and HTTP failed:', e.message);
          console.log('⚠️ Using default HTTPS anyway');
          this.baseUrl = DEFAULT_API_URL; // Default olarak HTTPS kullan
        }
      }
    }

    console.log('🚀 API initialized:', this.baseUrl, '| Token:', this.token ? '✅ exists' : '❌ none');
  }

  async setApiUrl(url) {
    this.baseUrl = url;
    await AsyncStorage.setItem('api_url', url);
  }

  // Auth token'ı ayarla
  async setAuthToken(token, userData) {
    this.token = token;
    this.user = userData;
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));
  }

  // Oturumu temizle
  async clearAuth() {
    this.token = null;
    this.user = null;
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  }

  // Oturum durumunu kontrol et
  isAuthenticated() {
    return !!this.token;
  }

  // Kullanıcı bilgilerini al
  getUser() {
    return this.user;
  }

  // Retry helper fonksiyonu
  async retryRequest(fn, retries = this.maxRetries, delay = this.retryDelay) {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      // Retry edilebilir hata mı kontrol et
      const isRetryable = this.isRetryableError(error);
      if (!isRetryable) {
        throw error;
      }

      console.log(`Retrying... (${this.maxRetries - retries + 1}/${this.maxRetries})`);
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.retryRequest(fn, retries - 1, delay * 2);
    }
  }

  // Hatanın retry edilebilir olup olmadığını kontrol et
  isRetryableError(error) {
    // Network hataları retry edilebilir
    if (!error.response) {
      return true;
    }

    // 5xx server hataları retry edilebilir
    const status = error.response?.status;
    if (status >= 500 && status < 600) {
      return true;
    }

    // 408 Request Timeout
    if (status === 408) {
      return true;
    }

    // 429 Too Many Requests
    if (status === 429) {
      return true;
    }

    return false;
  }

  async request(method, endpoint, data = null, requiresAuth = true, useCache = true) {
    const cacheKey = `${method}_${endpoint}_${JSON.stringify(data || {})}`;
    
    // GET istekleri için cache kontrolü
    if (method === 'GET' && useCache && this.useCache) {
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        console.log('📦 Cache hit:', endpoint);
        return cached;
      }
    }

    // Network durumunu kontrol et
    const isConnected = await NetworkService.checkConnection();
    
    // Offline ve cache yoksa hata fırlat
    if (!isConnected) {
      if (method === 'GET') {
        // GET için cached data yoksa bilgi ver
        throw new Error('Çevrimdışısınız. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        // POST/PUT/DELETE için işlem yapılamaz
        throw new Error('Bu işlem için internet bağlantısı gerekiyor.');
      }
    }

    // Retry mekanizması ile request gönder
    try {
      return await this.retryRequest(async () => {
        const config = {
          method,
          url: `${this.baseUrl}${endpoint}`,
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 saniye timeout
        };

        // Auth token ekle (eğer gerekli ve varsa)
        if (requiresAuth && this.token) {
          config.headers['Authorization'] = `Bearer ${this.token}`;
          console.log(`🔑 Request with auth: ${method} ${endpoint}`);
        } else {
          console.log(`📡 Request: ${method} ${endpoint}`);
        }

        if (data) {
          if (method === 'GET') {
            config.params = data;
          } else {
            config.data = data;
          }
        }

        const response = await axios(config);
        
        console.log(`✅ Response: ${method} ${endpoint}`, response.status);
        
        // GET istekleri için response'u cache'le
        if (method === 'GET' && useCache && this.useCache && response.data) {
          await CacheService.set(cacheKey, response.data);
        }
        
        return response.data;
      });
    } catch (error) {
      console.error('❌ API Error:', error.message);
      console.error('Full error:', error.response?.status, error.response?.data);
      
      // 401 hatası: token geçersiz veya süresi dolmuş
      if (error.response?.status === 401) {
        await this.clearAuth();
      }
      
      // Network hatası ve GET isteği ise cache'den dene
      if (method === 'GET' && !error.response && useCache) {
        const cached = await CacheService.get(cacheKey);
        if (cached) {
          console.log('📦 Cache fallback:', endpoint);
          return cached;
        }
      }
      
      // Kullanıcı dostu hata mesajı
      throw this.handleErrorMessage(error);
    }
  }

  // Kullanıcı dostu hata mesajları
  handleErrorMessage(error) {
    if (!error.response) {
      return new Error('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
    }

    const status = error.response?.status;
    const message = error.response?.data?.detail || error.response?.data?.message;

    switch (status) {
      case 400:
        return new Error(message || 'Geçersiz istek');
      case 401:
        return new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
      case 403:
        return new Error('Bu işlem için yetkiniz yok');
      case 404:
        return new Error('İstenen kaynak bulunamadı');
      case 408:
        return new Error('İstek zaman aşımına uğradı');
      case 429:
        return new Error('Çok fazla istek gönderdiniz. Lütfen bekleyin.');
      case 500:
        return new Error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
      case 503:
        return new Error('Servis geçici olarak kullanılamıyor');
      default:
        return new Error(message || 'Bir hata oluştu');
    }
  }

  // Cache'i temizle
  async clearCache() {
    await CacheService.clearAll();
  }

  // Cache kullanımını aç/kapa
  setCacheEnabled(enabled) {
    this.useCache = enabled;
  }

  // ==================== AUTH ====================
  
  async register(email, password, name = null) {
    const response = await this.request('POST', '/api/auth/register', { email, password, name }, false);
    if (response.data && response.data.token) {
      await this.setAuthToken(response.data.token, {
        user_id: response.data.user_id,
        email: response.data.email,
        name: response.data.name
      });
    }
    return response;
  }

  async login(email, password) {
    const response = await this.request('POST', '/api/auth/login', { email, password }, false);
    if (response.data && response.data.token) {
      await this.setAuthToken(response.data.token, {
        user_id: response.data.user_id,
        email: response.data.email,
        name: response.data.name
      });
    }
    return response;
  }

  async logout() {
    try {
      await this.request('POST', '/api/auth/logout');
    } catch (e) {
      // Hata olsa bile local'i temizle
    }
    await this.clearAuth();
  }

  async getMe() {
    return this.request('GET', '/api/auth/me');
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/currency-rate`, {
        timeout: 5000 // 5 saniye timeout
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Dashboard
  async getDashboard() {
    return this.request('GET', '/api/dashboard');
  }

  // Dolar Kuru
  async getCurrencyRate() {
    return this.request('GET', '/api/currency-rate', null, false);
  }

  // Satıcılar
  async getSellers() {
    return this.request('GET', '/api/sellers');
  }

  async addSeller(sellerData) {
    // URL'den seller ID'yi çıkar
    // Örnek URL: https://www.trendyol.com/magaza/enes-stores-m-788905?sst=0
    let sellerId = null;
    const url = sellerData.url || '';
    
    // m-XXXXXX formatını bul
    const match = url.match(/m-(\d+)/);
    if (match) {
      sellerId = parseInt(match[1]);
    }
    
    return this.request('POST', '/api/sellers', {
      trendyol_seller_id: sellerId,
      name: sellerData.name,
      url: sellerData.url,
      note: sellerData.note
    });
  }

  async deleteSeller(sellerId) {
    return this.request('DELETE', `/api/sellers/${sellerId}`);
  }

  async syncSellerProducts(sellerId) {
    return this.request('POST', `/api/sellers/${sellerId}/sync-products`);
  }

  // Ürünler
  async getProducts(page = 1, perPage = 20, sellerId = null, syncedOnly = false) {
    const params = { page, per_page: perPage };
    if (sellerId) params.seller_id = sellerId;
    if (syncedOnly) params.synced_only = syncedOnly;
    return this.request('GET', '/api/products', params);
  }

  async getProduct(productId) {
    return this.request('GET', `/api/products/${productId}`);
  }

  async syncProductsToShopify(productIds, profitMargin = 50) {
    return this.request('POST', '/api/products/sync-to-shopify', {
      product_ids: productIds,
      profit_margin: profitMargin,
    });
  }

  async checkProductStock(productId) {
    return this.request('GET', `/api/products/${productId}/check-stock`);
  }

  // Siparişler
  async getOrders(status = null, page = 1, perPage = 20) {
    const params = { page, per_page: perPage };
    if (status) params.status = status;
    return this.request('GET', '/api/orders', params);
  }

  async getOrder(orderId) {
    return this.request('GET', `/api/orders/${orderId}`);
  }

  async fetchOrdersFromShopify() {
    return this.request('POST', '/api/orders/fetch-from-shopify');
  }

  async updateOrderStatus(orderId, status, notes = null) {
    return this.request('PUT', `/api/orders/${orderId}/status`, { status, notes });
  }

  // Stok Senkronizasyonu
  async syncStock() {
    return this.request('POST', '/api/stock/sync');
  }

  async getStockSyncStatus() {
    return this.request('GET', '/api/stock/status');
  }

  async startAutoSync() {
    return this.request('POST', '/api/stock/auto-sync/start');
  }

  async stopAutoSync() {
    return this.request('POST', '/api/stock/auto-sync/stop');
  }

  // Ayarlar
  async getSettings() {
    return this.request('GET', '/api/settings');
  }

  async updateSettings(settings) {
    return this.request('PUT', '/api/settings', settings);
  }

  async testShopifyConnection() {
    return this.request('POST', '/api/settings/test-shopify');
  }

  // Aktiviteler
  async getActivities(limit = 50) {
    return this.request('GET', '/api/activities', { limit });
  }

  // Bildirimler
  async checkNewOrders() {
    return this.request('GET', '/api/notifications/new-orders');
  }

  // ==================== SİPARİŞ OTOMASYONU ====================

  // Sipariş otomasyon durumu
  async getOrderAutomationStatus() {
    return this.request('GET', '/api/order-automation/status');
  }

  // Trendyol giriş bilgilerini kaydet
  async saveTrendyolCredentials(email, password) {
    return this.request('POST', '/api/order-automation/save-trendyol-credentials', {
      email,
      password
    });
  }

  // Trendyol girişini test et
  async testTrendyolLogin(email, password) {
    return this.request('POST', '/api/order-automation/test-trendyol-login', {
      email,
      password
    });
  }

  // Siparişi Trendyol'da işle
  async processOrderToTrendyol(orderId) {
    return this.request('POST', `/api/orders/${orderId}/process`);
  }

  // Otomasyon servisini başlat
  async startOrderAutomation() {
    return this.request('POST', '/api/order-automation/start');
  }

  // Otomasyon servisini durdur
  async stopOrderAutomation() {
    return this.request('POST', '/api/order-automation/stop');
  }

  // ========== SHOPIFY MAĞAZA YÖNETİMİ ==========

  // Tüm mağazaları listele
  async getShopifyStores() {
    return this.request('GET', '/api/shopify-stores');
  }

  // Yeni mağaza ekle
  async addShopifyStore(shopName, accessToken, storeName = null, isDefault = false) {
    return this.request('POST', '/api/shopify-stores', {
      shop_name: shopName,
      access_token: accessToken,
      store_name: storeName,
      is_default: isDefault
    });
  }

  // Mağaza detayı
  async getShopifyStore(storeId) {
    return this.request('GET', `/api/shopify-stores/${storeId}`);
  }

  // Mağaza güncelle
  async updateShopifyStore(storeId, data) {
    return this.request('PUT', `/api/shopify-stores/${storeId}`, data);
  }

  // Mağaza sil
  async deleteShopifyStore(storeId) {
    return this.request('DELETE', `/api/shopify-stores/${storeId}`);
  }

  // Varsayılan mağaza yap
  async setDefaultShopifyStore(storeId) {
    return this.request('POST', `/api/shopify-stores/${storeId}/set-default`);
  }

  // Mağaza bağlantısını test et
  async testShopifyStoreConnection(storeId) {
    return this.request('POST', `/api/shopify-stores/${storeId}/test`);
  }

  // ========== RAPORLAMA VE İSTATİSTİKLER ==========

  // Dashboard istatistikleri
  async getDashboardStats() {
    return this.request('GET', '/api/reports/dashboard');
  }

  // Satış raporu
  async getSalesReport(period = 'week') {
    return this.request('GET', `/api/reports/sales?period=${period}`);
  }

  // En çok satan ürünler
  async getTopProducts(limit = 10) {
    return this.request('GET', `/api/reports/top-products?limit=${limit}`);
  }

  // Kar analizi
  async getProfitAnalysis() {
    return this.request('GET', '/api/reports/profit-analysis');
  }

  // Aktivite logları
  async getActivityLog(limit = 50) {
    return this.request('GET', `/api/reports/activity-log?limit=${limit}`);
  }

  // ========== TOPLU ÜRÜN İŞLEMLERİ ==========

  // Seçili ürünleri Shopify'a toplu yükle
  async bulkSyncToShopify(productIds) {
    return this.request('POST', '/api/products/bulk/sync-shopify', {
      product_ids: productIds
    });
  }

  // Seçili ürünlerin fiyatlarını toplu güncelle
  async bulkUpdatePrice(productIds, options) {
    return this.request('POST', '/api/products/bulk/update-price', {
      product_ids: productIds,
      margin_percentage: options.marginPercentage,
      fixed_increase: options.fixedIncrease,
      fixed_price: options.fixedPrice
    });
  }

  // Seçili ürünleri toplu sil
  async bulkDeleteProducts(productIds) {
    return this.request('POST', '/api/products/bulk/delete', {
      product_ids: productIds
    });
  }

  // Ürünleri CSV olarak dışa aktar
  async exportProducts() {
    return this.request('GET', '/api/products/export');
  }

  // CSV'den ürün içe aktar
  async importProducts(csvContent, sellerId = null) {
    return this.request('POST', '/api/products/import', {
      csv_content: csvContent,
      seller_id: sellerId
    });
  }

  // Tüm ürünlerin stok bilgilerini toplu güncelle
  async bulkStockUpdate() {
    return this.request('POST', '/api/products/bulk/stock-update');
  }

  // ========== KARGO TAKİP ==========

  // Desteklenen kargo firmalarını listele
  async getCarriers() {
    return this.request('GET', '/api/carriers');
  }

  // Tüm kargoları listele
  async getShipments() {
    return this.request('GET', '/api/shipments');
  }

  // Yeni kargo oluştur
  async createShipment(trackingNumber, carrier, orderId = null, carrierName = null) {
    return this.request('POST', '/api/shipments', {
      tracking_number: trackingNumber,
      carrier: carrier,
      order_id: orderId,
      carrier_name: carrierName
    });
  }

  // Kargo detayı
  async getShipment(shipmentId) {
    return this.request('GET', `/api/shipments/${shipmentId}`);
  }

  // Kargo güncelle
  async updateShipment(shipmentId, data) {
    return this.request('PUT', `/api/shipments/${shipmentId}`, data);
  }

  // Kargo sil
  async deleteShipment(shipmentId) {
    return this.request('DELETE', `/api/shipments/${shipmentId}`);
  }

  // Siparişe ait kargo bilgisi
  async getOrderShipment(orderId) {
    return this.request('GET', `/api/orders/${orderId}/shipment`);
  }

  // Siparişe kargo ekle
  async addShipmentToOrder(orderId, trackingNumber, carrier, carrierName = null) {
    return this.request('POST', `/api/orders/${orderId}/shipment`, {
      tracking_number: trackingNumber,
      carrier: carrier,
      carrier_name: carrierName
    });
  }
}

export default new ApiService();
