"""
Trendyol Scraper Modülü
Trendyol'dan ürün verilerini çeker ve veritabanına kaydeder
Canlı stok takibi ve fiyat güncelleme özelliği içerir
"""
import requests
import cloudscraper
import re
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional, Dict, List, Tuple

logger = logging.getLogger(__name__)

class TrendyolScraper:
    """Trendyol ürün scraper sınıfı"""
    
    def __init__(self):
        self.scraper = cloudscraper.create_scraper()
        self.base_api_url = "https://apigw.trendyol.com"
        self.currency_rate = None
        self._update_currency_rate()
    
    def _update_currency_rate(self):
        """Dolar kurunu güncelle"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            session = requests.Session()
            session.headers = headers
            
            try:
                response = session.get(
                    "https://www.google.com/search?q=usd-try"
                ).content
                soup = BeautifulSoup(response, "html.parser")
                rate = soup.find("span", {"class": "DFlfde SwHCTb"}).text.replace(",", ".")
            except:
                response = session.get(
                    "https://www.bloomberght.com/doviz/dolar"
                ).content
                soup = BeautifulSoup(response, "html.parser")
                rate = soup.find("span", {"class": "lastPrice"}).text.replace(",", ".")
            
            self.currency_rate = round(float(rate), 2)
            logger.info(f"Dolar kuru güncellendi: {self.currency_rate}")
        except Exception as e:
            logger.error(f"Dolar kuru alınamadı: {e}")
            self.currency_rate = 35.0  # Varsayılan kur
    
    def get_currency_rate(self):
        """Güncel dolar kurunu döndür"""
        if not self.currency_rate:
            self._update_currency_rate()
        return self.currency_rate
    
    def get_seller_product_count(self, seller_id):
        """Satıcının toplam ürün sayısını al"""
        try:
            params = {
                'mid': seller_id,
                'sellerId': seller_id,
                'pi': 1
            }
            response = self.scraper.get(
                f'{self.base_api_url}/discovery-web-searchgw-service/v2/api/infinite-scroll/sr',
                params=params
            )
            data = response.json()
            return data.get("result", {}).get("totalCount", 0)
        except Exception as e:
            logger.error(f"Ürün sayısı alınamadı: {e}")
            return 0
    
    def get_seller_products_page(self, seller_id, page):
        """Satıcının belirli bir sayfadaki ürünlerini al"""
        try:
            params = {
                'mid': seller_id,
                'sellerId': seller_id,
                'pi': page
            }
            response = self.scraper.get(
                f'{self.base_api_url}/discovery-web-searchgw-service/v2/api/infinite-scroll/sr',
                params=params
            )
            data = response.json()
            return data.get("result", {}).get("products", [])
        except Exception as e:
            logger.error(f"Sayfa {page} alınamadı: {e}")
            return []
    
    def get_product_details(self, product_url):
        """Ürün detaylarını al (varyantlar, görseller)"""
        try:
            # URL'den product ID'yi çıkar
            match = re.search(r'-p-(\d+)', product_url)
            if not match:
                return {"variants": [], "images": []}
            
            product_id = match.group(1)
            api_url = f'{self.base_api_url}/discovery-web-productgw-service/api/productDetail/{product_id}'
            
            response = self.scraper.get(api_url)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('isSuccess') and data.get('result'):
                    result = data['result']
                    return {
                        "variants": result.get("allVariants", []),
                        "images": result.get("images", []),
                        "description": result.get("description", ""),
                        "attributes": result.get("attributes", [])
                    }
            
            return {"variants": [], "images": []}
        except Exception as e:
            logger.error(f"Ürün detayı alınamadı: {e}")
            return {"variants": [], "images": []}
    
    def check_product_stock(self, product_id: int) -> Dict:
        """
        Tek bir ürünün canlı stok durumunu kontrol et
        
        Args:
            product_id: Trendyol ürün ID'si
        
        Returns:
            dict: {
                'in_stock': bool,
                'price': float,
                'original_price': float,
                'variants': list,
                'last_checked': datetime
            }
        """
        try:
            api_url = f'{self.base_api_url}/discovery-web-productgw-service/api/productDetail/{product_id}'
            response = self.scraper.get(api_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('isSuccess') and data.get('result'):
                    result = data['result']
                    
                    # Stok durumunu kontrol et
                    in_stock = result.get('hasStock', False)
                    
                    # Fiyat bilgilerini al
                    price_info = result.get('price', {})
                    selling_price = price_info.get('sellingPrice', 0)
                    original_price = price_info.get('originalPrice', selling_price)
                    
                    # Varyant stok durumları
                    variants_stock = []
                    for variant in result.get('allVariants', []):
                        variants_stock.append({
                            'attribute_value': variant.get('attributeValue', ''),
                            'in_stock': variant.get('inStock', False),
                            'price': variant.get('price', selling_price)
                        })
                    
                    return {
                        'in_stock': in_stock,
                        'price': selling_price,
                        'original_price': original_price,
                        'variants': variants_stock,
                        'last_checked': datetime.now().isoformat()
                    }
            
            logger.warning(f"Ürün {product_id} stok bilgisi alınamadı")
            return {'in_stock': False, 'price': 0, 'variants': [], 'last_checked': datetime.now().isoformat()}
            
        except Exception as e:
            logger.error(f"Stok kontrolü hatası (ürün {product_id}): {e}")
            return {'in_stock': False, 'price': 0, 'variants': [], 'last_checked': datetime.now().isoformat()}
    
    def check_multiple_products_stock(self, product_ids: List[int], progress_callback=None) -> Dict[int, Dict]:
        """
        Birden fazla ürünün canlı stok durumunu kontrol et
        
        Args:
            product_ids: Trendyol ürün ID listesi
            progress_callback: İlerleme callback (current, total)
        
        Returns:
            dict: {product_id: stock_info, ...}
        """
        results = {}
        total = len(product_ids)
        processed = 0
        
        # Paralel olarak stok kontrolü yap (rate limit için max 5 worker)
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_id = {
                executor.submit(self.check_product_stock, pid): pid
                for pid in product_ids
            }
            
            for future in as_completed(future_to_id):
                product_id = future_to_id[future]
                try:
                    results[product_id] = future.result()
                except Exception as e:
                    logger.error(f"Stok kontrolü hatası (ürün {product_id}): {e}")
                    results[product_id] = {'in_stock': False, 'price': 0, 'variants': []}
                
                processed += 1
                if progress_callback:
                    progress_callback(processed, total)
                
                # Rate limiting - çok hızlı istek atmamak için
                time.sleep(0.1)
        
        return results
    
    def check_stock_before_purchase(self, product_id: int, variant_value: str = None) -> Tuple[bool, str, float]:
        """
        Satın alma öncesi stok ve fiyat kontrolü
        
        Args:
            product_id: Trendyol ürün ID
            variant_value: Varyant değeri (opsiyonel, örn: "XL", "Kırmızı")
        
        Returns:
            Tuple[bool, str, float]: (stokta_var_mı, durum_mesajı, güncel_fiyat)
        """
        stock_info = self.check_product_stock(product_id)
        
        if not stock_info['in_stock']:
            return False, "Ürün stokta yok", 0
        
        # Eğer varyant belirtildiyse varyant stokunu kontrol et
        if variant_value and stock_info.get('variants'):
            for variant in stock_info['variants']:
                if variant['attribute_value'].lower() == variant_value.lower():
                    if variant['in_stock']:
                        return True, "Stokta mevcut", variant.get('price', stock_info['price'])
                    else:
                        return False, f"'{variant_value}' varyantı stokta yok", 0
            
            return False, f"'{variant_value}' varyantı bulunamadı", 0
        
        return True, "Stokta mevcut", stock_info['price']

    def scrape_seller_products(self, seller_id, progress_callback=None):
        """
        Satıcının tüm ürünlerini çek
        
        Args:
            seller_id: Trendyol satıcı ID
            progress_callback: İlerleme callback fonksiyonu (current, total)
        
        Returns:
            list: Ürün listesi
        """
        total_count = self.get_seller_product_count(seller_id)
        
        if total_count == 0:
            logger.warning(f"Satıcı {seller_id} için ürün bulunamadı")
            return []
        
        # Sayfa sayısını hesapla (24 ürün/sayfa)
        page_count = (total_count + 23) // 24
        
        all_products = []
        processed = 0
        
        # Paralel olarak sayfaları çek
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_page = {
                executor.submit(self.get_seller_products_page, seller_id, page): page
                for page in range(1, page_count + 1)
            }
            
            for future in as_completed(future_to_page):
                try:
                    products = future.result()
                    for product in products:
                        parsed = self._parse_product(product, seller_id)
                        if parsed:
                            all_products.append(parsed)
                    
                    processed += 1
                    if progress_callback:
                        progress_callback(processed, page_count)
                        
                except Exception as e:
                    logger.error(f"Sayfa işlenirken hata: {e}")
        
        logger.info(f"Toplam {len(all_products)} ürün çekildi")
        return all_products
    
    def _parse_product(self, raw_product, seller_id):
        """Ham ürün verisini parse et"""
        try:
            # Fiyat bilgilerini çıkar
            price_info = raw_product.get('price', {})
            selling_price = price_info.get('sellingPrice', 0)
            original_price = price_info.get('originalPrice', selling_price)
            
            # Rating bilgilerini çıkar
            rating_info = raw_product.get('ratingScore', {})
            rating_score = rating_info.get('averageRating', 0) if rating_info else 0
            rating_count = rating_info.get('totalCount', 0) if rating_info else 0
            
            # Marka bilgisi
            brand_info = raw_product.get('brand', {})
            brand_name = brand_info.get('name', '') if brand_info else ''
            
            # Görseller
            images = raw_product.get('images', [])
            image_urls = [f"https://cdn.dsmcdn.com/mnresize/1200/1800{img}" for img in images]
            
            # URL
            url_path = raw_product.get('url', '')
            full_url = f"https://www.trendyol.com{url_path}" if url_path else ''
            
            return {
                'trendyol_id': raw_product.get('id'),
                'seller_id': seller_id,
                'name': raw_product.get('name', ''),
                'brand_name': brand_name,
                'category_name': raw_product.get('categoryName', ''),
                'trendyol_url': full_url,
                'trendyol_price': selling_price,
                'trendyol_original_price': original_price,
                'images': image_urls,
                'variants': raw_product.get('variants', []),
                'rating_score': rating_score,
                'rating_count': rating_count
            }
        except Exception as e:
            logger.error(f"Ürün parse hatası: {e}")
            return None
    
    def calculate_shopify_price(self, trendyol_price, profit_margin=50, to_usd=True):
        """
        Shopify fiyatını hesapla
        
        Args:
            trendyol_price: Trendyol TL fiyatı
            profit_margin: Kar marjı (%)
            to_usd: USD'ye çevir
        
        Returns:
            float: Hesaplanan fiyat
        """
        # Kar marjı ekle
        price_with_margin = trendyol_price * (1 + profit_margin / 100)
        
        if to_usd and self.currency_rate:
            # USD'ye çevir
            price_usd = price_with_margin / self.currency_rate
            # Yuvarla (ör: 14.99)
            return round(price_usd * 100) / 100
        
        return round(price_with_margin, 2)


class TrendyolPurchaser:
    """
    Trendyol'dan otomatik satın alma sınıfı
    NOT: Bu sınıf Selenium veya benzeri bir tarayıcı otomasyonu gerektirir
    """
    
    def __init__(self, email=None, password=None):
        self.email = email
        self.password = password
        self.logged_in = False
        self.driver = None
    
    def login(self):
        """Trendyol hesabına giriş yap"""
        # Bu fonksiyon Selenium ile implement edilecek
        # Şimdilik placeholder
        logger.warning("Trendyol login henüz implement edilmedi")
        return False
    
    def add_to_cart(self, product_url, variant=None, quantity=1):
        """Ürünü sepete ekle"""
        # Selenium ile implement edilecek
        logger.warning("Sepete ekleme henüz implement edilmedi")
        return False
    
    def checkout(self, shipping_address):
        """
        Satın alma işlemini tamamla
        
        Args:
            shipping_address: dict - Müşteri adresi
                {
                    'name': 'Ad Soyad',
                    'phone': '05xx...',
                    'address': 'Adres satırı',
                    'city': 'Şehir',
                    'district': 'İlçe',
                    'postal_code': 'Posta kodu'
                }
        
        Returns:
            dict: Sipariş bilgileri veya None
        """
        # Selenium ile implement edilecek
        logger.warning("Checkout henüz implement edilmedi")
        return None
    
    def get_order_tracking(self, order_id):
        """Sipariş takip bilgisini al"""
        logger.warning("Takip bilgisi henüz implement edilmedi")
        return None


# Singleton scraper instance
_scraper_instance = None

def get_scraper():
    """Scraper instance al (singleton)"""
    global _scraper_instance
    if _scraper_instance is None:
        _scraper_instance = TrendyolScraper()
    return _scraper_instance


if __name__ == '__main__':
    # Test
    scraper = get_scraper()
    print(f"Dolar Kuru: {scraper.get_currency_rate()}")
    
    # Test satıcı ürün sayısı
    seller_id = 102
    count = scraper.get_seller_product_count(seller_id)
    print(f"Satıcı {seller_id} ürün sayısı: {count}")
