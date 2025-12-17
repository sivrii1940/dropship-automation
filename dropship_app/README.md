# Dropship Otomasyon Sistemi

## 🖥️ Masaüstü Uygulaması - Trendyol → Shopify Entegrasyonu

Bu uygulama, Trendyol'dan ürünleri çekip Shopify'a otomatik yükleyen, siparişleri takip eden ve kar marjlarını yönetebileceğiniz bir dropship otomasyon sistemidir.

---

## 🚀 Hızlı Başlangıç

### Windows
`baslat.bat` dosyasına çift tıklayın.

### Mac/Linux
```bash
chmod +x baslat.sh
./baslat.sh
```

---

## 📋 Özellikler

### 📊 Dashboard
- Anlık istatistikler (ürün, sipariş, satıcı sayıları)
- Güncel dolar kuru
- Hızlı fiyat hesaplayıcı
- Son aktiviteler

### 🏪 Satıcı Yönetimi
- Trendyol satıcı ID'si ile satıcı ekleme
- Satıcı ürünlerini otomatik çekme
- Çoklu satıcı desteği

### 📦 Ürün Yönetimi
- Trendyol ürünlerini otomatik çekme
- **Kar marjı ayarlama** (tekli veya toplu)
- TL → USD otomatik dönüşüm
- Shopify'a toplu ürün yükleme
- Ürün durumu takibi

### 🛒 Sipariş Takibi
- Shopify siparişlerini otomatik çekme
- Sipariş durumu takibi
- Müşteri bilgileri görüntüleme

### ⚙️ Ayarlar
- Shopify API yapılandırması
- Varsayılan kar marjı
- Kur tamponu
- Trendyol hesap bilgileri (opsiyonel)

---

## 📝 Kullanım Kılavuzu

### 1️⃣ Shopify API Ayarları

1. Uygulamada **"Ayarlar"** sekmesine gidin
2. Shopify mağaza adınızı girin (örn: `magazam.myshopify.com`)
3. Admin API Access Token'ınızı girin
4. **"Bağlantıyı Test Et"** ile kontrol edin
5. **"Ayarları Kaydet"** butonuna tıklayın

#### Shopify Access Token Nasıl Alınır:
1. Shopify Admin → Ayarlar → Uygulamalar ve satış kanalları
2. "Uygulamalar geliştir" → Yeni uygulama oluştur
3. API erişimi yapılandır → Admin API kapsamlarını seç:
   - `read_products`, `write_products`
   - `read_orders`, `write_orders`
4. Access token'ı kopyalayın

### 2️⃣ Satıcı Ekleme

1. **"Satıcılar"** sekmesine gidin
2. **"Yeni Satıcı Ekle"** butonuna tıklayın
3. Trendyol satıcı ID'sini girin

#### Satıcı ID Nasıl Bulunur:
Trendyol'da satıcı sayfasının URL'sinde bulunur:
```
https://www.trendyol.com/magaza/satici-adi-m-123456
```
Bu örnekte satıcı ID'si: **123456**

### 3️⃣ Ürün Senkronizasyonu

1. **"Satıcılar"** sekmesinde **"🔄 Sync"** butonuna tıklayın
2. Ürünler otomatik olarak çekilecek
3. **"Ürünler"** sekmesinden tüm ürünleri görüntüleyin

### 4️⃣ Kar Marjı Ayarlama

**Tekli Değiştirme:**
- Ürün satırına **çift tıklayın**
- Yeni marj değerini girin (%)

**Toplu Değiştirme:**
- Sayfanın altındaki **"Toplu Marj"** alanına değer girin
- **"Uygula"** butonuna tıklayın

### 5️⃣ Shopify'a Yükleme

1. **"Ürünler"** sekmesinde **"📤 Seçilileri Shopify'a Yükle"** butonuna tıklayın
2. Bekleyen tüm ürünler otomatik yüklenecek
3. İlerleme durumu ekranda gösterilecek

### 6️⃣ Sipariş Takibi

1. **"Siparişler"** sekmesine gidin
2. **"🔄 Siparişleri Senkronize Et"** butonuna tıklayın
3. Shopify'dan gelen siparişleri görüntüleyin

---

## 📂 Dosya Yapısı

```
dropship_app/
├── main.py              # Ana masaüstü uygulaması (GUI)
├── models.py            # Veritabanı modelleri
├── trendyol_scraper.py  # Trendyol ürün çekici
├── shopify_api.py       # Shopify API entegrasyonu
├── order_automation.py  # Sipariş otomasyonu
├── config.py            # Yapılandırma
├── requirements.txt     # Bağımlılıklar
├── baslat.bat           # Windows başlatıcı
├── baslat.sh            # Linux/macOS başlatıcı
└── README.md            # Bu dosya
```

---

## 💾 Veritabanı

Uygulama SQLite kullanır. Tüm veriler `dropship.db` dosyasında saklanır:
- Satıcılar
- Ürünler (fiyatlar, marjlar, Shopify durumu)
- Siparişler
- Ayarlar
- Aktivite logları
- Fiyat geçmişi

---

## ⚠️ Sorun Giderme

### "Python bulunamadı" hatası
- Python 3.11+ yükleyin: https://www.python.org/downloads/
- Kurulum sırasında **"Add Python to PATH"** seçeneğini işaretleyin

### "Module not found" hatası
Sanal ortamı silip yeniden oluşturun:
```batch
rmdir /s /q venv
baslat.bat
```

### Shopify bağlantı hatası
- API token'ın doğru olduğundan emin olun
- Token'ın gerekli izinlere sahip olduğunu kontrol edin

### Trendyol ürünleri çekilmiyor
- İnternet bağlantınızı kontrol edin
- Satıcı ID'sinin doğru olduğundan emin olun

---

## 📊 Fiyat Hesaplama Formülü

```
Shopify Fiyatı ($) = (Trendyol Fiyatı (TL) / Dolar Kuru) × (1 + Kar Marjı %)
```

Örnek:
- Trendyol: 500 TL
- Dolar Kuru: 32 TL
- Kar Marjı: %50

```
Shopify = (500 / 32) × 1.50 = $23.44
```

---

## 📜 Lisans

Bu proje özel kullanım için hazırlanmıştır.
