# DropFlow - Trendyol Kullanıcı Bilgileri Nasıl Girilir?

<div align="center">
  <img src="assets/logo.svg" alt="DropFlow" width="120"/>
</div>

## Trendyol Hesap Bilgileri Nerede Kullanılır?

Trendyol hesap bilgileriniz **otomatik sipariş verme** için gereklidir. 

**Akış:**
1. Shopify'da müşteri sipariş verir
2. Sistem otomatik olarak Trendyol'a giriş yapar
3. Ürünleri sepete ekler
4. Sipariş verir (ödeme sayfasına kadar)

---

## 2 Yöntem ile Girebilirsiniz

### Yöntem 1: API ile (Swagger UI) - [ÖNERİLEN]

#### Adım 1: Swagger UI'ı Açın
```
http://localhost:8000/docs
```

#### Adım 2: Giriş Yapın
1. `/api/auth/login` endpoint'ini açın
2. Email ve şifrenizi girin
3. **Execute** butonuna tıklayın
4. Dönen **token**'ı kopyalayın

#### Adım 3: Authorize Edin
1. Sağ üstteki **Authorize** butonuna tıklayın
2. Token'ı yapıştırın
3. **Authorize** butonuna tıklayın

#### Adım 4: Trendyol Bilgilerini Kaydedin
1. `/api/order-automation/save-trendyol-credentials` endpoint'ini bulun
2. **Try it out** butonuna tıklayın
3. Request body'yi doldurun:
   ```json
   {
     "email": "trendyol-email@gmail.com",
     "password": "trendyol-şifreniz"
   }
   ```
4. **Execute** butonuna tıklayın

**Beklenen Yanıt:**
```json
{
  "success": true,
  "message": "Trendyol bilgileri kaydedildi"
}
```

#### Adım 5: Test Edin (Opsiyonel)
1. `/api/order-automation/test-trendyol-login` endpoint'ini açın
2. Aynı bilgileri girin
3. **Execute** butonuna tıklayın

**Başarılı Yanıt:**
```json
{
  "success": true,
  "message": "Trendyol girişi başarılı"
}
```

---

### Yöntem 2: Python ile (Programatik)

```python
import requests

# API URL
base_url = "http://localhost:8000"

# 1. Login
login_response = requests.post(f"{base_url}/api/auth/login", json={
    "email": "sizin-email@gmail.com",
    "password": "sizin-şifreniz"
})

token = login_response.json()["data"]["token"]

# 2. Trendyol Bilgilerini Kaydet
headers = {"Authorization": f"Bearer {token}"}

trendyol_response = requests.post(
    f"{base_url}/api/order-automation/save-trendyol-credentials",
    headers=headers,
    json={
        "email": "trendyol-email@gmail.com",
        "password": "trendyol-şifreniz"
    }
)

print(trendyol_response.json())
# {"success": true, "message": "Trendyol bilgileri kaydedildi"}
```

---

### Yöntem 3: Desktop Uygulaması ile (main.py)

> **Not:** Desktop uygulaması `main.py` dosyasıdır, GUI arayüzü vardır.

```bash
cd dropship_app
python main.py
```

1. Uygulama açılır
2. **Ayarlar** sekmesine gidin
3. **Trendyol Ayarları** bölümünü bulun
4. Email ve şifrenizi girin
5. **Kaydet** butonuna tıklayın

---

## Hangi Bilgiler Kaydediliyor?

| Alan | Açıklama | Örnek |
|------|----------|-------|
| **Email** | Trendyol giriş email'iniz | `ornek@gmail.com` |
| **Şifre** | Trendyol hesap şifreniz | `Gizli123!` |

**Önemli:**
- [OK] Bilgiler **şifreli** olarak veritabanında saklanır
- [OK] Sadece sizin hesabınızda kullanılır (user_id'ye bağlı)
- [OK] Her kullanıcının kendi bilgileri ayrı tutulur

---

## Güvenlik

### Veriler Nerede Saklanır?

```
database/dropship.db
  └── settings tablosu
      ├── trendyol_email (şifreli)
      └── trendyol_password (şifreli)
```

### Kimler Erişebilir?
- [OK] Sadece sizin kullanıcı ID'niz
- [NO] Diğer kullanıcılar göremez
- [NO] API token olmadan erişilemez

---

## Test Etme

### Test 1: Bilgiler Kaydedildi mi?

**API İsteği:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/order-automation/status
```

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "has_trendyol_credentials": true,  // [OK] Kayıtlı
    "is_running": false,
    "processed_today": 0
  }
}
```

### Test 2: Giriş Başarılı mı?

**Swagger UI'da:**
1. `/api/order-automation/test-trendyol-login` endpoint'ini açın
2. Bilgilerinizi girin
3. **Execute** butonuna tıklayın

**Başarılı:**
```json
{
  "success": true,
  "message": "Trendyol girişi başarılı"
}
```

**Başarısız:**
```json
{
  "success": false,
  "error": "Giriş başarısız. Email veya şifre hatalı."
}
```

---

## Kullanım Akışı

### 1. Bilgileri Kaydetme (Bir Kez)
```
POST /api/order-automation/save-trendyol-credentials
{
  "email": "...",
  "password": "..."
}
```

### 2. Sipariş İşleme (Otomatik)
```
Shopify Siparişi → Webhook → Backend
  └─> Trendyol bilgilerini al
  └─> Selenium ile giriş yap
  └─> Ürünleri sepete ekle
  └─> Sipariş ver
```

### 3. Manuel Sipariş İşleme
```
POST /api/orders/{order_id}/process
```
Bu endpoint kayıtlı Trendyol bilgilerinizi kullanarak siparişi işler.

---

## Sorun Giderme

### "Trendyol giriş bilgileri kayıtlı değil" Hatası

**Çözüm:**
1. Bilgileri kaydettiğinizden emin olun
2. Token'ın doğru kullanıcıya ait olduğunu kontrol edin
3. `/api/order-automation/status` ile kontrol edin

### Giriş Başarısız

**Kontroller:**
1. [CHECK] Email doğru mu?
2. [CHECK] Şifre doğru mu?
3. [CHECK] Trendyol.com'a tarayıcıdan giriş yapabiliyor musunuz?
4. [CHECK] Hesap askıya alınmış mı?

### Chrome Driver Hatası

**Çözüm:**
```bash
pip install webdriver-manager --upgrade
```

webdriver-manager otomatik olarak Chrome driver'ı indirecek.

---

## İpuçları

### 1. Test Hesabı Kullanın
İlk testlerde **asıl hesabınızı kullanmayın**. Test hesabı oluşturun.

### 2. Güçlü Şifre Kullanın
Trendyol hesabınız için güçlü şifre kullanın.

### 3. 2FA Devre Dışı Bırakın
Selenium otomasyonu için 2-factor authentication devre dışı olmalı.

### 4. Periyodik Kontrol
Ayda bir Trendyol girişini test edin.

---

## API Endpoint'leri Özeti

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/order-automation/save-trendyol-credentials` | POST | Bilgileri kaydet |
| `/api/order-automation/test-trendyol-login` | POST | Girişi test et |
| `/api/order-automation/status` | GET | Durum kontrolü |
| `/api/orders/{order_id}/process` | POST | Siparişi Trendyol'da işle |

---

## Hızlı Başlangıç

### 1 Dakikada Kurulum:

```bash
# 1. Swagger UI'ı açın
http://localhost:8000/docs

# 2. Login yapın
POST /api/auth/login

# 3. Token'ı kopyalayın
# 4. Authorize edin (🔒 butonu)

# 5. Trendyol bilgilerini kaydedin
POST /api/order-automation/save-trendyol-credentials
{
  "email": "trendyol@email.com",
  "password": "şifre"
}

# 6. Test edin
POST /api/order-automation/test-trendyol-login
```

**Tamamdır!** [OK]

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| [api.py](dropship_app/api.py) | API endpoints (satır 1560-1650) |
| [order_automation.py](dropship_app/order_automation.py) | Trendyol otomasyon mantığı |
| [models.py](dropship_app/models.py) | Settings model (veritabanı) |

---

---

<div align="center">
  <img src="assets/logo-horizontal.svg" alt="DropFlow" width="250"/>
  
  **DropFlow - Otomatik Dropshipping Platformu**
</div>

Artık Trendyol hesap bilgilerinizi kaydedebilir ve otomatik sipariş sistemi kurabilirsiniz! 🚀

**Sonraki Adım:** Shopify'dan gelen siparişleri otomatik Trendyol'a iletme testi yapın.
