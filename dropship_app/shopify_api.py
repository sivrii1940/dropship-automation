"""
Shopify API Entegrasyon Modülü
Ürün yükleme, güncelleme ve sipariş yönetimi
"""
import requests
import json
import logging
from datetime import datetime
from config import SHOPIFY_CONFIG

logger = logging.getLogger(__name__)


class ShopifyAPI:
    """Shopify API istemcisi"""
    
    def __init__(self, shop_name=None, access_token=None):
        self.shop_name = shop_name or SHOPIFY_CONFIG['shop_name']
        self.access_token = access_token or SHOPIFY_CONFIG['access_token']
        self.api_version = SHOPIFY_CONFIG['api_version']
        self.base_url = f"https://{self.shop_name}/admin/api/{self.api_version}"
        
        self.headers = {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': self.access_token
        }
    
    def _request(self, method, endpoint, data=None):
        """API isteği gönder"""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, params=data)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=self.headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Desteklenmeyen HTTP metodu: {method}")
            
            response.raise_for_status()
            return response.json() if response.text else {}
            
        except requests.exceptions.HTTPError as e:
            logger.error(f"Shopify API hatası: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"API isteği hatası: {e}")
            raise
    
    def test_connection(self):
        """API bağlantısını test et"""
        try:
            result = self._request('GET', 'shop.json')
            return {'success': True, 'shop': result.get('shop', {})}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    # ============ ÜRÜN İŞLEMLERİ ============
    
    def create_product(self, product_data):
        """
        Yeni ürün oluştur
        
        Args:
            product_data: dict
                {
                    'title': 'Ürün Adı',
                    'body_html': 'Açıklama',
                    'vendor': 'Marka',
                    'product_type': 'Kategori',
                    'tags': ['tag1', 'tag2'],
                    'variants': [{
                        'price': '29.99',
                        'compare_at_price': '39.99',
                        'sku': 'SKU123',
                        'inventory_quantity': 100,
                        'option1': 'Renk',
                        'option2': 'Beden'
                    }],
                    'images': [{'src': 'https://...'}],
                    'options': [{'name': 'Renk'}, {'name': 'Beden'}]
                }
        
        Returns:
            dict: Oluşturulan ürün bilgisi
        """
        payload = {'product': product_data}
        result = self._request('POST', 'products.json', payload)
        return result.get('product')
    
    def update_product(self, product_id, product_data):
        """Ürün güncelle"""
        payload = {'product': product_data}
        result = self._request('PUT', f'products/{product_id}.json', payload)
        return result.get('product')
    
    def get_product(self, product_id):
        """Ürün bilgisi al"""
        result = self._request('GET', f'products/{product_id}.json')
        return result.get('product')
    
    def get_products(self, limit=50, page_info=None, status='active'):
        """Ürün listesi al"""
        params = {'limit': limit, 'status': status}
        if page_info:
            params['page_info'] = page_info
        
        result = self._request('GET', 'products.json', params)
        return result.get('products', [])
    
    def delete_product(self, product_id):
        """Ürün sil"""
        return self._request('DELETE', f'products/{product_id}.json')
    
    def update_variant_price(self, variant_id, price, compare_at_price=None):
        """Varyant fiyatını güncelle"""
        data = {'variant': {'id': variant_id, 'price': str(price)}}
        if compare_at_price:
            data['variant']['compare_at_price'] = str(compare_at_price)
        
        result = self._request('PUT', f'variants/{variant_id}.json', data)
        return result.get('variant')
    
    def update_inventory(self, inventory_item_id, location_id, quantity):
        """Stok güncelle"""
        data = {
            'location_id': location_id,
            'inventory_item_id': inventory_item_id,
            'available': quantity
        }
        return self._request('POST', 'inventory_levels/set.json', data)
    
    def get_locations(self):
        """Mağaza lokasyonlarını al"""
        try:
            result = self._request('GET', 'locations.json')
            return result.get('locations', [])
        except Exception as e:
            logger.error(f"Lokasyonlar alınamadı: {e}")
            return []
    
    def set_product_status(self, product_id, active=True):
        """
        Ürün durumunu güncelle (aktif/pasif)
        
        Args:
            product_id: Shopify ürün ID
            active: True = aktif, False = taslak (gizli)
        """
        try:
            data = {
                'product': {
                    'id': product_id,
                    'status': 'active' if active else 'draft'
                }
            }
            result = self._request('PUT', f'products/{product_id}.json', data)
            logger.info(f"Ürün {product_id} durumu güncellendi: {'aktif' if active else 'taslak'}")
            return result.get('product')
        except Exception as e:
            logger.error(f"Ürün durumu güncellenemedi: {e}")
            return None
    
    def update_product_inventory_and_price(self, product_id, quantity=None, price=None):
        """
        Ürünün stok ve fiyatını güncelle
        
        Args:
            product_id: Shopify ürün ID
            quantity: Stok miktarı (None ise güncellenmez)
            price: Fiyat (None ise güncellenmez)
        """
        try:
            product = self.get_product(product_id)
            if not product:
                return None
            
            updates = []
            
            for variant in product.get('variants', []):
                variant_id = variant.get('id')
                
                # Fiyat güncelle
                if price is not None:
                    self.update_variant_price(variant_id, price)
                    updates.append(f"Fiyat: {price}")
                
                # Stok güncelle
                if quantity is not None:
                    inventory_item_id = variant.get('inventory_item_id')
                    if inventory_item_id:
                        locations = self.get_locations()
                        if locations:
                            location_id = locations[0]['id']
                            self.update_inventory(inventory_item_id, location_id, quantity)
                            updates.append(f"Stok: {quantity}")
            
            logger.info(f"Ürün {product_id} güncellendi: {', '.join(updates)}")
            return True
            
        except Exception as e:
            logger.error(f"Ürün güncelleme hatası: {e}")
            return None
    
    def bulk_update_product_status(self, updates):
        """
        Toplu ürün durum güncellemesi
        
        Args:
            updates: [(product_id, active), ...] listesi
        """
        results = {'success': 0, 'failed': 0}
        
        for product_id, active in updates:
            try:
                self.set_product_status(product_id, active)
                results['success'] += 1
            except Exception as e:
                logger.error(f"Ürün {product_id} güncellenemedi: {e}")
                results['failed'] += 1
        
        return results

    # ============ SİPARİŞ İŞLEMLERİ ============
    
    def get_orders(self, status='any', limit=50, since_id=None):
        """
        Sipariş listesi al
        
        Args:
            status: 'any', 'open', 'closed', 'cancelled'
            limit: Maksimum sipariş sayısı
            since_id: Bu ID'den sonraki siparişler
        
        Returns:
            list: Sipariş listesi
        """
        params = {
            'status': status,
            'limit': limit,
            'fulfillment_status': 'unfulfilled'  # Tamamlanmamış siparişler
        }
        if since_id:
            params['since_id'] = since_id
        
        result = self._request('GET', 'orders.json', params)
        return result.get('orders', [])
    
    def get_order(self, order_id):
        """Sipariş detayı al"""
        result = self._request('GET', f'orders/{order_id}.json')
        return result.get('order')
    
    def get_new_orders(self, last_order_id=None):
        """Yeni (işlenmemiş) siparişleri al"""
        orders = self.get_orders(status='open', since_id=last_order_id)
        
        parsed_orders = []
        for order in orders:
            parsed = self._parse_order(order)
            if parsed:
                parsed_orders.append(parsed)
        
        return parsed_orders
    
    def _parse_order(self, raw_order):
        """Shopify siparişini parse et"""
        try:
            # Müşteri bilgileri
            customer = raw_order.get('customer', {})
            shipping_address = raw_order.get('shipping_address', {})
            
            # Ürün bilgileri
            items = []
            for item in raw_order.get('line_items', []):
                items.append({
                    'product_id': item.get('product_id'),
                    'variant_id': item.get('variant_id'),
                    'title': item.get('title'),
                    'variant_title': item.get('variant_title'),
                    'quantity': item.get('quantity'),
                    'price': item.get('price'),
                    'sku': item.get('sku')
                })
            
            return {
                'shopify_order_id': str(raw_order.get('id')),
                'shopify_order_number': raw_order.get('order_number'),
                'customer_name': f"{shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}".strip(),
                'customer_email': raw_order.get('email'),
                'customer_phone': shipping_address.get('phone'),
                'shipping_address': {
                    'name': f"{shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}".strip(),
                    'address1': shipping_address.get('address1', ''),
                    'address2': shipping_address.get('address2', ''),
                    'city': shipping_address.get('city', ''),
                    'province': shipping_address.get('province', ''),
                    'country': shipping_address.get('country', ''),
                    'zip': shipping_address.get('zip', ''),
                    'phone': shipping_address.get('phone', '')
                },
                'order_items': items,
                'total_price': float(raw_order.get('total_price', 0)),
                'subtotal_price': float(raw_order.get('subtotal_price', 0)),
                'shipping_price': float(raw_order.get('total_shipping_price_set', {}).get('shop_money', {}).get('amount', 0)),
                'status': 'pending',
                'created_at': raw_order.get('created_at')
            }
        except Exception as e:
            logger.error(f"Sipariş parse hatası: {e}")
            return None
    
    def fulfill_order(self, order_id, tracking_number=None, tracking_company=None):
        """
        Siparişi tamamlandı olarak işaretle
        
        Args:
            order_id: Shopify sipariş ID
            tracking_number: Kargo takip numarası
            tracking_company: Kargo şirketi
        """
        # Önce fulfillment order ID'yi al
        fulfillment_orders = self._request('GET', f'orders/{order_id}/fulfillment_orders.json')
        
        if not fulfillment_orders.get('fulfillment_orders'):
            logger.warning(f"Sipariş {order_id} için fulfillment order bulunamadı")
            return None
        
        fulfillment_order_id = fulfillment_orders['fulfillment_orders'][0]['id']
        line_items = fulfillment_orders['fulfillment_orders'][0].get('line_items', [])
        
        # Fulfillment oluştur
        fulfillment_data = {
            'fulfillment': {
                'line_items_by_fulfillment_order': [{
                    'fulfillment_order_id': fulfillment_order_id,
                    'fulfillment_order_line_items': [
                        {'id': item['id'], 'quantity': item['quantity']}
                        for item in line_items
                    ]
                }],
                'notify_customer': True
            }
        }
        
        if tracking_number:
            fulfillment_data['fulfillment']['tracking_info'] = {
                'number': tracking_number,
                'company': tracking_company or 'Other'
            }
        
        result = self._request('POST', 'fulfillments.json', fulfillment_data)
        return result.get('fulfillment')
    
    # ============ WEBHOOK İŞLEMLERİ ============
    
    def create_webhook(self, topic, address):
        """
        Webhook oluştur
        
        Args:
            topic: 'orders/create', 'orders/updated', 'products/update' vb.
            address: Webhook URL'i
        """
        data = {
            'webhook': {
                'topic': topic,
                'address': address,
                'format': 'json'
            }
        }
        result = self._request('POST', 'webhooks.json', data)
        return result.get('webhook')
    
    def get_webhooks(self):
        """Mevcut webhook'ları listele"""
        result = self._request('GET', 'webhooks.json')
        return result.get('webhooks', [])
    
    def delete_webhook(self, webhook_id):
        """Webhook sil"""
        return self._request('DELETE', f'webhooks/{webhook_id}.json')
    
    # ============ LOKASYON İŞLEMLERİ ============
    
    def get_locations(self):
        """Mağaza lokasyonlarını al"""
        result = self._request('GET', 'locations.json')
        return result.get('locations', [])


class ProductUploader:
    """Ürün yükleme yardımcı sınıfı"""
    
    def __init__(self, shopify_api=None):
        self.api = shopify_api or ShopifyAPI()
    
    def upload_product(self, product_data, profit_margin=50, currency_rate=35):
        """
        Veritabanındaki ürünü Shopify'a yükle
        
        Args:
            product_data: Veritabanından gelen ürün dict'i
            profit_margin: Kar marjı (%)
            currency_rate: Dolar kuru
        
        Returns:
            dict: Shopify ürün bilgisi veya None
        """
        try:
            # Fiyat hesapla
            trendyol_price = product_data.get('trendyol_price', 0)
            price_with_margin = trendyol_price * (1 + profit_margin / 100)
            shopify_price = round(price_with_margin / currency_rate, 2)
            
            compare_price = None
            if product_data.get('trendyol_original_price'):
                orig_with_margin = product_data['trendyol_original_price'] * (1 + profit_margin / 100)
                compare_price = round(orig_with_margin / currency_rate, 2)
            
            # Görseller
            images = []
            for img_url in product_data.get('images', [])[:10]:  # Max 10 görsel
                images.append({'src': img_url})
            
            # Shopify ürün verisi
            shopify_product = {
                'title': product_data.get('name', ''),
                'body_html': product_data.get('description', product_data.get('name', '')),
                'vendor': product_data.get('brand_name', 'Store'),
                'product_type': product_data.get('category_name', ''),
                'tags': [product_data.get('category_name', ''), 'Trendyol'],
                'status': 'active',
                'variants': [{
                    'price': str(shopify_price),
                    'compare_at_price': str(compare_price) if compare_price else None,
                    'inventory_management': 'shopify',
                    'inventory_quantity': 100,
                    'requires_shipping': True
                }],
                'images': images
            }
            
            # Varyantlar varsa ekle
            variants = product_data.get('variants', [])
            if variants and len(variants) > 1:
                shopify_product['options'] = [{'name': 'Seçenek'}]
                shopify_product['variants'] = []
                
                for var in variants:
                    var_price = var.get('price', trendyol_price)
                    if isinstance(var_price, dict):
                        var_price = var_price.get('sellingPrice', trendyol_price)
                    
                    var_price_usd = round(float(var_price) * (1 + profit_margin / 100) / currency_rate, 2)
                    
                    shopify_product['variants'].append({
                        'option1': var.get('value', var.get('attributeValue', 'Standart')),
                        'price': str(var_price_usd),
                        'inventory_management': 'shopify',
                        'inventory_quantity': 50,
                        'requires_shipping': True
                    })
            
            # Ürünü oluştur
            result = self.api.create_product(shopify_product)
            
            if result:
                logger.info(f"Ürün yüklendi: {result.get('id')} - {result.get('title')}")
                return {
                    'shopify_id': str(result.get('id')),
                    'shopify_price': shopify_price,
                    'handle': result.get('handle'),
                    'status': result.get('status')
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Ürün yükleme hatası: {e}")
            return None
    
    def bulk_upload(self, products, profit_margin=50, currency_rate=35, progress_callback=None):
        """
        Birden fazla ürünü Shopify'a yükle
        
        Args:
            products: Ürün listesi
            profit_margin: Kar marjı (%)
            currency_rate: Dolar kuru
            progress_callback: İlerleme callback'i (current, total, product_name)
        
        Returns:
            dict: Sonuç istatistikleri
        """
        success = 0
        failed = 0
        results = []
        
        for i, product in enumerate(products):
            try:
                result = self.upload_product(product, profit_margin, currency_rate)
                if result:
                    success += 1
                    results.append({
                        'product_id': product.get('id'),
                        'shopify_id': result['shopify_id'],
                        'status': 'success'
                    })
                else:
                    failed += 1
                    results.append({
                        'product_id': product.get('id'),
                        'status': 'failed',
                        'error': 'API hatası'
                    })
                
                if progress_callback:
                    progress_callback(i + 1, len(products), product.get('name', ''))
                    
            except Exception as e:
                failed += 1
                results.append({
                    'product_id': product.get('id'),
                    'status': 'failed',
                    'error': str(e)
                })
        
        return {
            'total': len(products),
            'success': success,
            'failed': failed,
            'results': results
        }


# Singleton instance
_api_instance = None

def get_shopify_api():
    """Shopify API instance al (singleton)"""
    global _api_instance
    if _api_instance is None:
        _api_instance = ShopifyAPI()
    return _api_instance


if __name__ == '__main__':
    # Test
    api = get_shopify_api()
    result = api.test_connection()
    print(f"Bağlantı testi: {result}")
