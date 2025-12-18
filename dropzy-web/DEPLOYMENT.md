# Dropzy Web - DigitalOcean Deployment Kılavuzu

## 🚀 Deployment Adımları

### 1. GitHub Repository Oluştur

```bash
cd dropzy-web
git init
git add .
git commit -m "Initial commit: Dropzy Web Dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dropzy-web.git
git push -u origin main
```

### 2. DigitalOcean App Platform'da Deployment

#### Yöntem A: Otomatik Deployment (Önerilen)

1. DigitalOcean Dashboard'a git: https://cloud.digitalocean.com/apps
2. **Create App** butonuna tıkla
3. GitHub repository'ni seç (dropzy-web)
4. **Static Site** olarak deploy et
5. Build ayarları:
   - **Build Command:** `npm install && npm run build`
   - **Output Directory:** `dist`
6. **dropzy.app** domain'ini app'e bağla

#### Yöntem B: Manual Deployment

```bash
# Production build oluştur
npm run build

# DigitalOcean CLI ile deploy (doctl yüklü ise)
doctl apps create --spec .do/app.yaml
```

### 3. Domain Ayarları

#### A. Namecheap DNS Ayarları

1. Namecheap Dashboard'a git
2. dropzy.app domain'ine tıkla
3. **Advanced DNS** sekmesine geç
4. Aşağıdaki kayıtları ekle:

```
Type: A Record
Host: @
Value: <DigitalOcean App IP>
TTL: Automatic

Type: CNAME Record
Host: www
Value: <DigitalOcean App URL>
TTL: Automatic
```

#### B. DigitalOcean Domain Ayarları

1. App Settings > Domains
2. **Add Domain** > `dropzy.app`
3. **Add Domain** > `www.dropzy.app`
4. DNS kayıtlarını Namecheap'e ekle

### 4. Backend API Bağlantısı

Web uygulaması zaten `https://dropzy.app/api` endpoint'ini kullanıyor.

Backend'in `/api` route'ları zaten ayarlı olmalı:
- `/api/auth/*`
- `/api/products/*`
- `/api/orders/*`
- `/api/sellers/*`
- vb.

### 5. WebSocket Bağlantısı

WebSocket bağlantısı için backend'de SSL sertifikası gerekli.
DigitalOcean App Platform otomatik SSL sağlar.

### 6. Test

Deployment sonrası test et:

```bash
# API test
curl https://dropzy.app/api/auth/login

# Web test
curl https://dropzy.app
```

## 📊 Monitoring

### DigitalOcean Insights

- App Dashboard > Insights
- Bandwidth, requests, errors takip et

### Real-time Logs

```bash
doctl apps logs <app-id> --follow
```

## 🔄 Update Workflow

GitHub'a push yaptığınızda otomatik deploy olur:

```bash
git add .
git commit -m "Update: feature X"
git push origin main
```

## 🔐 Environment Variables

DigitalOcean App Settings > Environment Variables:

- `NODE_ENV=production`
- İhtiyaç halinde ek değişkenler ekle

## 💡 İpuçları

- **CDN:** DigitalOcean CDN otomatik aktif
- **SSL:** Let's Encrypt otomatik sertifika
- **Cache:** Build cache aktif
- **Rollback:** Eski versiyona geri dönüş mevcut

## 🆘 Sorun Giderme

### Build Hatası

```bash
# Lokal test
npm run build
npm run preview
```

### Domain Bağlantı Sorunu

- DNS propagation bekleme süresi: 24-48 saat
- `dig dropzy.app` ile DNS kontrolü

### API Bağlantı Hatası

- Backend'in `/api` route'larını kontrol et
- CORS ayarlarını kontrol et

## 📞 Destek

DigitalOcean Support: https://www.digitalocean.com/support
