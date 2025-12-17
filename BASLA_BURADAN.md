# DropFlow - Sistem Kullanım Rehberi

<div align="center">
  <img src="assets/logo.svg" alt="DropFlow" width="120"/>
</div>

## HERŞEY HAZIR - KULLANIMA BAŞLAYIN

**API Durumu:** [ACTIVE] Çalışıyor (http://localhost:8000)  
**Tüm Paketler:** [OK] Yüklendi  
**Webhook Sistemi:** [ON] Aktif  
**Veritabanı:** [READY] Hazır  

---

## 4 TEMEL KONU

### [1] TRENDYOL KULLANICI BİLGİLERİ (Otomatik Sipariş İçin)

**Nerede kullanılır?**
- Shopify'dan gelen siparişleri **otomatik** Trendyol'a iletmek için
- Selenium ile Trendyol'a giriş yapıp sipariş vermek için

**Nasıl girilir?**
1. **Swagger UI:** http://localhost:8000/docs
2. Login yapın ve token alın
3. `/api/order-automation/save-trendyol-credentials` endpoint'ine POST gönderin:
   ```json
   {
     "email": "trendyol-email@gmail.com",
     "password": "trendyol-şifreniz"
   }
   ```

**Test edin:**
```
POST /api/order-automation/test-trendyol-login
```

**Detaylı Rehber:** [TRENDYOL_HESAP_BILGILERI.md](TRENDYOL_HESAP_BILGILERI.md)

---

### [2] WEBHOOK NEDİR? (Basit Açıklama)

#### ▼ Sorun:
Normalde sizin sisteminiz Shopify'a sürekli "yeni sipariş var mı?" diye sorar:
- Her 5 dakikada bir kontrol → YAVAŞ
- Boşuna API çağrıları → KAYNAK İSRAFI
- Gecikme olur → SİPARİŞ GEÇ GELIR

#### ► Çözüm: WEBHOOK!
Shopify size söyler, siz sormazsınız:
- Yeni sipariş geldiğinde Shopify **ANINDA** size bildirim gönderir
- Gerçek zamanlı çalışır (0 gecikme)
- API limitlerini etkilemez

#### ► Analoji:
**Webhook Olmadan:** Her 5 dakikada "Postacı geldi mi?" diye kapıyı açıp bakmak  
**Webhook İle:** Postacı zile bastığında anında haberin olur

**SONUÇ:** Sipariş geldiği anda haberdar olursunuz, beklemezsiniz!

---

### [3] TRENDYOL SATICISI NASIL EKLENİR?

#### Adım 1: Satıcıyı Trendyol'da Bulun
1. Trendyol.com'a gidin
2. Beğendiğiniz bir ürünü açın
3. Satıcı adına tıklayın
4. Satıcının mağaza sayfası açılır

#### Adım 2: Satıcı Bilgilerini Alın

**Örnek URL:**
```
https://www.trendyol.com/magaza/defacto-m-123456
```

- **Satıcı ID:** `123456` (URL sonundaki sayı)
- **Satıcı Adı:** `defacto`
- **Tam URL:** Tüm linki kopyalayın

#### Adım 3: Satıcı Ekleyin

**Seçenek A: Mobil Uygulama (Kolay)** [ÖNERİLEN]

1. Mobil uygulamayı başlatın: `cd mobile_app && npx expo start`
2. Alt menüden **"Satıcılar"** sekmesine gidin
3. Sağ alt [+] butonuna tıklayın
4. Formu doldurun ve **Ekle** butonuna basın

**Seçenek B: Swagger UI (API)**

1. **Tarayıcıda açın:** http://localhost:8000/docs
2. **Giriş yapın:**
   - `/api/auth/login` endpoint'ini açın
   - Email ve şifre girin
   - **Execute** butonuna tıklayın
   - Dönen **token**'ı kopyalayın
3. **Authorize:**
   - Sağ üstteki **Authorize** butonuna tıklayın
   - Token'ı yapıştırın (başına `Bearer ` koymayın, otomatik ekler)
   - **Authorize** butonuna tıklayın
4. **Satıcı ekleyin:**
   - `/api/sellers` POST endpoint'ini açın
   - Request body'yi doldurun:
     ```json
     {
       "trendyol_seller_id": 123456,
       "name": "Defacto",
       "url": "https://www.trendyol.com/magaza/defacto-m-123456",
       "note": "Kaliteli giyim markası"
     }
     ```
   - **Execute** butonuna tıklayın

#### Adım 4: Ürünler Otomatik Çekilir

Satıcı eklendiğinde:
- [OK] Arka planda ürün çekme başlar (Selenium)
- [OK] 10-30 saniye içinde ürünler gelir
- [OK] Veritabanına kaydedilir
- [OK] Mobil uygulamada görünür

**Detaylı Rehber:** [TRENDYOL_SATICI_EKLEME.md](TRENDYOL_SATICI_EKLEME.md)

---

### [4] WEBHOOK KURULUMU (Shopify Entegrasyonu)

#### Seçenek A: Ngrok ile (Test İçin)

```bash
# 1. Ngrok'u indirin: https://ngrok.com/download

# 2. Ngrok başlatın
ngrok http 8000

# 3. Size bir URL verecek:
# https://1234-5678.ngrok-free.app
```

#### Seçenek B: Cloudflare Tunnel (Ücretsiz)

```bash
cloudflared tunnel --url http://localhost:8000
```

#### Shopify Admin'de Ayarlama

1. **Shopify Admin** → Settings → Notifications → Webhooks
2. **Create webhook** butonuna tıklayın
3. Bilgileri doldurun:
   - **Event:** Order creation
   - **Format:** JSON
   - **URL:** `https://YOUR-NGROK-URL/api/webhooks/shopify/orders/create`
4. **Save** butonuna tıklayın

#### Webhook Secret Ayarlama

```cmd
# Windows
set SHOPIFY_WEBHOOK_SECRET=my_super_secret_key_12345
python api.py

# Mac/Linux
export SHOPIFY_WEBHOOK_SECRET=my_super_secret_key_12345
python api.py
```

**Detaylı Rehber:** [WEBHOOK_KURULUM.md](WEBHOOK_KURULUM.md)

---

## HIZLI BAŞLANGIÇ

### 1. Backend'i Başlatın (Zaten Çalışıyor)

```bash
cd dropship_app
python api.py
```

[OK] **Durum:** API çalışıyor → http://localhost:8000

### 2. API'yi Test Edin

**Tarayıcıda açın:** http://localhost:8000/docs

**Test Endpoint'leri:**
- `/api/health` - API sağlık kontrolü
- `/api/webhooks/shopify/test` - Webhook test
- `/api/sellers` - Satıcı listesi

### 3. Webhook'u Test Edin

```bash
# PowerShell ile
Invoke-WebRequest http://localhost:8000/api/webhooks/shopify/test
```

**Beklenen Yanıt:**
```json
{
  "success": true,
  "message": "Webhook endpoint is active",
  "timestamp": "2024-12-17T..."
}
```

### 4. Satıcı Ekleyin

1. http://localhost:8000/docs adresine gidin
2. Login yapın (`/api/auth/login`)
3. Token'ı kopyalayın ve Authorize edin
4. `/api/sellers` POST ile satıcı ekleyin

---

## OLUŞTURULAN DOSYALAR

| Dosya | Açıklama |
|-------|----------|
| [requirements.txt](dropship_app/requirements.txt) | Backend gereksinimleri [OK] |
| [webhooks.py](dropship_app/webhooks.py) | Webhook handler [OK] |
| [TRENDYOL_HESAP_BILGILERI.md](TRENDYOL_HESAP_BILGILERI.md) | Trendyol kullanıcı bilgileri rehberi [OK] |
| [TRENDYOL_SATICI_EKLEME.md](TRENDYOL_SATICI_EKLEME.md) | Satıcı ekleme rehberi [OK] |
| [WEBHOOK_KURULUM.md](WEBHOOK_KURULUM.md) | Webhook kurulum rehberi [OK] |
| [TAMAMLANDI_RAPOR.md](TAMAMLANDI_RAPOR.md) | Proje tamamlanma raporu [OK] |

---

## SONRAKİ ADIMLAR

### 1. Webhook'u Aktif Edin
- [ ] Ngrok veya Cloudflare Tunnel başlatın
- [ ] Public URL alın
- [ ] Shopify Admin'de webhook ekleyin
- [ ] Test siparişi oluşturun

### 2. Trendyol Hesap Bilgilerini Girin (Otomatik Sipariş İçin)
- [ ] Swagger UI'da login yapın
- [ ] `/api/order-automation/save-trendyol-credentials` endpoint'ine POST gönderin
- [ ] Trendyol email ve şifrenizi kaydedin
- [ ] Test edin: `/api/order-automation/test-trendyol-login`

### 3. Satıcı Ekleyin
- [ ] Trendyol'da satıcı bulun
- [ ] Satıcı ID'sini alın
- [ ] API'ye POST isteği gönderin
- [ ] Ürünlerin çekilmesini bekleyin

### 4. Shopify'a Aktarın
- [ ] Ürünleri inceleyin
- [ ] Fiyat marjı ekleyin
- [ ] Shopify'a publish edin
- [ ] Satışa başlayın

---

## FAYDALI BAĞLANTILAR

| Link | Açıklama |
|------|----------|
| http://localhost:8000 | API Ana Sayfa |
| http://localhost:8000/docs | Swagger UI (API Dokümantasyonu) |
| http://localhost:8000/api/webhooks/shopify/test | Webhook Test |
| https://ngrok.com/download | Ngrok İndir |
| https://www.trendyol.com | Trendyol |

---

## YARDIM

### API Çalışmıyor?

```bash
# API'yi yeniden başlatın
cd dropship_app
python api.py
```

### Paket Eksik?

```bash
pip install -r requirements.txt
```

### Webhook Hata Veriyor?

1. API çalışıyor mu? → http://localhost:8000
2. HTTPS kullanıyor musunuz? → Ngrok/Cloudflare
3. Secret ayarlandı mı? → `SHOPIFY_WEBHOOK_SECRET`
4. URL doğru mu? → `/api/webhooks/shopify/orders/create`

---

## HERŞEY HAZIR!

**Size yapılacak bir şey bırakmadım!** 

[OK] Tüm paketler yüklendi  
[OK] Webhook sistemi hazır  
[OK] Satıcı sistemi hazır  
[OK] API çalışıyor  
[OK] Dokümantasyon tamamlandı  

**Şimdi yapmanız gerekenler:**
1. Bu rehberi okuyun
2. Webhook'u aktif edin (ngrok)
3. Trendyol satıcısı ekleyin
4. Satışa başlayın!

---

<div align="center">
  <img src="assets/logo-horizontal.svg" alt="DropFlow" width="250"/>
  
  **DropFlow - Otomatik Dropshipping Platformu**
</div>
