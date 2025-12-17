# 🚀 Sunucuya Deployment ve Çoklu Kullanıcı Kurulum Rehberi

## 📋 Gereksinimler

Bu rehber ile:
- ✅ **Herkes kayıt olabilir** (sınırsız kullanıcı)
- ✅ **24/7 kesintisiz çalışır** (production server)
- ✅ **Otomatik güncellemeler** (git push → auto deploy)
- ✅ **SSL/HTTPS** (güvenli bağlantı)
- ✅ **Database backup** (veri güvenliği)
- ✅ **Auto-restart** (crash olursa otomatik başlar)

**Maliyet:** $5/ay (DigitalOcean Basic Droplet) - İlk 60 gün ücretsiz!

---

## 1️⃣ HAZIRLIK (Local - 10 dakika)

### A) Kullanıcı Kayıt Sistemi Kontrolü

Kayıt sistemi zaten hazır! Kontrol edelim:

```bash
# API'de /api/auth/register endpoint'i mevcut
# Test:
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456",
    "full_name": "Test User"
  }'
```

### B) Database için PostgreSQL Geçişi

SQLite production için uygun değil. PostgreSQL'e geçelim:

**1. PostgreSQL Bağlantısını Ekle:**

`dropship_app/database_postgres.py` oluştur:

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Environment'tan PostgreSQL URL al
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database/dropship.db")

# PostgreSQL için connection string düzeltmesi
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### C) Environment Variables

`.env.production` oluştur:

```env
# Database (DigitalOcean otomatik sağlayacak)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT Secret (güvenli random string)
JWT_SECRET_KEY=your-super-secret-key-here-change-this-in-production

# Shopify (kullanıcılar kendi ayarlarını girecek)
# Bu değerler artık veritabanında kullanıcı bazlı

# Trendyol (kullanıcılar kendi ayarlarını girecek)
# Bu değerler artık veritabanında kullanıcı bazlı

# Production settings
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
```

### D) requirements.txt'e PostgreSQL Ekle

```txt
# Mevcut packages...

# PostgreSQL için
psycopg2-binary==2.9.9
sqlalchemy==2.0.23
```

### E) Git'e Commit

```bash
cd "c:\Users\Mustafa\Desktop\MüşteriÇalışmaları\ShopifyOtosatıs"

# Değişiklikleri commit et
git add .
git commit -m "feat: Production ready - PostgreSQL + multi-user support"

# GitHub'a push (henüz remote eklemedin)
```

---

## 2️⃣ GITHUB REPOSITORY (5 dakika)

### A) GitHub'da Yeni Repo Oluştur

1. **GitHub'a git:** https://github.com/new
2. **Repository name:** `shopify-dropship-automation`
3. **Visibility:** Private (önerilen) veya Public
4. **Create repository**

### B) Local'den GitHub'a Push

```bash
# Remote ekle
git remote add origin https://github.com/KULLANICI_ADIN/shopify-dropship-automation.git

# Push et
git branch -M main
git push -u origin main
```

**✅ Artık kodun GitHub'da!**

---

## 3️⃣ DIGITALOCEAN KURULUMU (15 dakika)

### A) DigitalOcean Hesabı

1. **Kayıt ol:** https://cloud.digitalocean.com/registrations/new
2. **Ödeme bilgisi ekle** (kredi kartı)
3. **$200 ücretsiz kredi** al (ilk 60 gün)

### B) PostgreSQL Database Oluştur

1. **Sol menü → Databases → Create Database Cluster**
2. **Settings:**
   - Engine: **PostgreSQL 15**
   - Data Center: **Frankfurt** (Türkiye'ye en yakın)
   - Plan: **Basic - $15/mo** (1 GB RAM, 10 GB disk)
   - Cluster Name: `dropship-db`
3. **Create Database Cluster** → 3-5 dakika bekle

### C) Database User ve Database Oluştur

1. Database hazır olunca **Users & Databases** sekmesi
2. **Add User:**
   - Username: `dropship_user`
   - **Generate Strong Password** → kopyala
3. **Add Database:**
   - Name: `dropship_production`

**✅ Database connection string'i kopyala:**
```
postgresql://dropship_user:PASSWORD@db-host.ondigitalocean.com:25060/dropship_production?sslmode=require
```

### D) App Platform'da Uygulama Oluştur

1. **Sol menü → Apps → Create App**
2. **GitHub'ı seç → Authorize DigitalOcean**
3. **Repository seç:** `shopify-dropship-automation`
4. **Branch:** `main`
5. **Source Directory:** `/dropship_app`
6. **Next**

### E) Build & Deploy Ayarları

**Resource Type:** Web Service

**Build Command:**
```bash
pip install -r requirements.txt
```

**Run Command:**
```bash
python -m uvicorn api:app --host 0.0.0.0 --port 8080
```

**HTTP Port:** `8080`

**Instance Size:** 
- **Basic - $5/mo** (512 MB RAM, 1 vCPU)
- İlk 3 ay ücretsiz deneme!

### F) Environment Variables Ekle

**App Settings → Environment Variables:**

```env
DATABASE_URL=${dropship-db.DATABASE_URL}
JWT_SECRET_KEY=your-super-secret-random-string-here
ENVIRONMENT=production
DEBUG=false
PYTHONUNBUFFERED=1
```

**Önemli:** `DATABASE_URL` için **"Use Database Connection String"** seç

### G) Deploy!

1. **Review → Create Resources**
2. **Deploy** butonuna tıkla
3. **5-10 dakika bekle** (ilk deploy uzun sürer)

**✅ Tamamlandığında:**
- URL: `https://your-app-name.ondigitalocean.app`
- SSL/HTTPS otomatik aktif
- Auto-deploy aktif (git push → otomatik güncelleme)

---

## 4️⃣ MOBILE APP AYARLARI

### Mobil Uygulamayı Güncelle

`mobile_app/src/services/api.js` dosyasını güncelle:

```javascript
import axios from 'axios';

// Production URL
const API_URL = 'https://your-app-name.ondigitalocean.app';

// WebSocket URL
const WS_URL = 'wss://your-app-name.ondigitalocean.app';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ... rest of the code
```

### WebSocket URL'i Güncelle

`mobile_app/App.js` dosyasında:

```javascript
useEffect(() => {
  // Production WebSocket URL
  const apiUrl = 'https://your-app-name.ondigitalocean.app';
  websocketService.connect(apiUrl);
  
  // ... rest
}, []);
```

---

## 5️⃣ KULLANICI KAYIT SİSTEMİ

### Kullanıcı Nasıl Kayıt Olur?

**Web/Mobile App'te:**

1. **Login ekranında "Kayıt Ol" butonu**
2. **Kayıt formu:**
   - Email
   - Şifre
   - Ad Soyad
3. **Kayıt tıkla** → API'ye POST request
4. **JWT token dönüyor** → otomatik login
5. **Dashboard açılıyor** → kendi verileri

### API Endpoint'leri

**Kayıt:**
```bash
POST https://your-app.ondigitalocean.app/api/auth/register
{
  "email": "user@example.com",
  "password": "123456",
  "full_name": "John Doe"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Login:**
```bash
POST https://your-app.ondigitalocean.app/api/auth/login
{
  "email": "user@example.com",
  "password": "123456"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Her Kullanıcı Kendi Verilerini Görür

Backend zaten user_id bazlı çalışıyor:

```python
# Her endpoint'te kullanıcı kontrolü
@app.get("/api/products")
async def get_products(current_user: dict = Depends(get_current_user)):
    user_id = current_user['user_id']
    products = Product.get_all(user_id)  # Sadece kendi ürünleri
    return {"success": True, "data": products}
```

**✅ Her kullanıcı sadece kendi verilerini görür ve yönetir!**

---

## 6️⃣ KESİNTİSİZ ÇALIŞMA GARANTİSİ

### DigitalOcean Otomatik Özellikleri

**1. Auto-Restart**
- App crash olursa otomatik yeniden başlar
- Health check her 30 saniye
- 3 başarısız check → restart

**2. Zero-Downtime Deploy**
- Git push → yeni build → eski version çalışıyor
- Yeni version hazır → traffic'i yeniye yönlendir
- Eski version kapanır
- **Kullanıcılar kesinti görmez!**

**3. Auto-Scaling (opsiyonel)**
- Yük artınca otomatik instance ekler
- Professional plan: $12/mo

**4. Health Check Endpoint**

Backend'e ekle (zaten var):

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }
```

**5. Monitoring & Alerts**

DigitalOcean Dashboard:
- CPU kullanımı
- Memory kullanımı
- Response time
- Error rate
- Email alerts (CPU %90 üzeri)

---

## 7️⃣ VERITABANIN YEDEKLEME

### Otomatik Backup

DigitalOcean Database:
- **Günlük otomatik backup** (ücretsiz)
- 7 gün saklanır
- Tek tıkla restore
- Point-in-time recovery (Professional)

### Manual Backup

```bash
# Database export
pg_dump -h db-host.ondigitalocean.com -U dropship_user -d dropship_production > backup.sql

# Database import (restore)
psql -h db-host.ondigitalocean.com -U dropship_user -d dropship_production < backup.sql
```

---

## 8️⃣ GÜNCELLEMELERİ YAYINLAMA

### Yeni Özellik Eklediysen

```bash
# Local'de değişiklikleri yap
# Test et: python api.py

# Commit et
git add .
git commit -m "feat: New feature description"

# Push et → OTOMATIK DEPLOY!
git push origin main
```

**✅ 5 dakika sonra canlıda!**

---

## 9️⃣ KULLANICI YÖNETİMİ (Admin Panel)

### Admin Endpoint'leri Ekle (Opsiyonel)

```python
@app.get("/api/admin/users")
async def list_users(current_user: dict = Depends(get_admin_user)):
    # Sadece admin görebilir
    users = User.get_all()
    return {"success": True, "data": users}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_admin_user)):
    # Kullanıcı silme
    User.delete(user_id)
    return {"success": True}
```

---

## 🔟 MALİYET ANALİZİ

### Aylık Maliyetler

| Hizmet | Plan | Fiyat |
|--------|------|-------|
| **App Platform** | Basic | $5/mo |
| **PostgreSQL Database** | Basic | $15/mo |
| **Toplam** | | **$20/mo** |

### İlk 60 Gün

- **DigitalOcean:** $200 ücretsiz kredi
- **10 ay boyunca ücretsiz!**
- Daha sonra $20/mo

### Kullanıcı Başına Maliyet

- **100 kullanıcı:** $0.20/kullanıcı/ay
- **1000 kullanıcı:** $0.02/kullanıcı/ay
- **Sınırsız kullanıcı destekler!**

---

## 🎯 DEPLOYMENT KONTROL LİSTESİ

### Deployment Öncesi

- [ ] PostgreSQL desteği eklendi
- [ ] Environment variables ayarlandı
- [ ] requirements.txt güncellendi
- [ ] Health check endpoint var
- [ ] JWT secret güvenli
- [ ] Git commit yapıldı
- [ ] GitHub'a push edildi

### Deployment Sonrası

- [ ] DigitalOcean hesabı açıldı
- [ ] Database oluşturuldu
- [ ] App Platform oluşturuldu
- [ ] Environment variables ayarlandı
- [ ] İlk deploy başarılı
- [ ] HTTPS çalışıyor
- [ ] WebSocket çalışıyor
- [ ] Kayıt sistemi test edildi
- [ ] Login sistemi test edildi
- [ ] Real-time sync test edildi

### Mobil App Güncelleme

- [ ] API URL güncellendi
- [ ] WebSocket URL güncellendi
- [ ] Production build alındı
- [ ] App store'a yüklendi (opsiyonel)

---

## 🚨 SORUN GİDERME

### 1. Deploy Başarısız

**Hata:** `Build failed`

**Çözüm:**
- requirements.txt'te syntax hatası var mı?
- Python version doğru mu? (3.11)
- Build logs'u kontrol et

### 2. Database Bağlantı Hatası

**Hata:** `Connection refused`

**Çözüm:**
- DATABASE_URL doğru mu?
- Database cluster çalışıyor mu?
- Firewall ayarları (DigitalOcean otomatik ayarlar)

### 3. WebSocket Çalışmıyor

**Hata:** `WebSocket connection failed`

**Çözüm:**
- URL `wss://` ile başlamalı (not `ws://`)
- HTTPS aktif mi kontrol et
- Firewall ayarları

### 4. 502 Bad Gateway

**Hata:** `502 Bad Gateway`

**Çözüm:**
- App restart yap
- Health check endpoint çalışıyor mu?
- Logs'u kontrol et

---

## 📱 MOBİL APP DEPLOYMENT

### Expo ile Production Build

```bash
cd mobile_app

# iOS build (Mac gerekli)
eas build --platform ios

# Android build
eas build --platform android

# Her iki platform
eas build --platform all
```

### App Store / Play Store

1. **Apple Developer** hesabı ($99/yıl)
2. **Google Play Developer** hesabı ($25 bir kerelik)
3. Build'leri upload et
4. Review bekle (1-7 gün)
5. Yayınla!

---

## 🎉 TAMAMLANDI!

### Sistem Artık:

- ✅ **Herkes kayıt olabilir**
- ✅ **24/7 kesintisiz çalışır**
- ✅ **Otomatik güncellemeler**
- ✅ **SSL/HTTPS güvenli**
- ✅ **Database backup**
- ✅ **Auto-restart**
- ✅ **Monitoring**
- ✅ **Sınırsız kullanıcı**
- ✅ **Her kullanıcı kendi verileri**
- ✅ **Real-time sync**
- ✅ **Multi-device support**

### Kullanıcı Deneyimi:

1. **Kayıt ol:** Email + Şifre
2. **Login:** JWT token
3. **Dashboard:** Kendi verileri
4. **Ürün ekle:** Sadece kendisi görür
5. **Real-time sync:** Tüm cihazlarda
6. **Kesintisiz:** 7/24 erişim

**Başarılar!** 🚀
