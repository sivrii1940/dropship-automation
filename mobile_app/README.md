# Dropship Mobil Uygulama

React Native (Expo) ile geliştirilmiş Android ve iOS mobil uygulaması.

## Özellikler

- 📊 **Dashboard**: Genel istatistikler, satış ve sipariş özeti
- 📦 **Ürün Yönetimi**: Trendyol ürünlerini listeleme ve Shopify'a aktarma
- 🛒 **Sipariş Takibi**: Shopify siparişlerini takip etme
- 🏪 **Satıcı Yönetimi**: Trendyol satıcılarını ekleme/silme
- ⚙️ **Ayarlar**: API ve stok senkronizasyon ayarları

## Kurulum

### Gereksinimler

- Node.js 18+ 
- npm veya yarn
- Expo CLI
- Android Studio (Android için) veya Xcode (iOS için)

### Adımlar

1. **Bağımlılıkları yükleyin:**
   ```bash
   cd mobile_app
   npm install
   ```

2. **Expo CLI yükleyin (global):**
   ```bash
   npm install -g @expo/cli
   ```

3. **Uygulamayı başlatın:**
   ```bash
   npx expo start
   ```

4. **Telefonunuzda test edin:**
   - **Android**: Expo Go uygulamasını yükleyin ve QR kodu taratın
   - **iOS**: Expo Go uygulamasını yükleyin ve QR kodu taratın

## API Sunucusu

Mobil uygulamanın çalışması için API sunucusunun çalışıyor olması gerekir.

### API Sunucusunu Başlatın:

```bash
cd dropship_app
python api.py
```

Sunucu varsayılan olarak `http://localhost:8000` adresinde çalışır.

### Mobil Cihazdan Bağlantı

Mobil cihazınızın bilgisayarınızla aynı Wi-Fi ağında olması gerekir.

1. Bilgisayarınızın yerel IP adresini öğrenin:
   - Windows: `ipconfig` komutu
   - Mac/Linux: `ifconfig` veya `ip addr` komutu

2. Mobil uygulamada **Ayarlar** > **API URL** kısmına IP adresini girin:
   ```
   http://192.168.1.XXX:8000
   ```

## Geliştirme

### Dosya Yapısı

```
mobile_app/
├── App.js                      # Ana uygulama ve navigasyon
├── package.json                # Bağımlılıklar
├── app.json                    # Expo yapılandırması
├── babel.config.js             # Babel yapılandırması
└── src/
    ├── screens/
    │   ├── DashboardScreen.js  # Ana sayfa
    │   ├── ProductsScreen.js   # Ürün listesi
    │   ├── OrdersScreen.js     # Sipariş listesi
    │   ├── SellersScreen.js    # Satıcı yönetimi
    │   └── SettingsScreen.js   # Ayarlar
    └── services/
        └── api.js              # API iletişim servisi
```

### Build Alma

**Android APK:**
```bash
npx expo build:android
```

**iOS IPA:**
```bash
npx expo build:ios
```

**EAS Build (Önerilen):**
```bash
npm install -g eas-cli
eas build --platform all
```

## Renk Paleti

- Arka plan: `#0f0f1a`
- Kart arka planı: `#1a1a2e`
- Input arka planı: `#2a2a3e`
- Birincil renk: `#3b82f6` (mavi)
- Başarı: `#10b981` (yeşil)
- Hata: `#ef4444` (kırmızı)
- Metin: `#fff` (beyaz)
- İkincil metin: `#64748b` (gri)
