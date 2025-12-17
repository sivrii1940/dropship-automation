# Play Store Yayınlama Rehberi

## 📋 Gereksinimler

### 1. Google Play Console Hesabı
- URL: https://play.google.com/console
- **Ücret**: $25 (tek seferlik)
- Kredi kartı ile ödeme

### 2. Uygulama Materyalleri

#### Store Listing
- **Kısa Açıklama** (80 karakter):
  ```
  Trendyol'dan Shopify'a otomatik ürün transferi ve sipariş yönetimi
  ```

- **Tam Açıklama** (4000 karakter):
  ```
  Dropzy - Dropshipping İşinizi Otomatikleştirin
  
  🚀 ÖZELLİKLER:
  
  ✅ Otomatik Ürün Transferi
  - Trendyol'dan ürünleri tek tıkla Shopify'a aktar
  - Toplu ürün yönetimi
  - Fiyat ve stok senkronizasyonu
  
  ✅ Sipariş Otomasyonu
  - Shopify siparişlerini otomatik Trendyol'a ilet
  - Gerçek zamanlı sipariş takibi
  - Kargo takip numarası otomasyonu
  
  ✅ Satıcı Yönetimi
  - Çoklu Trendyol satıcı desteği
  - Satıcı performans takibi
  - Toplu satıcı ekleme
  
  ✅ Raporlama & Analiz
  - Detaylı satış raporları
  - Kar marjı hesaplama
  - Excel export desteği
  
  💡 KİMLER KULLANMALI?
  - Dropshipping yapan e-ticaret girişimcileri
  - Shopify mağaza sahipleri
  - Trendyol satıcıları ile çalışan firmalar
  
  🔒 GÜVENLİK:
  - Şifreli bağlantı (SSL)
  - Güvenli API entegrasyonu
  - Verileriniz sadece sizde
  
  📱 KULLANIM:
  1. Hesap oluşturun
  2. Shopify mağazanızı bağlayın
  3. Trendyol satıcılarını ekleyin
  4. Otomasyonu başlatın!
  
  ⚡ HIZLI, KOLAY, GÜVENLİ
  
  Destek: swru1940@gmail.com
  Web: https://dropzy.app
  ```

#### Görseller (Gerekli)
- **Uygulama İkonu**: 512x512px (PNG, şeffaf arkaplan)
- **Feature Graphic**: 1024x500px (JPG/PNG)
- **Ekran Görüntüleri**: Minimum 2, maksimum 8
  - Telefon: 1080x1920px veya 1440x2560px
  - Tablet: 1536x2048px (opsiyonel)

#### Kategori
- **Kategori**: Business / Productivity
- **İçerik Derecelendirmesi**: Everyone (3+)

## 🔧 Adım Adım Kurulum

### Adım 1: EAS CLI Kurulumu
```bash
npm install -g eas-cli
```

### Adım 2: Expo Hesabı Oluştur
```bash
eas login
```

### Adım 3: EAS Build Yapılandırması
```bash
cd mobile_app
eas build:configure
```

### Adım 4: Production Build (AAB)
```bash
eas build --platform android --profile production
```

**Bekleme süresi**: 10-20 dakika

### Adım 5: Build Tamamlandı
- EAS dashboardda download linki gelecek
- `.aab` dosyasını indir

### Adım 6: Google Play Console Kurulumu

#### 6.1 Uygulama Oluştur
1. https://play.google.com/console → "Create app"
2. İsim: **Dropzy - Dropshipping Otomasyonu**
3. Dil: Türkçe
4. Kategori: Business

#### 6.2 Store Listing
- Kısa açıklama ve tam açıklama gir (yukarıdan kopyala)
- Görselleri yükle
- Uygulama kategorisini seç

#### 6.3 İçerik Derecelendirmesi
- Questionnaire'i doldur
- Business app olarak işaretle

#### 6.4 Hedef Kitle ve İçerik
- Hedef yaş: 18+
- Reklam içeriği yok

#### 6.5 Production Release
1. Testing → Internal testing → Create new release
2. AAB dosyasını yükle
3. Release notları ekle:
   ```
   🎉 İlk sürüm v1.0.0
   
   ✅ Trendyol → Shopify ürün transferi
   ✅ Otomatik sipariş yönetimi
   ✅ Çoklu satıcı desteği
   ✅ Gerçek zamanlı senkronizasyon
   ```

#### 6.6 Review & Roll Out
1. "Review release" tıkla
2. Tüm gerekli bilgileri kontrol et
3. "Start rollout to production" tıkla

## ⏰ Onay Süreci
- **İlk İnceleme**: 1-7 gün
- **Onay sonrası**: 2-3 saat içinde yayında

## 🚨 Önemli Notlar

### Privacy Policy Gerekli
Google Play artık privacy policy zorunlu tutmaktadır.

**Çözüm**: Basit bir HTML sayfası oluştur ve dropzy.app'te yayınla.

### App Signing
- Google Play App Signing önerilir
- Otomatik key yönetimi
- Kayıp anahtar riski yok

## 🎯 Sonraki Adımlar

1. ✅ **Şimdi**: Build başlat
2. ⏳ **Build hazırken**: Google Play Console hesabı aç
3. 📱 **Build tamam**: AAB'yi Play Console'a yükle
4. 📝 **Store listing**: Açıklama ve görseller ekle
5. 🚀 **Publish**: İncelemeye gönder

## 📞 Destek

Sorun olursa:
- EAS Build Logs: https://expo.dev/accounts/[username]/projects/dropzy-app/builds
- Play Console Help: https://support.google.com/googleplay/android-developer

---

**Hazır mısın? Başlayalım!** 🚀
