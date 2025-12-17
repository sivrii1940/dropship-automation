/**
 * WebSocket Service - Real-Time Senkronizasyon
 * Tüm cihazlarda anlık güncelleme sağlar
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 saniye
    this.listeners = new Map();
    this.isConnected = false;
  }

  /**
   * WebSocket bağlantısı kur
   * @param {string} url - WebSocket sunucu URL'i
   */
  connect(url) {
    try {
      // ws:// veya wss:// protokolünü ekle
      const wsUrl = url.replace(/^http/, 'ws') + '/ws';
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Bağlantı kuruldu event'i
        this._emit('connected', { url: wsUrl });
        
        // Heartbeat başlat
        this._startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] ← Message:', data.type);
          
          // Event'i ilgili listener'lara ilet
          this._emit(data.type, data);
          
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] ❌ Error:', error);
        this._emit('error', { error });
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] 🔌 Disconnected');
        this.isConnected = false;
        this._stopHeartbeat();
        
        // Otomatik yeniden bağlan
        this._reconnect(url);
      };

    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
    }
  }

  /**
   * WebSocket bağlantısını kapat
   */
  disconnect() {
    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts; // Yeniden bağlanmayı engelle
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Mesaj gönder
   * @param {object} data - Gönderilecek veri
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      console.log('[WebSocket] → Sent:', data.type);
    } else {
      console.warn('[WebSocket] Cannot send, not connected');
    }
  }

  /**
   * Event listener ekle
   * @param {string} eventType - Event tipi
   * @param {function} callback - Callback fonksiyonu
   * @returns {function} - Unsubscribe fonksiyonu
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push(callback);
    
    // Unsubscribe fonksiyonu döndür
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Event listener kaldır
   * @param {string} eventType - Event tipi
   * @param {function} callback - Callback fonksiyonu
   */
  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Event'i tetikle
   * @private
   */
  _emit(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Listener error (${eventType}):`, error);
        }
      });
    }
  }

  /**
   * Yeniden bağlan
   * @private
   */
  _reconnect(url) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      this._emit('max_reconnect_attempts', {});
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(url);
    }, this.reconnectDelay);
  }

  /**
   * Heartbeat (ping-pong) başlat
   * @private
   */
  _startHeartbeat() {
    this._stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'ping',
          timestamp: Date.now()
        });
      }
    }, 30000); // 30 saniyede bir
  }

  /**
   * Heartbeat durdur
   * @private
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Bağlantı durumu
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Singleton instance
const websocketService = new WebSocketService();

// Event Type Constants
export const EventTypes = {
  // Ürün events
  PRODUCT_ADDED: 'product_added',
  PRODUCT_UPDATED: 'product_updated',
  PRODUCT_DELETED: 'product_deleted',
  PRODUCT_STOCK_CHANGED: 'product_stock_changed',
  PRODUCT_PRICE_CHANGED: 'product_price_changed',
  PRODUCT_SYNCED: 'product_synced',
  
  // Satıcı events
  SELLER_ADDED: 'seller_added',
  SELLER_UPDATED: 'seller_updated',
  SELLER_DELETED: 'seller_deleted',
  SELLER_PRODUCTS_FETCHED: 'seller_products_fetched',
  
  // Sipariş events
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  ORDER_PROCESSED: 'order_processed',
  
  // Stok events
  STOCK_SYNC_STARTED: 'stock_sync_started',
  STOCK_SYNC_COMPLETED: 'stock_sync_completed',
  STOCK_LOW: 'stock_low',
  STOCK_OUT: 'stock_out',
  
  // Ayar events
  SETTINGS_UPDATED: 'settings_updated',
  
  // Sistem events
  SYSTEM_NOTIFICATION: 'system_notification',
  ERROR: 'error',
  SUCCESS: 'success',
  
  // Bağlantı events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  PONG: 'pong'
};

export default websocketService;
