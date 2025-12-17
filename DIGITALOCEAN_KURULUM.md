# DigitalOcean App Platform Kurulum Rehberi

## 📋 Ön Hazırlık (5 dakika)

### 1. GitHub Repository Oluştur

```bash
# Git başlat (eğer yoksa)
cd "c:\Users\Mustafa\Desktop\MüşteriÇalışmaları\ShopifyOtosatıs"
git init
git add .
git commit -m "Initial commit - DropFlow App"

# GitHub'da yeni repo oluştur: https://github.com/new
# Repo adı: dropflow-app (ya da istediğin isim)

# Remote ekle (USERNAME yerine GitHub kullanıcı adın)
git remote add origin https://github.com/USERNAME/dropflow-app.git
git branch -M main
git push -u origin main
```

---

## 🚀 DigitalOcean Kurulumu (10 dakika)

### 2. DigitalOcean Hesabı Aç

1. **Kayıt Ol:** https://cloud.digitalocean.com/registrations/new
2. **Ödeme Yöntemi Ekle** (kredi kartı)
3. **$200 ücretsiz kredi** al (yeni hesaplara)

### 3. App Platform'da Uygulama Oluştur

**Adım 1: Apps sekmesine git**
- Sol menüden **"Apps"** tıkla
- **"Create App"** butonuna tıkla

**Adım 2: GitHub Bağla**
- **"GitHub"** seç
- **"Manage Access"** → Repository'yi seç (dropflow-app)
- **"Next"** tıkla

**Adım 3: Uygulama Ayarları**

```yaml
# Source Code:
Branch: main
Source Directory: /dropship_app

# Build Command (otomatik algılar):
Auto-detected from Dockerfile

# Run Command:
uvicorn api:app --host 0.0.0.0 --port 8000
```

**Adım 4: App Tier Seç**
- **Basic ($5/mo)** seç
- ✅ 512MB RAM
- ✅ 1 vCPU

**Adım 5: Environment Variables Ekle**

Settings → Components → dropship-app → Environment Variables

```plaintext
JWT_SECRET = your-super-secret-jwt-key-123456789
CHROME_HEADLESS = true
CHROME_NO_SANDBOX = true
LOG_LEVEL = info
ALLOWED_ORIGINS = *
```

**Adım 6: HTTP Routes**
- HTTP Port: `8000`
- HTTP Path: `/`
- ✅ HTTPS (Auto SSL)

**Adım 7: Deploy!**
- **"Create Resources"** tıkla
- ⏳ 5-10 dakika bekle (ilk build)
- ✅ Deploy tamamlandı!

---

## 🔗 URL Al

Deploy tamamlandığında:
```
https://dropflow-app-xxxxx.ondigitalocean.app
```

Bu URL'i kopyala → Mobil app'te API URL olarak kullan!

---

## 🔄 Otomatik Güncelleme Nasıl Çalışır?

### Her Kod Değişikliğinde:

```bash
# 1. Kod değişikliği yap
# Örnek: api.py dosyasını düzenle

# 2. Git commit
git add .
git commit -m "API güncelleme yaptım"

# 3. Push yap
git push origin main

# ✨ Otomatik olur:
# - GitHub'a gider
# - DigitalOcean algılar
# - Docker build başlar
# - Yeni versiyon deploy olur
# - Eski versiyon kapatılır
# - Yeni versiyon açılır
# ⏱️ Süre: 2-3 dakika
# ✅ Zero downtime (kesintisiz)
```

---

## 📊 İzleme ve Yönetim

### Logs (Loglar)
```
DigitalOcean → Apps → dropflow-app → Runtime Logs
```
Tüm hataları, istekleri burada görebilirsin.

### Metrics (İstatistikler)
```
DigitalOcean → Apps → dropflow-app → Insights
```
- CPU kullanımı
- Memory kullanımı
- Request sayısı
- Response times

### Rollback (Eski Versiyona Dön)
```
DigitalOcean → Apps → dropflow-app → Activity
→ İstediğin eski versiyonu seç → "Rollback"
```

---

## 🗃️ Database Yönetimi

### Option 1: SQLite (Dahil)
- ✅ Ücretsiz
- ✅ Kolay
- ⚠️ Veriler her deploy'da sıfırlanabilir

### Option 2: Managed PostgreSQL (+$7/mo)
```
DigitalOcean → Databases → Create Database
→ PostgreSQL → Basic ($7/mo)
→ App'e bağla
```

**Önerilen:** Production'da PostgreSQL kullan.

---

## 💰 Maliyet

| Özellik | Fiyat |
|---------|-------|
| App Platform Basic | $5/ay |
| Managed Database (opsiyonel) | $7/ay |
| **TOPLAM** | **$5-12/ay** |

---

## 🔐 Güvenlik

### 1. JWT Secret Değiştir
```
DigitalOcean → Environment Variables
JWT_SECRET = [32-64 karakter rastgele şifre]
```

### 2. CORS Ayarla
```
ALLOWED_ORIGINS = https://your-mobile-app.com
```

### 3. HTTPS (Otomatik)
DigitalOcean otomatik SSL sertifikası verir.

---

## 🎯 Son Adım: Mobil App'i Bağla

Mobil uygulamada:

```javascript
// mobile_app/src/services/api.js
const API_BASE_URL = 'https://dropflow-app-xxxxx.ondigitalocean.app';
```

Ya da Settings → API Sunucu Ayarları:
```
https://dropflow-app-xxxxx.ondigitalocean.app
```

---

## ✅ Test Et

```bash
# API çalışıyor mu?
curl https://dropflow-app-xxxxx.ondigitalocean.app/health

# Sonuç:
{"status":"healthy"}
```

---

## 🆘 Sorun Çözme

### Build hatası?
```
DigitalOcean → Apps → Activity → Build Logs
```

### Runtime hatası?
```
DigitalOcean → Apps → Runtime Logs
```

### Deploy çok yavaş?
İlk deploy 10 dk sürebilir (Docker image build). Sonrakiler 2-3 dk.

---

## 📞 Destek

- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- Community: https://www.digitalocean.com/community/
- Support Ticket: DigitalOcean panelinden

---

## 🎉 Tamamlandı!

Artık:
- ✅ Kod değişikliği → `git push` → Otomatik deploy
- ✅ HTTPS ile güvenli
- ✅ 7/24 çalışır
- ✅ Herkes mobil app'ten erişebilir
- ✅ Kolay yönetim paneli

**DropFlow App başarıyla deploy edildi!** 🚀
