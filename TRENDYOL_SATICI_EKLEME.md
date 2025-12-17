# DropFlow - Trendyol Satıcı Ekleme Rehberi

<div align="center">
  <img src="assets/logo.svg" alt="DropFlow" width="120"/>
</div>

## Satıcı Sistemi Nedir?

Trendyol'da istediğiniz satıcıları takip ederek, o satıcının ürünlerini otomatik olarak Shopify mağazarınıza aktarabilirsiniz.

## Satıcı Bilgilerini Nereden Bulursunuz?

### Adım 1: Trendyol'da Satıcı Sayfasına Gidin

1. **Trendyol.com**'a gidin
2. Beğendiğiniz bir ürünün detay sayfasını açın
3. Satıcı adının üstüne tıklayın
4. Satıcının mağaza sayfası açılacak

### Adım 2: Satıcı Bilgilerini Kopyalayın

**URL'den Satıcı ID'sini Alın:**

Örnek URL:
```
https://www.trendyol.com/magaza/satici-adi-m-123456
```

- **Satıcı ID:** `123456` (URL'nin sonundaki sayı)
- **Satıcı Adı:** `satici-adi`
- **Satıcı URL:** Tüm URL'yi kopyalayın

## Sisteme Satıcı Nasıl Eklenir?

### Yöntem 1: API ile (Backend)

```python
import requests

# API endpoint
url = "http://localhost:8000/api/sellers"

# Satıcı bilgileri
data = {
    "trendyol_seller_id": 123456,
    "name": "Örnek Satıcı",
    "url": "https://www.trendyol.com/magaza/ornek-satici-m-123456",
    "note": "Bu satıcının ürünleri kaliteli"
}

# Token ile istek
headers = {
    "Authorization": "Bearer YOUR_TOKEN_HERE"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

**Yanıt:**
```json
{
    "success": true,
    "message": "Satıcı eklendi, ürünler çekiliyor...",
    "data": {
        "id": 1,
        "name": "Örnek Satıcı",
        "url": "https://www.trendyol.com/magaza/ornek-satici-m-123456",
        "trendyol_seller_id": 123456,
        "product_count": 0
    }
}
```

### Yöntem 2: Swagger UI ile (Tarayıcı)

1. **API Docs'a gidin:** http://localhost:8000/docs
2. **Auth bölümünden** giriş yapın (`/api/auth/login`)
3. **Token'ı kopyalayın** ve "Authorize" butonuna tıklayın
4. **POST /api/sellers** endpoint'ini açın
5. **Request body**'yi doldurun:
   ```json
   {
     "trendyol_seller_id": 123456,
     "name": "Örnek Satıcı",
     "url": "https://www.trendyol.com/magaza/ornek-satici-m-123456",
     "note": "İsteğe bağlı not"
   }
   ```
6. **Execute** butonuna tıklayın

### Yöntem 3: Mobil Uygulama ile [HAZIR]

**Mobil uygulamada artık satıcı ekleyebilirsiniz!**

#### Adım 1: Mobil Uygulamayı Başlatın
```bash
cd mobile_app
npx expo start
```

#### Adım 2: Satıcılar Sekmesine Gidin
- Alt menüden **"Satıcılar"** sekmesine tıklayın

#### Adım 3: Yeni Satıcı Ekleyin
1. Sağ alt köşedeki **+** (artı) butonuna tıklayın
2. Formu doldurun:
   - **Satıcı Adı:** Örn: "Defacto"
   - **Trendyol URL:** `https://www.trendyol.com/magaza/defacto-m-123456`
   - **Not (opsiyonel):** "Giyim markası"
3. **Ekle** butonuna tıklayın

#### Adım 4: Ürünler Otomatik Çekilir
- [OK] Arka planda ürün çekme başlar
- [OK] Bildirim gelir
- [OK] Ürünler ekranında görünür

**Özellikler:**
- [OK] Satıcı listesi görüntüleme
- [OK] Yeni satıcı ekleme
- [OK] Satıcı silme
- [OK] Ürün senkronizasyonu
- [OK] Offline mode desteği

## Satıcı İşlemleri

### Satıcıları Listeleme

**GET** `/api/sellers`

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/sellers
```

**Yanıt:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "user_id": 1,
            "trendyol_seller_id": 123456,
            "name": "Örnek Satıcı",
            "url": "https://www.trendyol.com/magaza/ornek-satici-m-123456",
            "product_count": 25,
            "note": "Kaliteli ürünler",
            "created_at": "2024-01-15T10:30:00"
        }
    ]
}
```

### Satıcıyı Silme

**DELETE** `/api/sellers/{seller_id}`

```bash
curl -X DELETE \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/sellers/1
```

### Satıcı Ürünlerini Yeniden Çekme

**POST** `/api/sellers/{seller_id}/sync-products`

```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/sellers/1/sync-products
```

## Otomatik Ürün Çekme

Satıcı eklendiğinde:

1. [OK] Satıcı bilgileri kaydedilir
2. [OK] Arka planda ürün çekme işlemi başlar (Selenium)
3. [OK] Ürünler veritabanına kaydedilir
4. [OK] Mobil uygulamada görünür hale gelir

**Süreç:**
- Trendyol scraping: ~10-30 saniye (ürün sayısına göre)
- Ürünler sayfa sayfa çekilir
- Her ürün için:
  - Başlık
  - Açıklama
  - Fiyat (indirimli/normal)
  - Stok durumu
  - Görseller
  - URL

## İpuçları

### Kaliteli Satıcı Seçme

**İyi Özellikler:**
- Yüksek puan (4.5+)
- Çok sayıda değerlendirme
- Hızlı kargo
- İade garantisi
- Güncel ürünler

**Kaçınılması Gerekenler:**
- Düşük puan (<4.0)
- Az değerlendirme
- Sahte ürünler
- Yavaş kargo

### Satıcı Takibi

- Satıcıları düzenli kontrol edin
- Stok durumunu izleyin
- Fiyat değişikliklerini takip edin
- Yeni ürünleri ekleyin

### Performans

- Aynı anda çok fazla satıcı eklemeyin (API limitleri)
- Ürün çekme tamamlandıktan sonra yeni satıcı ekleyin
- Duplicate kontrolü yapın

## Örnek Kullanım Senaryosu

**1. Trend Niche Seçimi**
- Spor giyim
- Elektronik aksesuar
- Ev dekorasyonu

**2. Trendyol'da Araştırma**
- En çok satanlar listesi
- Yüksek puanlı satıcılar
- İyi yorumlar

**3. Satıcıları Sisteme Ekleme**
- 3-5 satıcı seçin
- Her birini API'ye ekleyin
- Ürün çekme işlemini bekleyin

**4. Shopify'a Aktarma**
- Ürünleri inceleyin
- Fiyat marjı ekleyin
- Shopify'a publish edin

**5. Satış Takibi**
- Webhook ile siparişleri takip edin
- Trendyol'dan sipariş verin
- Kargo takibi yapın

## Sorun Giderme

### Satıcı eklenmiyor?

**Kontrol Listesi:**
1. **Seller ID doğru mu?** URL'den doğru sayıyı aldınız mı?
2. **Token geçerli mi?** Login olup yeni token alın
3. **API çalışıyor mu?** http://localhost:8000/docs kontrol edin
4. **Duplicate satıcı?** Aynı satıcı zaten ekli olabilir

### Ürünler çekilmiyor?

**Kontrol Listesi:**
1. **Selenium çalışıyor mu?** Chrome/Firefox kurulu olmalı
2. **Internet bağlantısı?** Trendyol erişilebilir mi?
3. **Selenium driver?** webdriver-manager otomatik indirecek
4. **Logları kontrol edin:** Terminal'de hata mesajları var mı?

### Ürün sayısı yanlış?

- Trendyol sayfasında kaç ürün var kontrol edin
- Pagination düzgün çalışıyor mu?
- Stok durumu "tükendi" olanlar sayılmıyor olabilir

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| [models.py](dropship_app/models.py) | Seller model tanımı |
| [api.py](dropship_app/api.py) | Seller API endpoints |
| [trendyol_scraper.py](dropship_app/trendyol_scraper.py) | Ürün çekme sistemi |

## Hazırsınız!

Artık Trendyol satıcılarını sisteme ekleyip ürünlerini otomatik çekebilirsiniz!

**Adım Adım:**
1. [OK] Trendyol'da satıcı bulun
2. [OK] Satıcı ID'sini kopyalayın
3. [OK] API'ye POST isteği gönderin
4. [OK] Ürün çekme işlemini bekleyin
5. [OK] Ürünleri Shopify'a aktarın
---

<div align="center">
  <img src="assets/logo-horizontal.svg" alt="DropFlow" width="250"/>
  
  **DropFlow - Otomatik Dropshipping Platformu**
</div>
