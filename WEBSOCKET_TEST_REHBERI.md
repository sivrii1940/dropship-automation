# 🚀 WebSocket Real-Time Senkronizasyon - Test Rehberi

## ✅ Tamamlanan Özellikler

### Backend (API)
- ✅ WebSocket ConnectionManager (`websocket_manager.py`)
- ✅ WebSocket endpoint (`/ws`)
- ✅ Connection stats endpoint (`/ws/stats`)
- ✅ Tüm event'ler için broadcast sistemi:
  - Ürün işlemleri (ekle, güncelle, sil, Shopify sync)
  - Stok değişiklikleri
  - Fiyat güncellemeleri
  - Satıcı işlemleri
  - Sipariş işlemleri
  - Kargo takibi

### Frontend (Mobile App)
- ✅ WebSocket client servisi (`websocket.js`)
- ✅ Otomatik bağlantı ve yeniden bağlanma
- ✅ Real-time event listeners (tüm ekranlarda)
- ✅ Bağlantı durumu göstergesi (`ConnectionStatus.js`)
- ✅ Bildirim entegrasyonu

## 🧪 Test Senaryoları

### Test 1: Temel Bağlantı Testi
**Amaç:** WebSocket bağlantısının kurulduğunu doğrula

1. Backend'i başlat:
   ```bash
   cd dropship_app
   python api.py
   ```

2. Mobil app'i başlat:
   ```bash
   cd mobile_app
   npm start
   ```

3. Mobil app açıldığında console'da şunu görmelisiniz:
   ```
   [WebSocket] Connecting to: ws://localhost:8000/ws
   [WebSocket] ✅ Connected
   ```

4. Dashboard ekranının sağ üstünde yeşil "Real-time aktif" göstergesi görünmeli (3 saniye sonra kaybolur)

**Beklenen Sonuç:** ✅ Bağlantı kuruldu, gösterge göründü

---

### Test 2: Desktop → Mobile Senkronizasyon
**Amaç:** Desktop'ta yapılan değişikliklerin mobilde anlık görünmesi

1. **Desktop:** Tarayıcıda `http://localhost:8000` adresini aç
2. **Mobile:** Uygulamayı Ürünler ekranında aç
3. **Desktop:** Yeni bir ürün ekle veya mevcut ürünü düzenle
4. **Mobile:** Console'da şunu görmelisiniz:
   ```
   🆕 Real-time: Yeni ürün eklendi {product_id: 123, ...}
   ```
5. **Mobile:** Ürünler listesi otomatik yenilenmeli (1-2 saniye içinde)

**Beklenen Sonuç:** ✅ Desktop değişikliği mobilde anında yansıdı

---

### Test 3: Mobile → Desktop Senkronizasyon
**Amaç:** Mobilde yapılan değişikliklerin desktop'ta görünmesi

1. **Desktop:** Tarayıcıyı Ürünler sayfasında aç
2. **Mobile:** Uygulamada bir ürünün stok durumunu kontrol et
3. **Desktop:** Backend console'da şunu görmelisiniz:
   ```
   📦 Broadcasting: product_stock_changed
   ```
4. **Desktop:** Sayfa yenilendiğinde güncel stok görünmeli

**Beklenen Sonuç:** ✅ Mobile değişikliği desktop'ta görüldü

---

### Test 4: Çoklu Cihaz Senkronizasyonu
**Amaç:** Birden fazla cihazın aynı anda güncellenmesi

1. **Cihaz 1:** Mobil uygulamayı aç (Ürünler ekranı)
2. **Cihaz 2:** Tarayıcıda web uygulamasını aç
3. **Cihaz 3:** Başka bir tarayıcı/sekme aç
4. **Herhangi bir cihaz:** Yeni satıcı ekle
5. **Diğer cihazlar:** Tüm cihazlarda console'da şunu görmelisiniz:
   ```
   🏪 Real-time: Yeni satıcı eklendi
   ```

**Beklenen Sonuç:** ✅ Tüm cihazlar aynı anda güncellendi

---

### Test 5: Sipariş Bildirimleri
**Amaç:** Yeni siparişlerde otomatik bildirim

1. **Mobile:** Uygulamayı Dashboard'da aç
2. **Desktop/API:** Shopify'dan sipariş çek veya manuel sipariş oluştur
3. **Mobile:** Console'da şunu görmelisiniz:
   ```
   🛍️ Real-time: Yeni sipariş oluşturuldu
   ```
4. **Mobile:** Bildirim göründü mü kontrol et

**Beklenen Sonuç:** ✅ Sipariş bildirimi geldi

---

### Test 6: Stok Uyarıları
**Amaç:** Düşük stok ve stok bitişi bildirimleri

1. **Desktop:** Bir ürünün stoğunu azalt (örn: 2'ye düşür)
2. **Mobile:** Console'da şunu görmelisiniz:
   ```
   ⚠️ Düşük stok: {product_name, stock}
   ```
3. **Mobile:** "Stok Uyarısı" bildirimi görünmeli

**Beklenen Sonuç:** ✅ Stok uyarısı bildirim geldi

---

### Test 7: Bağlantı Kopması ve Yeniden Bağlanma
**Amaç:** Otomatik yeniden bağlanma mekanizması

1. **Mobile:** Uygulamayı aç ve bağlantıyı doğrula
2. **Backend:** API sunucusunu durdur (`Ctrl+C`)
3. **Mobile:** Console'da şunu görmelisiniz:
   ```
   [WebSocket] 🔌 Disconnected
   [WebSocket] Reconnecting... (1/5)
   ```
4. **Mobile:** Dashboard'da kırmızı "Offline" göstergesi görünmeli
5. **Backend:** API'yi yeniden başlat
6. **Mobile:** Console'da şunu görmelisiniz:
   ```
   [WebSocket] ✅ Connected
   ```
7. **Mobile:** Yeşil "Real-time aktif" göstergesi görünmeli

**Beklenen Sonuç:** ✅ Otomatik yeniden bağlandı

---

### Test 8: Toplu İşlemler
**Amaç:** Bulk işlemlerde broadcast

1. **Desktop/Mobile:** Ürünler ekranında 5+ ürün seç
2. **Toplu işlem:** "Shopify'a Yükle" veya "Fiyat Güncelle"
3. **Diğer cihazlar:** Console'da şunu görmelisiniz:
   ```
   ☁️ Real-time: Ürün Shopify'a yüklendi
   ```
4. **Diğer cihazlar:** Ürünler listesi yenilenmeli

**Beklenen Sonuç:** ✅ Toplu işlemler broadcast edildi

---

### Test 9: Performans Testi
**Amaç:** Gecikme ve performans ölçümü

1. **Mobile:** Console'u aç
2. **Desktop:** 10 ürün ekle (arka arkaya)
3. **Mobile:** Her event için zaman damgasını not et
4. **Gecikme hesapla:** Event zamanı - İşlem zamanı

**Beklenen Sonuç:** ✅ Gecikme 50-200ms arasında

---

### Test 10: WebSocket Stats
**Amaç:** Connection statistics endpoint'i test et

1. **Tarayıcı:** `http://localhost:8000/ws/stats` adresini aç
2. **JSON yanıt:**
   ```json
   {
     "active_connections": 2,
     "connected_users": ["user1", "user2"]
   }
   ```

**Beklenen Sonuç:** ✅ Aktif bağlantı sayısı doğru

---

## 🐛 Hata Ayıklama

### WebSocket bağlanmıyor
1. Backend'in çalıştığını doğrula: `http://localhost:8000/health`
2. WebSocket portunu kontrol et (8000)
3. Firewall/antivirus ayarlarını kontrol et
4. Console'da hata mesajlarını oku

### Event'ler gelmiyor
1. Backend console'da broadcast loglarını kontrol et
2. Mobile console'da listener'ların eklendiğini doğrula
3. Event type'ların doğru olduğunu kontrol et

### Yeniden bağlanma çalışmıyor
1. `maxReconnectAttempts` limitini kontrol et (default: 5)
2. `reconnectDelay` süresini kontrol et (default: 3000ms)
3. Network durumunu kontrol et

---

## 📊 Broadcast Edilen Event'ler

### Ürün Events
- `product_added` - Yeni ürün eklendi
- `product_updated` - Ürün güncellendi
- `product_deleted` - Ürün silindi
- `product_synced` - Shopify'a yüklendi
- `product_stock_changed` - Stok değişti
- `product_price_changed` - Fiyat değişti

### Satıcı Events
- `seller_added` - Yeni satıcı eklendi
- `seller_updated` - Satıcı güncellendi
- `seller_deleted` - Satıcı silindi
- `seller_products_fetched` - Satıcı ürünleri çekildi

### Sipariş Events
- `order_created` - Yeni sipariş oluşturuldu
- `order_updated` - Sipariş güncellendi
- `order_status_changed` - Sipariş durumu değişti
- `order_processed` - Sipariş işlendi

### Stok Events
- `stock_sync_started` - Stok senkronizasyonu başladı
- `stock_sync_completed` - Stok senkronizasyonu bitti
- `stock_low` - Düşük stok uyarısı
- `stock_out` - Stok bitti

### Sistem Events
- `connected` - Bağlantı kuruldu
- `disconnected` - Bağlantı kesildi
- `error` - Hata oluştu
- `success` - İşlem başarılı

---

## ✨ Kullanım Örnekleri

### Custom Event Listener Ekleme

```javascript
import websocketService, { EventTypes } from '../services/websocket';

// Component içinde
useEffect(() => {
  const unsubscribe = websocketService.on(EventTypes.PRODUCT_ADDED, (data) => {
    console.log('Yeni ürün:', data);
    // Kendi işleminizi yapın
  });
  
  return () => unsubscribe(); // Cleanup
}, []);
```

### Manuel Mesaj Gönderme

```javascript
websocketService.send({
  type: 'custom_event',
  data: { key: 'value' }
});
```

### Bağlantı Durumu Kontrolü

```javascript
const status = websocketService.getConnectionStatus();
console.log('Connected:', status.isConnected);
console.log('Reconnect attempts:', status.reconnectAttempts);
```

---

## 🎯 Sonuç

Tüm testler başarılı olduysa, **real-time senkronizasyon sistemi tam çalışır durumda!** 🎉

Artık desktop, mobile ve web arasında:
- ⚡ **Anlık senkronizasyon** (50-200ms gecikme)
- 🔄 **Otomatik yeniden bağlanma**
- 📱 **Push bildirimleri**
- 🌐 **Çoklu cihaz desteği**

Herhangi bir sorun olursa:
1. Backend console loglarını kontrol edin
2. Mobile console loglarını kontrol edin
3. Network durumunu kontrol edin
4. Bu dökümanı referans alın

**Başarılar!** 🚀
