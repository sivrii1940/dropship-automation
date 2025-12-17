# DropFlow - Shopify Webhook Kurulum Rehberi

<div align="center">
  <img src="assets/logo.svg" alt="DropFlow" width="120"/>
</div>

## Webhook Sistemi Hazır!

Webhook sistemi başarıyla implement edildi. Şimdi Shopify ile entegre etmek için aşağıdaki adımları takip edin.

## Kurulum Adımları

### [1] Backend API'yi Başlatın

```bash
cd dropship_app
python api.py
```

API varsayılan olarak `http://localhost:8000` adresinde çalışacaktır.

### [2] Public URL Oluşturun (Gerekli!)

Shopify webhook'lar için **HTTPS** gerektirir. Seçenekler:

#### A) Ngrok ile (Test/Development için)

```bash
# Ngrok'u indirin: https://ngrok.com/download
ngrok http 8000
```

Ngrok size bir public URL verecek: `https://1234-5678.ngrok-free.app`

#### B) Cloudflare Tunnel ile (Ücretsiz)

```bash
# Cloudflare Tunnel kurulumu
cloudflared tunnel --url http://localhost:8000
```

#### C) Production Sunucu (Canlı Ortam)

Uygulamayı bir cloud sunucuya deploy edin:
- Azure App Service
- AWS EC2
- DigitalOcean Droplet
- Heroku
- Railway

**Önemli:** SSL sertifikası olmalı (Let's Encrypt ile ücretsiz alınabilir)

### [3] Webhook Secret'ı Ayarlayın

API'yi kapatın ve aşağıdaki komutu çalıştırın:

#### Windows:
```cmd
set SHOPIFY_WEBHOOK_SECRET=your_super_secret_key_here
python api.py
```

#### Mac/Linux:
```bash
export SHOPIFY_WEBHOOK_SECRET=your_super_secret_key_here
python api.py
```

**Veya** `.env` dosyası oluşturun:
```env
SHOPIFY_WEBHOOK_SECRET=your_super_secret_key_here
```

> **Secret nasıl oluşturulur?** Herhangi bir rastgele string kullanabilirsiniz. Örnek:
> ```python
> import secrets
> secrets.token_urlsafe(32)
> ```

### [4] Shopify Admin'de Webhook Ekleyin

1. **Shopify Admin** paneline gidin
2. **Settings** → **Notifications** → **Webhooks** bölümüne gidin
3. **Create webhook** butonuna tıklayın
4. Şu bilgileri girin:

   - **Event:** `Order creation`
   - **Format:** `JSON`
   - **URL:** `https://YOUR-PUBLIC-URL/api/webhooks/shopify/orders/create`
   - **Webhook API version:** `Latest` (veya `2024-01`)

5. **Save webhook** butonuna tıklayın

### [5] Test Edin!

#### Test 1: Bağlantı Kontrolü
```bash
curl https://YOUR-PUBLIC-URL/api/webhooks/shopify/test
```

Başarılı yanıt:
```json
{
  "status": "ok",
  "message": "Shopify webhook endpoint çalışıyor",
  "timestamp": "2024-01-15T10:30:00"
}
```

#### Test 2: Shopify'da Test Siparişi

1. Shopify Admin'de **Products** → Bir ürün seçin
2. **Buy button** ile test siparişi oluşturun
3. Sipariş oluşturulduğunda webhook otomatik tetiklenecek

#### Test 3: Webhook Loglarını Kontrol Edin

API üzerinden webhook loglarını görüntüleyin:
```bash
curl https://YOUR-PUBLIC-URL/api/webhooks/logs
```

## Webhook Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/webhooks/shopify/orders/create` | POST | Shopify sipariş webhook'u (Shopify tarafından çağrılır) |
| `/api/webhooks/shopify/test` | GET | Bağlantı testi |
| `/api/webhooks/logs` | GET | Webhook geçmişini görüntüle (son 100) |
| `/api/webhooks/logs?limit=50` | GET | Son 50 webhook logunu görüntüle |
| `/api/webhooks/logs/{log_id}` | DELETE | Belirli bir log'u sil |
| `/api/webhooks/logs/clear` | POST | Tüm logları temizle |

## Güvenlik

Webhook sistemi **HMAC-SHA256** imza doğrulaması kullanır:

1. Shopify her webhook'ta `X-Shopify-Hmac-SHA256` header'ı gönderir
2. Backend, webhook payload'ını `SHOPIFY_WEBHOOK_SECRET` ile doğrular
3. İmza geçersizse `401 Unauthorized` döner
4. Timing attack koruması mevcuttur (`hmac.compare_digest`)

## Mobil Bildirimler (Opsiyonel)

Webhook sistemi sipariş geldiğinde mobil bildirim gönderebilir. Bunu aktif etmek için:

1. `dropship_app/webhooks.py` dosyasını açın
2. `send_order_notification()` fonksiyonunu implement edin:

```python
async def send_order_notification(order_data: dict):
    """Yeni sipariş bildirimi gönder"""
    try:
        # Expo Push Notification kullanın
        push_token = "ExponentPushToken[...]"  # Mobil uygulamadan alın
        
        message = {
            "to": push_token,
            "sound": "default",
            "title": "🎉 Yeni Sipariş!",
            "body": f"#{order_data['order_number']} - {order_data['customer_name']}",
            "data": {"orderId": order_data['id']}
        }
        
        # Expo Push API'ye gönder
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message
            )
            
        logger.info(f"✅ Bildirim gönderildi: #{order_data['order_number']}")
    except Exception as e:
        logger.error(f"Bildirim hatası: {e}")
```

## Sorun Giderme

### Webhook çalışmıyor?

1. **HTTPS kullanıyor musunuz?** Shopify sadece HTTPS kabul eder
2. **URL doğru mu?** `/api/webhooks/shopify/orders/create` endpoint'ini kullanın
3. **Firewall/Port kapalı mı?** 8000 portu açık olmalı
4. **Shopify Admin'de webhook aktif mi?** Devre dışı olabilir

### HMAC doğrulama hatası?

1. **Secret doğru ayarlandı mı?** `SHOPIFY_WEBHOOK_SECRET` environment variable
2. **Shopify Admin'deki secret ile aynı mı?** Tam eşleşmeli
3. **Payload değiştirildi mi?** Request body'si orijinal haliyle doğrulanmalı

### Siparişler veritabanına kaydedilmiyor?

1. **Veritabanı çalışıyor mu?** SQLite dosyası var mı?
2. **Order.create() çalışıyor mu?** Logları kontrol edin
3. **Duplicate sipariş?** Aynı sipariş tekrar gönderiliyorsa ignore edilir

## Monitoring

Webhook loglarını düzenli kontrol edin:

```python
import sqlite3

conn = sqlite3.connect('database/dropship.db')
cursor = conn.cursor()

# Son 10 webhook
cursor.execute("""
    SELECT topic, shop_domain, status, created_at 
    FROM webhook_logs 
    ORDER BY created_at DESC 
    LIMIT 10
""")

for row in cursor.fetchall():
    print(f"{row[0]} - {row[2]} - {row[3]}")

conn.close()
```

## Production Checklist

- [ ] Public HTTPS URL hazır
- [ ] SSL sertifikası aktif
- [ ] `SHOPIFY_WEBHOOK_SECRET` ayarlandı
- [ ] Shopify Admin'de webhook eklendi
- [ ] Test siparişi ile doğrulandı
- [ ] Webhook logları izleniyor
- [ ] Error handling test edildi
- [ ] Mobil bildirimler aktif (opsiyonel)
- [ ] Monitoring/alerting kuruldu (opsiyonel)

## Tamamdır!

Webhook sistemi artık aktif! Shopify'da her yeni sipariş oluşturulduğunda:

1. [OK] Webhook otomatik tetiklenir
2. [OK] HMAC imzası doğrulanır
3. [OK] Sipariş veritabanına kaydedilir
4. [OK] Log kaydı tutulur
5. [OK] Mobil bildirim gönderilir (opsiyonel)

**Artık gerçek zamanlı sipariş entegrasyonunuz hazır!**

---

<div align="center">
  <img src="assets/logo-horizontal.svg" alt="DropFlow" width="250"/>
  
  **DropFlow - Otomatik Dropshipping Platformu**
</div>
