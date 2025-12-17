"""
Dropship Otomasyon Sistemi - Konfigürasyon Dosyası
"""
import os
from datetime import timedelta

# Uygulama Ayarları
APP_NAME = "Dropship Otomasyon"
APP_VERSION = "1.0.0"
SECRET_KEY = os.environ.get('SECRET_KEY', 'gizli-anahtar-degistirin-123!')

# Veritabanı
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'database', 'dropship.db')

# Shopify API Ayarları
SHOPIFY_CONFIG = {
    'shop_name': os.environ.get('SHOPIFY_SHOP_NAME', ''),  # ornek: myshop.myshopify.com
    'api_key': os.environ.get('SHOPIFY_API_KEY', ''),
    'api_secret': os.environ.get('SHOPIFY_API_SECRET', ''),
    'access_token': os.environ.get('SHOPIFY_ACCESS_TOKEN', ''),
    'api_version': '2024-01'
}

# Shopify Webhook Secret
SHOPIFY_WEBHOOK_SECRET = os.environ.get('SHOPIFY_WEBHOOK_SECRET', '')

# Trendyol Ayarları
TRENDYOL_CONFIG = {
    'default_seller_id': None,
    'scrape_delay': 0.5,  # saniye - istekler arası bekleme
    'max_workers': 10,    # paralel istek sayısı
}

# Fiyatlandırma Ayarları (Varsayılan)
PRICING_CONFIG = {
    'profit_margin': 50,          # % kar marjı
    'currency_buffer': 5,         # % kur tamponu
    'min_profit_amount': 10,      # minimum TL kar
    'round_to': 0.99,             # fiyat yuvarla (ör: 149.99)
}

# Sipariş Otomasyon Ayarları
ORDER_AUTOMATION = {
    'enabled': False,
    'check_interval': 300,        # saniye - sipariş kontrol aralığı
    'auto_purchase': False,       # otomatik satın alma (dikkatli!)
}

# Masaüstü Uygulama Ayarları
APP_CONFIG = {
    'theme': 'dark',              # dark veya light
    'window_width': 1400,
    'window_height': 800,
    'min_width': 1200,
    'min_height': 700,
}

# Loglama
LOG_CONFIG = {
    'file': os.path.join(os.path.dirname(__file__), 'logs', 'app.log'),
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
}
