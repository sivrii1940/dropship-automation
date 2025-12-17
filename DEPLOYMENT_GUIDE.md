# 🚀 DigitalOcean Deployment Rehberi

## 📋 Genel Bakış

**Toplam Maliyet:** $27/ay (App + Database) + $15/yıl (Domain)
**Süre:** ~30 dakika
**Sonuç:** 24/7 çalışan, sınırsız kullanıcılı production sistem

---

## ✅ Adım 1: GitHub'a Yükleme

### 1.1 GitHub Repository Oluştur

1. https://github.com/new adresine git
2. Repository bilgileri:
   - **Repository name:** `dropship-automation`
   - **Visibility:** Private (önerilen) veya Public
   - **Initialize:** HAYIR (boş bırak, zaten koddayız var)
3. "Create repository" butonuna bas

### 1.2 Kodu GitHub'a Push Et

Terminal'de şu komutları çalıştır:

```bash
# GitHub repository'nizi bağlayın (URL'i değiştirin!)
git remote add origin https://github.com/KULLANICI_ADINIZ/dropship-automation.git

# Main branch oluştur
git branch -M main

# Kodu GitHub'a yükle
git push -u origin main
```

**✅ Kontrol:** GitHub'da dosyalarınızı görebilirsiniz

---

## ✅ Adım 2: DigitalOcean Hesabı

### 2.1 Hesap Oluştur

1. https://www.digitalocean.com/ adresine git
2. "Sign Up" butonuna tıkla
3. Email/Google ile kayıt ol
4. Kredi kartı ekle (ilk $200 ücretsiz kredi verebilirler)

### 2.2 Billing Ayarları

1. Account → Billing
2. Kredi kartı bilgilerini ekle
3. Billing alerts ayarla (örn: $30'da uyar)

---

## ✅ Adım 3: App Oluşturma

### 3.1 Yeni App Başlat

1. DigitalOcean Dashboard → **Apps** → **Create App**
2. **Source:** GitHub
3. "Connect GitHub Account" butonuna tıkla
4. GitHub'da yetkilendirme yap
5. Repository seç: `dropship-automation`
6. Branch seç: `main`
7. **Autodeploy:** Açık bırak (her push'da otomatik deploy)

### 3.2 App Konfigürasyonu

**Source Directory:**
```
dropship_app
```

**Detected:** Python app olarak otomatik tanıyacak

**Build Command:** (Otomatik gelecek)
```bash
pip install -r requirements.txt
```

**Run Command:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8080
```

**HTTP Port:**
```
8080
```

### 3.3 Plan Seçimi

- **Plan:** Professional Basic ($12/mo)
- **Region:** Frankfurt (FRA1) - Türkiye'ye en yakın
- **Instance Size:** 1 GB RAM / 1 vCPU

---

## ✅ Adım 4: PostgreSQL Database Ekleme

### 4.1 Database Oluştur

1. App ayarlarında → **Resources** tab
2. "Add Resource" → **Database**
3. **Type:** PostgreSQL
4. **Plan:** Basic ($15/mo)
5. **Name:** `dropship-db`
6. **Region:** Frankfurt (FRA1) - App ile aynı bölge
7. "Add Database" butonuna tıkla

### 4.2 Database Connection

DigitalOcean otomatik olarak `DATABASE_URL` environment variable oluşturacak.

**Format:**
```
postgresql://username:password@host:port/database
```

---

## ✅ Adım 5: Environment Variables

### 5.1 Gerekli Environment Variables

App Settings → **App-Level Environment Variables** → Edit

```bash
# Database (Otomatik gelecek)
DATABASE_URL=${dropship-db.DATABASE_URL}

# JWT Secret (Rastgele 32+ karakter oluştur)
JWT_SECRET_KEY=your-super-secret-key-here-change-this-random-32-chars

# Environment
ENVIRONMENT=production

# CORS (App URL'iniz buraya gelecek)
ALLOWED_ORIGINS=https://your-app-name.ondigitalocean.app
```

### 5.2 JWT Secret Oluşturma

Terminal'de:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Çıkan değeri `JWT_SECRET_KEY` olarak kullan.

---

## ✅ Adım 6: İlk Deployment

### 6.1 Deploy Başlat

1. "Review" butonuna tıkla
2. Tüm ayarları kontrol et
3. **"Create Resources"** butonuna tıkla

### 6.2 Deployment İzleme

- **Süre:** ~5-7 dakika
- **Durum:** Settings → Activity tab'dan izle
- **Loglar:** Runtime Logs'dan takip et

### 6.3 Build Hatası Çözümü

Eğer build hatası alırsanız:

1. Runtime Logs'u kontrol et
2. `requirements.txt` eksik paket var mı?
3. Python version kontrol: Python 3.9+ gerekli

---

## ✅ Adım 7: Database Migration

### 7.1 Console'a Bağlan

1. App → Console tab
2. "Launch Console" butonuna tıkla
3. Web terminal açılacak

### 7.2 Database Tablolarını Oluştur

Console'da:

```bash
# Python shell aç
python

# Database'i initialize et
from database_postgres import init_postgres_schema
init_postgres_schema()
exit()
```

### 7.3 Test Kullanıcısı Oluştur

API'yi test et:

```bash
curl -X POST https://your-app-name.ondigitalocean.app/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@yourdomain.com",
    "password": "SecurePass123!",
    "full_name": "Admin User"
  }'
```

---

## ✅ Adım 8: Domain Satın Alma ve Bağlama

### 8.1 Domain Satın Al

**Önerilen Domain Sağlayıcılar:**

1. **Namecheap** (https://www.namecheap.com/)
   - Fiyat: ~$10/yıl (.com)
   - Ücretsiz WHOIS privacy
   - Kolay yönetim

2. **GoDaddy** (https://www.godaddy.com/)
   - Fiyat: ~$15/yıl (.com)
   - Türkçe destek

3. **Google Domains** (https://domains.google/)
   - Fiyat: ~$12/yıl
   - Google entegrasyonu

**Domain önerileri:**
- `dropship-automation.com`
- `trendyol-dropship.com`
- `otosatis.app`
- `siparis-otomasyon.com`

### 8.2 DigitalOcean'a Domain Ekle

1. App → Settings → **Domains** tab
2. "Add Domain" butonuna tıkla
3. Domain adınızı girin: `yourdomain.com`
4. "Add Domain" butonuna tıkla

### 8.3 DNS Kayıtlarını Güncelle

DigitalOcean size DNS kayıtları verecek:

**A Record:**
```
Type: A
Host: @
Value: [DigitalOcean IP'si]
TTL: 3600
```

**CNAME Record (www):**
```
Type: CNAME
Host: www
Value: yourdomain.com
TTL: 3600
```

**Namecheap'te DNS Ayarı:**

1. Namecheap → Domain List → Manage
2. Advanced DNS tab
3. "Add New Record" butonuna tıkla
4. Yukarıdaki kayıtları ekle
5. Save All Changes

**Propagasyon Süresi:** 10-60 dakika (bazen 24 saat)

### 8.4 SSL Sertifikası (Otomatik)

DigitalOcean otomatik olarak Let's Encrypt SSL sertifikası oluşturacak.

**Kontrol:**
```
https://yourdomain.com/health
```

Yeşil kilit simgesi görmelisiniz! 🔒

---

## ✅ Adım 9: Mobile App Güncelleme

### 9.1 API URL Değiştir

`mobile_app/src/services/api.js` dosyasını güncelle:

```javascript
// Production URL'inizi girin
const API_BASE_URL = 'https://yourdomain.com';  // veya DigitalOcean URL
const WS_URL = 'wss://yourdomain.com/ws';
```

### 9.2 Yeniden Build

```bash
cd mobile_app
npm start
```

---

## ✅ Adım 10: Test ve Doğrulama

### 10.1 API Health Check

```bash
curl https://yourdomain.com/health
```

**Beklenen:** `{"status": "healthy"}`

### 10.2 User Registration Testi

```bash
curl -X POST https://yourdomain.com/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@email.com",
    "password": "TestPass123",
    "full_name": "Test User"
  }'
```

### 10.3 Login Testi

```bash
curl -X POST https://yourdomain.com/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@email.com",
    "password": "TestPass123"
  }'
```

**Token alacaksınız!**

### 10.4 WebSocket Testi

Mobile app'te:
1. Login olun
2. Dashboard'da bağlantı durumunu kontrol edin
3. Bir ürün ekleyin
4. Real-time güncellemeyi göreceksiniz

---

## 📊 Maliyet Özeti

### Aylık Maliyetler

| Hizmet | Fiyat | Açıklama |
|--------|-------|----------|
| DigitalOcean App | $12/ay | Professional Basic plan |
| PostgreSQL Database | $15/ay | Managed database + backups |
| **Toplam** | **$27/ay** | **~850 TL/ay** |

### Yıllık Maliyetler

| Hizmet | Fiyat | Açıklama |
|--------|-------|----------|
| Domain | $15/yıl | .com domain |
| **Toplam** | **$15/yıl** | **~500 TL/yıl** |

### Genel Toplam

```
Aylık: $27 = ~850 TL/ay
Yıllık: $324 + $15 = $339 = ~11.000 TL/yıl
```

---

## 🔧 Monitoring ve Maintenance

### DigitalOcean Alerts

1. App → Settings → **Alerts**
2. Alert ekle:
   - CPU > 80% için
   - Memory > 80% için
   - Error rate > 5% için

### Uptime Monitoring

**Ücretsiz Araçlar:**

1. **UptimeRobot** (https://uptimerobot.com/)
   - 50 monitor ücretsiz
   - Email alerts
   - Setup: `https://yourdomain.com/health` her 5 dakikada kontrol

2. **Better Stack** (https://betterstack.com/)
   - 10 monitor ücretsiz
   - SMS + Email alerts

### Database Backups

DigitalOcean otomatik backup yapıyor:
- **Frequency:** Günlük
- **Retention:** 7 gün
- **Cost:** Dahil ($15/ay'a)

**Manuel Backup:**

```bash
# Console'dan
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## 🔄 Güncellemeler

### Kod Güncellemesi

```bash
# Lokal'de değişiklik yap
git add .
git commit -m "feat: yeni özellik"
git push origin main
```

DigitalOcean otomatik deploy yapacak! (~3 dakika)

### Database Güncellemesi

Yeni tablo eklerseniz:

```bash
# Console'a bağlan
python
from database_postgres import init_postgres_schema
init_postgres_schema()
```

---

## 🆘 Troubleshooting

### Build Hatası

**Hata:** `requirements.txt not found`

**Çözüm:**
1. App Settings → Source Directory: `dropship_app` olmalı

### Database Connection Hatası

**Hata:** `could not connect to server`

**Çözüm:**
1. Environment variables kontrol et
2. `DATABASE_URL` doğru mu?
3. Database aynı region'da mı? (Frankfurt)

### SSL Sertifikası Yüklenmiyor

**Hata:** `NET::ERR_CERT_COMMON_NAME_INVALID`

**Çözüm:**
1. DNS kayıtları doğru mu? (A record)
2. 24 saat bekle (DNS propagation)
3. DigitalOcean → Domains → "Verify DNS"

### App Çalışmıyor

**Kontrol:**
1. Runtime Logs → Hata var mı?
2. Environment variables tam mı?
3. Health endpoint: `https://yourdomain.com/health`

---

## 📱 Mobile App Production Build

### Android APK Oluşturma

```bash
cd mobile_app

# Production build
eas build --platform android --profile production

# Download APK
# Google Play Store'a yükle veya direkt dağıt
```

### iOS IPA Oluşturma

```bash
# iOS build (Mac gerekli)
eas build --platform ios --profile production

# App Store'a yükle
```

---

## 🎉 Tamamlandı!

Sisteminiz şimdi:

- ✅ 24/7 çalışıyor
- ✅ Sınırsız kullanıcı destekliyor
- ✅ HTTPS ile güvenli
- ✅ Otomatik yedekleme yapılıyor
- ✅ Real-time WebSocket çalışıyor
- ✅ Özel domain'iniz var

**Live URL:** `https://yourdomain.com`

**Kullanıcılar nasıl kayıt olur?**
1. Mobile app açılır
2. "Kayıt Ol" butonuna tıklanır
3. Bilgiler girilir
4. Her kullanıcı kendi verilerini görür (data isolation)

---

## 📞 Destek

**DigitalOcean Destek:**
- Help → Support Tickets
- Community Forum: https://www.digitalocean.com/community

**Domain Destek:**
- Namecheap: 24/7 Live Chat
- GoDaddy: Türkçe telefon desteği

---

## 🔐 Güvenlik Notları

1. **JWT Secret'ı Paylaşma:** Environment variable'da kalsın
2. **Database Credentials:** Asla commit etme
3. **API Keys:** `.env` dosyasında tut (gitignore'da)
4. **Regular Updates:** Haftada bir `git pull` yap ve deploy et
5. **Backup Downloads:** Ayda bir manuel backup al

---

**🚀 Başarılar! Artık production'da tam teşekküllü bir sistem var!**
