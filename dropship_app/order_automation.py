"""
Sipariş Otomasyon Modülü
Shopify siparişlerini otomatik olarak Trendyol'dan satın alır
"""
import time
import logging
import threading
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

from models import Order, Product, Settings, ActivityLog
from shopify_api import get_shopify_api
from config import ORDER_AUTOMATION

logger = logging.getLogger(__name__)


class TrendyolAutoPurchaser:
    """
    Trendyol otomatik satın alma sınıfı
    Selenium ile Trendyol'dan sipariş verir
    """
    
    def __init__(self, headless=True):
        self.headless = headless
        self.driver = None
        self.logged_in = False
        self.wait = None
        
    def _init_driver(self):
        """Chrome driver'ı başlat"""
        try:
            options = Options()
            if self.headless:
                options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            options.add_experimental_option('excludeSwitches', ['enable-automation'])
            
            self.driver = webdriver.Chrome(options=options)
            self.wait = WebDriverWait(self.driver, 10)
            logger.info("Chrome driver başlatıldı")
            return True
        except Exception as e:
            logger.error(f"Driver başlatma hatası: {e}")
            return False
    
    def _close_driver(self):
        """Driver'ı kapat"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
            self.driver = None
            self.logged_in = False
    
    def login(self, email, password):
        """
        Trendyol hesabına giriş yap
        
        Args:
            email: Trendyol email
            password: Trendyol şifre
        
        Returns:
            bool: Başarılı mı
        """
        if not self.driver:
            if not self._init_driver():
                return False
        
        try:
            # Login sayfasına git
            self.driver.get("https://www.trendyol.com/giris")
            time.sleep(2)
            
            # Cookie popup'ını kapat
            try:
                cookie_btn = self.wait.until(
                    EC.element_to_be_clickable((By.ID, "onetrust-accept-btn-handler"))
                )
                cookie_btn.click()
                time.sleep(1)
            except:
                pass
            
            # Email gir
            email_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "login-email"))
            )
            email_input.clear()
            email_input.send_keys(email)
            
            # Şifre gir
            password_input = self.driver.find_element(By.ID, "login-password-input")
            password_input.clear()
            password_input.send_keys(password)
            
            # Giriş yap
            login_btn = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_btn.click()
            
            time.sleep(3)
            
            # Giriş kontrolü
            if "hesabim" in self.driver.current_url or "giris" not in self.driver.current_url:
                self.logged_in = True
                logger.info("Trendyol'a başarıyla giriş yapıldı")
                return True
            else:
                logger.warning("Trendyol girişi başarısız")
                return False
                
        except Exception as e:
            logger.error(f"Login hatası: {e}")
            return False
    
    def add_to_cart(self, product_url, variant_value=None, quantity=1):
        """
        Ürünü sepete ekle
        
        Args:
            product_url: Trendyol ürün URL'i
            variant_value: Varyant değeri (renk, beden vb.)
            quantity: Adet
        
        Returns:
            bool: Başarılı mı
        """
        if not self.logged_in:
            logger.warning("Önce giriş yapmalısınız")
            return False
        
        try:
            # Ürün sayfasına git
            self.driver.get(product_url)
            time.sleep(2)
            
            # Varyant seç (eğer belirtilmişse)
            if variant_value:
                try:
                    # Beden/renk seçimi
                    variant_btn = self.wait.until(
                        EC.element_to_be_clickable(
                            (By.XPATH, f"//div[contains(@class, 'variants')]//span[contains(text(), '{variant_value}')]")
                        )
                    )
                    variant_btn.click()
                    time.sleep(1)
                except:
                    logger.warning(f"Varyant bulunamadı: {variant_value}")
            
            # Sepete ekle butonuna tıkla
            add_btn = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button.add-to-basket"))
            )
            add_btn.click()
            
            time.sleep(2)
            
            # Başarı kontrolü
            try:
                success_msg = self.driver.find_element(By.CSS_SELECTOR, ".add-to-basket-success")
                if success_msg:
                    logger.info(f"Ürün sepete eklendi: {product_url}")
                    return True
            except:
                pass
            
            # Alternatif kontrol - sepet sayısı
            try:
                cart_count = self.driver.find_element(By.CSS_SELECTOR, ".basket-item-count")
                if cart_count and int(cart_count.text) > 0:
                    return True
            except:
                pass
            
            return False
            
        except Exception as e:
            logger.error(f"Sepete ekleme hatası: {e}")
            return False
    
    def checkout(self, shipping_address):
        """
        Satın alma işlemini tamamla
        
        Args:
            shipping_address: Müşteri adresi
                {
                    'name': 'Ad Soyad',
                    'phone': '05xxxxxxxxx',
                    'address1': 'Adres satırı 1',
                    'address2': 'Adres satırı 2',
                    'city': 'İl',
                    'province': 'İlçe',
                    'zip': 'Posta kodu'
                }
        
        Returns:
            dict: Sipariş bilgileri veya None
        """
        if not self.logged_in:
            logger.warning("Önce giriş yapmalısınız")
            return None
        
        try:
            # Sepete git
            self.driver.get("https://www.trendyol.com/sepet")
            time.sleep(2)
            
            # Sepeti onayla
            checkout_btn = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, ".checkout-button, .go-to-payment"))
            )
            checkout_btn.click()
            time.sleep(2)
            
            # Yeni adres ekle veya mevcut adresi güncelle
            # NOT: Bu kısım Trendyol'un arayüzüne göre ayarlanmalı
            try:
                # Adres ekleme butonu
                add_address_btn = self.driver.find_element(By.CSS_SELECTOR, ".add-address-btn")
                add_address_btn.click()
                time.sleep(1)
                
                # Adres bilgilerini doldur
                self._fill_address_form(shipping_address)
                
            except:
                # Mevcut adres varsa devam et
                pass
            
            # Ödeme sayfasına devam et
            continue_btn = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, ".address-continue-btn, .continue-payment"))
            )
            continue_btn.click()
            time.sleep(2)
            
            # ÖNEMLİ: Burada ödeme işlemi yapılmaz!
            # Kullanıcının manuel onayı gerekir
            
            logger.warning("Checkout noktasına ulaşıldı. Manuel ödeme onayı gerekiyor.")
            
            return {
                'status': 'pending_payment',
                'message': 'Ödeme işlemi için manuel onay gerekiyor',
                'cart_url': self.driver.current_url
            }
            
        except Exception as e:
            logger.error(f"Checkout hatası: {e}")
            return None
    
    def _fill_address_form(self, address):
        """Adres formunu doldur"""
        try:
            # Ad Soyad
            name_input = self.driver.find_element(By.CSS_SELECTOR, "input[name='addressTitle'], input[name='name']")
            name_input.clear()
            name_input.send_keys(address.get('name', ''))
            
            # Telefon
            phone_input = self.driver.find_element(By.CSS_SELECTOR, "input[name='phone']")
            phone_input.clear()
            phone_input.send_keys(address.get('phone', ''))
            
            # İl seçimi
            city_select = self.driver.find_element(By.CSS_SELECTOR, "select[name='city']")
            city_select.send_keys(address.get('city', ''))
            time.sleep(0.5)
            
            # İlçe seçimi
            district_select = self.driver.find_element(By.CSS_SELECTOR, "select[name='district']")
            district_select.send_keys(address.get('province', ''))
            time.sleep(0.5)
            
            # Mahalle
            neighborhood_select = self.driver.find_element(By.CSS_SELECTOR, "select[name='neighborhood']")
            neighborhood_select.send_keys(Keys.DOWN)
            neighborhood_select.send_keys(Keys.ENTER)
            
            # Adres
            address_input = self.driver.find_element(By.CSS_SELECTOR, "textarea[name='address']")
            address_input.clear()
            full_address = f"{address.get('address1', '')} {address.get('address2', '')}"
            address_input.send_keys(full_address)
            
            # Kaydet
            save_btn = self.driver.find_element(By.CSS_SELECTOR, ".save-address-btn")
            save_btn.click()
            time.sleep(2)
            
        except Exception as e:
            logger.error(f"Adres formu hatası: {e}")
    
    def clear_cart(self):
        """Sepeti temizle"""
        try:
            self.driver.get("https://www.trendyol.com/sepet")
            time.sleep(2)
            
            # Tüm ürünleri sil
            while True:
                try:
                    delete_btn = self.driver.find_element(By.CSS_SELECTOR, ".delete-button, .remove-item")
                    delete_btn.click()
                    time.sleep(1)
                except:
                    break
            
            return True
        except Exception as e:
            logger.error(f"Sepet temizleme hatası: {e}")
            return False


class OrderAutomationService:
    """
    Sipariş otomasyon servisi
    Shopify siparişlerini kontrol eder ve Trendyol'dan satın alır
    """
    
    def __init__(self):
        self.shopify_api = get_shopify_api()
        self.purchaser = None
        self.running = False
        self.thread = None
        
        # Trendyol kimlik bilgileri
        self.trendyol_email = Settings.get('trendyol_email')
        self.trendyol_password = Settings.get('trendyol_password')
    
    def start(self):
        """Otomasyon servisini başlat"""
        if self.running:
            logger.warning("Servis zaten çalışıyor")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info("Sipariş otomasyon servisi başlatıldı")
    
    def stop(self):
        """Otomasyon servisini durdur"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        if self.purchaser:
            self.purchaser._close_driver()
        logger.info("Sipariş otomasyon servisi durduruldu")
    
    def _run_loop(self):
        """Ana döngü"""
        while self.running:
            try:
                self._check_new_orders()
            except Exception as e:
                logger.error(f"Sipariş kontrol hatası: {e}")
            
            # Bekleme süresi
            time.sleep(ORDER_AUTOMATION.get('check_interval', 300))
    
    def _check_new_orders(self):
        """Yeni siparişleri kontrol et"""
        try:
            # Son işlenen sipariş ID'sini al
            last_order_id = Settings.get('last_processed_order_id')
            
            # Yeni siparişleri al
            new_orders = self.shopify_api.get_new_orders(last_order_id)
            
            if not new_orders:
                logger.debug("Yeni sipariş yok")
                return
            
            logger.info(f"{len(new_orders)} yeni sipariş bulundu")
            
            for order_data in new_orders:
                # Siparişi veritabanına kaydet
                order_id = Order.create(order_data)
                
                ActivityLog.log(
                    'new_order',
                    f"Yeni sipariş: #{order_data.get('shopify_order_number')}",
                    'success'
                )
                
                # Otomatik satın alma aktifse işle
                if ORDER_AUTOMATION.get('auto_purchase'):
                    self._process_order(order_id)
            
            # Son sipariş ID'sini güncelle
            if new_orders:
                Settings.set('last_processed_order_id', new_orders[-1]['shopify_order_id'])
                
        except Exception as e:
            logger.error(f"Sipariş kontrol hatası: {e}")
    
    def _process_order(self, order_id):
        """Siparişi işle - Trendyol'dan satın al"""
        order = Order.get_by_id(order_id)
        if not order:
            return False
        
        try:
            # Durum güncelle
            Order.update_status(order_id, 'processing', 'Trendyol siparişi hazırlanıyor')
            
            # Purchaser'ı başlat
            if not self.purchaser:
                self.purchaser = TrendyolAutoPurchaser(headless=True)
            
            # Giriş yap
            if not self.purchaser.logged_in:
                if not self.purchaser.login(self.trendyol_email, self.trendyol_password):
                    Order.update_status(order_id, 'error', 'Trendyol girişi başarısız')
                    return False
            
            # Her ürünü sepete ekle
            for item in order.get('order_items', []):
                # Ürünü veritabanından bul
                product = Product.get_by_shopify_id(item.get('product_id'))
                
                if product and product.get('trendyol_url'):
                    success = self.purchaser.add_to_cart(
                        product['trendyol_url'],
                        variant_value=item.get('variant_title'),
                        quantity=item.get('quantity', 1)
                    )
                    
                    if not success:
                        logger.warning(f"Ürün sepete eklenemedi: {item.get('title')}")
            
            # Checkout işlemi
            result = self.purchaser.checkout(order.get('shipping_address', {}))
            
            if result:
                Order.update_status(
                    order_id, 
                    'pending_payment', 
                    f"Checkout hazır: {result.get('cart_url')}"
                )
                
                ActivityLog.log(
                    'order_processed',
                    f"Sipariş #{order.get('shopify_order_number')} Trendyol'a hazırlandı",
                    'success'
                )
                
                return True
            else:
                Order.update_status(order_id, 'error', 'Checkout başarısız')
                return False
                
        except Exception as e:
            logger.error(f"Sipariş işleme hatası: {e}")
            Order.update_status(order_id, 'error', str(e))
            return False
    
    def manual_process_order(self, order_id):
        """Manuel olarak siparişi işle"""
        return self._process_order(order_id)
    
    def get_status(self):
        """Servis durumunu al"""
        return {
            'running': self.running,
            'logged_in': self.purchaser.logged_in if self.purchaser else False,
            'last_check': Settings.get('last_order_check'),
            'pending_orders': len(Order.get_pending_orders())
        }


# Singleton instance
_service_instance = None

def get_order_service():
    """Sipariş servisi instance al"""
    global _service_instance
    if _service_instance is None:
        _service_instance = OrderAutomationService()
    return _service_instance


if __name__ == '__main__':
    # Test
    service = get_order_service()
    print(f"Servis durumu: {service.get_status()}")
