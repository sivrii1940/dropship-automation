"""
Canlı Stok Senkronizasyon Modülü
Trendyol'dan stok bilgilerini çeker ve Shopify'ı günceller
"""
import threading
import time
import logging
from datetime import datetime, timedelta
from typing import Callable, Optional

from trendyol_scraper import get_scraper
from shopify_api import get_shopify_api
from models import Product, ActivityLog, Settings

logger = logging.getLogger(__name__)


class StockSyncManager:
    """
    Otomatik stok senkronizasyon yöneticisi
    Arka planda çalışarak stoğu güncel tutar
    """
    
    def __init__(self, sync_interval_minutes: int = 30):
        """
        Args:
            sync_interval_minutes: Senkronizasyon aralığı (dakika)
        """
        self.sync_interval = sync_interval_minutes * 60  # saniyeye çevir
        self.is_running = False
        self.sync_thread = None
        self.scraper = get_scraper()
        self.last_sync_time = None
        self.sync_stats = {
            'total_checked': 0,
            'out_of_stock': 0,
            'price_changes': 0,
            'errors': 0
        }
        self._progress_callback = None
        self._status_callback = None
    
    def set_progress_callback(self, callback: Callable):
        """İlerleme callback'i ayarla"""
        self._progress_callback = callback
    
    def set_status_callback(self, callback: Callable):
        """Durum callback'i ayarla"""
        self._status_callback = callback
    
    def _update_status(self, message: str):
        """Durum mesajını güncelle"""
        if self._status_callback:
            self._status_callback(message)
        logger.info(message)
    
    def sync_all_products(self, progress_callback: Optional[Callable] = None) -> dict:
        """
        Tüm senkronize edilmiş ürünlerin stokunu kontrol et
        
        Args:
            progress_callback: İlerleme callback (current, total, product_name)
        
        Returns:
            dict: Senkronizasyon sonuçları
        """
        self._update_status("Stok senkronizasyonu başlatılıyor...")
        
        # Shopify'a senkronize edilmiş ürünleri al
        synced_products = Product.get_synced_products()
        
        if not synced_products:
            self._update_status("Senkronize edilmiş ürün bulunamadı")
            return {'success': False, 'message': 'Senkronize ürün yok'}
        
        total = len(synced_products)
        self._update_status(f"{total} ürün kontrol edilecek")
        
        results = {
            'total_checked': 0,
            'in_stock': 0,
            'out_of_stock': 0,
            'price_changes': 0,
            'shopify_updated': 0,
            'errors': 0,
            'details': []
        }
        
        shopify_api = None
        try:
            shopify_api = get_shopify_api()
        except Exception as e:
            logger.warning(f"Shopify API bağlantısı kurulamadı: {e}")
        
        for idx, product in enumerate(synced_products, 1):
            try:
                trendyol_id = product.get('trendyol_id')
                shopify_id = product.get('shopify_id')
                product_name = product.get('name', 'Bilinmeyen')
                old_price = product.get('trendyol_price', 0)
                
                if progress_callback:
                    progress_callback(idx, total, product_name)
                
                # Trendyol'dan canlı stok bilgisi al
                stock_info = self.scraper.check_product_stock(trendyol_id)
                
                in_stock = stock_info.get('in_stock', False)
                new_price = stock_info.get('price', 0)
                
                # Veritabanını güncelle
                Product.update_stock_status(product['id'], in_stock, new_price)
                
                results['total_checked'] += 1
                
                if in_stock:
                    results['in_stock'] += 1
                else:
                    results['out_of_stock'] += 1
                    
                    # Shopify'da ürünü gizle (ayar aktifse)
                    hide_out_of_stock = Settings.get('hide_out_of_stock', True)
                    if shopify_api and shopify_id and hide_out_of_stock:
                        try:
                            shopify_api.set_product_status(shopify_id, active=False)
                            results['shopify_updated'] += 1
                            results['details'].append({
                                'product': product_name,
                                'action': 'Stokta yok - Shopify\'da gizlendi'
                            })
                        except Exception as e:
                            logger.error(f"Shopify güncelleme hatası: {e}")
                
                # Fiyat değişikliği kontrolü
                auto_price_update = Settings.get('auto_price_update', True)
                if new_price > 0 and abs(new_price - old_price) > 0.01:
                    results['price_changes'] += 1
                    
                    # Yeni Shopify fiyatını hesapla ve güncelle (ayar aktifse)
                    if shopify_api and shopify_id and in_stock and auto_price_update:
                        try:
                            # Kar marjını al
                            profit_margin = product.get('profit_margin') or Settings.get('profit_margin', 50)
                            
                            # Yeni fiyatı hesapla (kar marjı + USD dönüşümü)
                            new_shopify_price = self.scraper.calculate_shopify_price(
                                new_price, 
                                profit_margin=profit_margin,
                                to_usd=True
                            )
                            
                            old_shopify_price = product.get('shopify_price', 0)
                            
                            # Shopify'da fiyatı güncelle
                            shopify_api.update_product_inventory_and_price(
                                shopify_id, 
                                price=new_shopify_price
                            )
                            
                            # Veritabanında Shopify fiyatını güncelle
                            Product.update_shopify_price(product['id'], new_shopify_price)
                            
                            results['shopify_updated'] += 1
                            results['details'].append({
                                'product': product_name,
                                'action': f'Fiyat güncellendi: {old_price}₺→{new_price}₺ (Shopify: ${old_shopify_price:.2f}→${new_shopify_price:.2f})'
                            })
                            logger.info(f"Fiyat güncellendi: {product_name} - Shopify: ${new_shopify_price:.2f}")
                        except Exception as e:
                            logger.error(f"Shopify fiyat güncelleme hatası: {e}")
                            results['details'].append({
                                'product': product_name,
                                'action': f'Fiyat değişti: {old_price}₺ → {new_price}₺ (Shopify güncellenemedi)'
                            })
                    else:
                        results['details'].append({
                            'product': product_name,
                            'action': f'Fiyat değişti: {old_price}₺ → {new_price}₺'
                        })
                
                # Rate limiting
                time.sleep(0.2)
                
            except Exception as e:
                results['errors'] += 1
                logger.error(f"Ürün senkronizasyon hatası: {e}")
        
        self.last_sync_time = datetime.now()
        self.sync_stats = results
        
        # Log kaydet
        ActivityLog.create(
            action='stock_sync',
            details=f"Kontrol: {results['total_checked']}, Stokta yok: {results['out_of_stock']}, Fiyat değişimi: {results['price_changes']}",
            status='success' if results['errors'] == 0 else 'warning'
        )
        
        self._update_status(f"Senkronizasyon tamamlandı: {results['total_checked']} ürün kontrol edildi")
        
        return results
    
    def check_single_product(self, trendyol_id: int) -> dict:
        """
        Tek bir ürünün stokunu kontrol et
        
        Args:
            trendyol_id: Trendyol ürün ID
        
        Returns:
            dict: Stok bilgisi
        """
        return self.scraper.check_product_stock(trendyol_id)
    
    def verify_stock_before_order(self, trendyol_id: int, variant: str = None) -> tuple:
        """
        Sipariş öncesi stok doğrulama
        
        Args:
            trendyol_id: Trendyol ürün ID
            variant: Varyant değeri (opsiyonel)
        
        Returns:
            tuple: (stokta_var_mı, mesaj, güncel_fiyat)
        """
        return self.scraper.check_stock_before_purchase(trendyol_id, variant)
    
    def start_auto_sync(self):
        """Otomatik senkronizasyonu başlat"""
        if self.is_running:
            logger.warning("Otomatik senkronizasyon zaten çalışıyor")
            return
        
        self.is_running = True
        self.sync_thread = threading.Thread(target=self._auto_sync_loop, daemon=True)
        self.sync_thread.start()
        logger.info(f"Otomatik stok senkronizasyonu başlatıldı (aralık: {self.sync_interval // 60} dakika)")
    
    def stop_auto_sync(self):
        """Otomatik senkronizasyonu durdur"""
        self.is_running = False
        logger.info("Otomatik stok senkronizasyonu durduruldu")
    
    def _auto_sync_loop(self):
        """Otomatik senkronizasyon döngüsü"""
        while self.is_running:
            try:
                self.sync_all_products()
            except Exception as e:
                logger.error(f"Otomatik senkronizasyon hatası: {e}")
            
            # Bir sonraki senkronizasyona kadar bekle
            for _ in range(self.sync_interval):
                if not self.is_running:
                    break
                time.sleep(1)
    
    def get_sync_status(self) -> dict:
        """Senkronizasyon durumunu al"""
        return {
            'is_running': self.is_running,
            'last_sync': self.last_sync_time.isoformat() if self.last_sync_time else None,
            'sync_interval_minutes': self.sync_interval // 60,
            'stats': self.sync_stats
        }
    
    def set_sync_interval(self, minutes: int):
        """Senkronizasyon aralığını değiştir"""
        self.sync_interval = minutes * 60
        Settings.set('stock_sync_interval', str(minutes))
        logger.info(f"Stok senkronizasyon aralığı {minutes} dakika olarak ayarlandı")


# Singleton instance
_sync_manager = None

def get_stock_sync_manager() -> StockSyncManager:
    """Stock sync manager instance al (singleton)"""
    global _sync_manager
    if _sync_manager is None:
        # Ayarlardan aralığı al
        interval = Settings.get('stock_sync_interval', '30')
        _sync_manager = StockSyncManager(sync_interval_minutes=int(interval))
    return _sync_manager


if __name__ == '__main__':
    # Test
    logging.basicConfig(level=logging.INFO)
    
    manager = get_stock_sync_manager()
    
    # Manuel senkronizasyon testi
    def progress(current, total, name):
        print(f"[{current}/{total}] {name}")
    
    results = manager.sync_all_products(progress_callback=progress)
    print(f"\nSonuçlar: {results}")
