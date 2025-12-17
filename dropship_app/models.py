"""
Dropship Otomasyon Sistemi - Veritabanı Modelleri
"""
import sqlite3
import os
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from config import DATABASE_PATH

def get_db_connection():
    """Veritabanı bağlantısı al"""
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Veritabanı tablolarını oluştur"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Kullanıcılar Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # Oturumlar Tablosu (Token yönetimi)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Satıcılar Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sellers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            trendyol_seller_id INTEGER NOT NULL,
            name TEXT,
            url TEXT,
            note TEXT,
            is_active BOOLEAN DEFAULT 1,
            last_sync TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, trendyol_seller_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Ürünler Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            trendyol_id INTEGER,
            shopify_id TEXT,
            seller_id INTEGER,
            name TEXT NOT NULL,
            brand_name TEXT,
            category_name TEXT,
            trendyol_url TEXT,
            
            -- Fiyatlar
            trendyol_price REAL,           -- Trendyol satış fiyatı (TL)
            trendyol_original_price REAL,  -- Trendyol orijinal fiyatı (TL)
            shopify_price REAL,            -- Shopify satış fiyatı
            profit_margin REAL,            -- Kar marjı %
            
            -- Durum
            is_synced_to_shopify BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            stock_status TEXT DEFAULT 'in_stock',
            
            -- Görseller (JSON)
            images TEXT,
            
            -- Varyantlar (JSON)
            variants TEXT,
            
            -- Meta
            rating_score REAL,
            rating_count INTEGER,
            last_sync TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(user_id, trendyol_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (seller_id) REFERENCES sellers(id)
        )
    ''')
    
    # Siparişler Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            shopify_order_id TEXT NOT NULL,
            shopify_order_number TEXT,
            
            -- Müşteri Bilgileri
            customer_name TEXT,
            customer_email TEXT,
            customer_phone TEXT,
            
            -- Adres Bilgileri
            shipping_address TEXT,          -- JSON
            
            -- Ürün Bilgileri
            order_items TEXT,               -- JSON (ürün listesi)
            
            -- Fiyatlar
            total_price REAL,
            subtotal_price REAL,
            shipping_price REAL,
            
            -- Trendyol Sipariş Durumu
            trendyol_order_placed BOOLEAN DEFAULT 0,
            trendyol_order_id TEXT,
            trendyol_tracking_number TEXT,
            
            -- Durum
            status TEXT DEFAULT 'pending',  -- pending, processing, purchased, shipped, delivered, cancelled
            notes TEXT,
            
            -- Meta
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(user_id, shopify_order_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Webhook Logları Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS webhook_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,            -- orders/create, orders/updated, etc.
            shop_domain TEXT NOT NULL,      -- myshop.myshopify.com
            payload TEXT NOT NULL,          -- JSON payload
            status TEXT DEFAULT 'received', -- received, processed, failed
            response TEXT,                  -- JSON response
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Ayarlar Tablosu (kullanıcı bazlı)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Shopify Mağazaları Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS shopify_stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            shop_name TEXT NOT NULL,
            access_token TEXT NOT NULL,
            store_name TEXT,
            is_active BOOLEAN DEFAULT 1,
            is_default BOOLEAN DEFAULT 0,
            last_sync TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, shop_name),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Kargo Takip Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS shipments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            order_id INTEGER,
            tracking_number TEXT NOT NULL,
            carrier TEXT NOT NULL,
            carrier_name TEXT,
            status TEXT DEFAULT 'pending',
            last_status_update TEXT,
            estimated_delivery TEXT,
            delivery_date TIMESTAMP,
            tracking_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (order_id) REFERENCES orders(id)
        )
    ''')
    
    # Fiyat Geçmişi Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER,
            trendyol_price REAL,
            shopify_price REAL,
            currency_rate REAL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    ''')
    
    # Aktivite Logları
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            status TEXT DEFAULT 'success',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Veritabanı başarıyla oluşturuldu!")


# ==================== KULLANICI MODELİ ====================

class User:
    """Kullanıcı modeli"""
    
    @staticmethod
    def hash_password(password):
        """Şifreyi hashle"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def generate_token():
        """Güvenli token oluştur"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create(email, password, name=None):
        """Yeni kullanıcı oluştur"""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            password_hash = User.hash_password(password)
            cursor.execute('''
                INSERT INTO users (email, password_hash, name)
                VALUES (?, ?, ?)
            ''', (email.lower(), password_hash, name))
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None  # Email zaten kayıtlı
        finally:
            conn.close()
    
    @staticmethod
    def authenticate(email, password):
        """Kullanıcı girişi doğrula"""
        conn = get_db_connection()
        password_hash = User.hash_password(password)
        user = conn.execute('''
            SELECT id, email, name, is_active FROM users 
            WHERE email = ? AND password_hash = ? AND is_active = 1
        ''', (email.lower(), password_hash)).fetchone()
        
        if user:
            # Son giriş zamanını güncelle
            conn.execute('UPDATE users SET last_login = ? WHERE id = ?', 
                        (datetime.now(), user['id']))
            conn.commit()
        conn.close()
        return dict(user) if user else None
    
    @staticmethod
    def get_by_id(user_id):
        """ID ile kullanıcı getir"""
        conn = get_db_connection()
        user = conn.execute('''
            SELECT id, email, name, is_active, created_at, last_login 
            FROM users WHERE id = ?
        ''', (user_id,)).fetchone()
        conn.close()
        return dict(user) if user else None
    
    @staticmethod
    def get_by_email(email):
        """Email ile kullanıcı getir"""
        conn = get_db_connection()
        user = conn.execute('''
            SELECT id, email, name, is_active FROM users WHERE email = ?
        ''', (email.lower(),)).fetchone()
        conn.close()
        return dict(user) if user else None
    
    @staticmethod
    def create_session(user_id, expires_hours=24*7):
        """Oturum tokeni oluştur (varsayılan 7 gün)"""
        conn = get_db_connection()
        token = User.generate_token()
        expires_at = datetime.now() + timedelta(hours=expires_hours)
        
        conn.execute('''
            INSERT INTO sessions (user_id, token, expires_at)
            VALUES (?, ?, ?)
        ''', (user_id, token, expires_at))
        conn.commit()
        conn.close()
        return token
    
    @staticmethod
    def validate_token(token):
        """Token doğrula ve kullanıcı bilgisi döndür"""
        conn = get_db_connection()
        session = conn.execute('''
            SELECT s.user_id, s.expires_at, u.email, u.name, u.is_active
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND u.is_active = 1
        ''', (token,)).fetchone()
        conn.close()
        
        if not session:
            return None
        
        # Token süresi kontrolü
        expires_at = datetime.fromisoformat(session['expires_at'])
        if datetime.now() > expires_at:
            User.delete_session(token)
            return None
        
        return {
            'user_id': session['user_id'],
            'email': session['email'],
            'name': session['name']
        }
    
    @staticmethod
    def delete_session(token):
        """Oturumu sil (çıkış)"""
        conn = get_db_connection()
        conn.execute('DELETE FROM sessions WHERE token = ?', (token,))
        conn.commit()
        conn.close()
    
    @staticmethod
    def delete_all_sessions(user_id):
        """Kullanıcının tüm oturumlarını sil"""
        conn = get_db_connection()
        conn.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
        conn.commit()
        conn.close()


class Seller:
    """Satıcı modeli"""
    
    @staticmethod
    def create(trendyol_seller_id, user_id, name=None, url=None, note=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO sellers (trendyol_seller_id, user_id, name, url, note)
                VALUES (?, ?, ?, ?, ?)
            ''', (trendyol_seller_id, user_id, name, url, note))
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None
        finally:
            conn.close()
    
    @staticmethod
    def get_all(user_id=None):
        conn = get_db_connection()
        if user_id:
            sellers = conn.execute('SELECT * FROM sellers WHERE user_id = ? ORDER BY created_at DESC', (user_id,)).fetchall()
        else:
            sellers = conn.execute('SELECT * FROM sellers ORDER BY created_at DESC').fetchall()
        conn.close()
        return [dict(s) for s in sellers]
    
    @staticmethod
    def get_by_id(seller_id, user_id=None):
        conn = get_db_connection()
        if user_id:
            seller = conn.execute('SELECT * FROM sellers WHERE id = ? AND user_id = ?', (seller_id, user_id)).fetchone()
        else:
            seller = conn.execute('SELECT * FROM sellers WHERE id = ?', (seller_id,)).fetchone()
        conn.close()
        return dict(seller) if seller else None
    
    @staticmethod
    def delete(seller_id, user_id=None):
        conn = get_db_connection()
        if user_id:
            conn.execute('DELETE FROM sellers WHERE id = ? AND user_id = ?', (seller_id, user_id))
        else:
            conn.execute('DELETE FROM sellers WHERE id = ?', (seller_id,))
        conn.commit()
        conn.close()
    
    @staticmethod
    def update_last_sync(seller_id):
        conn = get_db_connection()
        conn.execute('UPDATE sellers SET last_sync = ? WHERE id = ?', 
                    (datetime.now(), seller_id))
        conn.commit()
        conn.close()
    
    @staticmethod
    def delete(seller_id):
        """Satıcıyı ve ilişkili ürünleri sil"""
        conn = get_db_connection()
        try:
            # Önce satıcının ürünlerini sil
            conn.execute('DELETE FROM products WHERE seller_id = ?', (seller_id,))
            # Sonra satıcıyı sil
            conn.execute('DELETE FROM sellers WHERE id = ?', (seller_id,))
            conn.commit()
        finally:
            conn.close()


class Product:
    """Ürün modeli"""
    
    @staticmethod
    def create_or_update(data, user_id=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Mevcut ürünü kontrol et (kullanıcıya göre)
        if user_id:
            existing = cursor.execute(
                'SELECT id FROM products WHERE trendyol_id = ? AND user_id = ?', 
                (data.get('trendyol_id'), user_id)
            ).fetchone()
        else:
            existing = cursor.execute(
                'SELECT id FROM products WHERE trendyol_id = ?', 
                (data.get('trendyol_id'),)
            ).fetchone()
        
        if existing:
            # Güncelle
            cursor.execute('''
                UPDATE products SET
                    name = ?, brand_name = ?, category_name = ?,
                    trendyol_url = ?, trendyol_price = ?, trendyol_original_price = ?,
                    images = ?, variants = ?, rating_score = ?, rating_count = ?,
                    updated_at = ?
                WHERE id = ?
            ''', (
                data.get('name'), data.get('brand_name'), data.get('category_name'),
                data.get('trendyol_url'), data.get('trendyol_price'), data.get('trendyol_original_price'),
                json.dumps(data.get('images', [])), json.dumps(data.get('variants', [])),
                data.get('rating_score'), data.get('rating_count'),
                datetime.now(), existing['id']
            ))
            product_id = existing['id']
        else:
            # Yeni ekle
            cursor.execute('''
                INSERT INTO products (
                    user_id, trendyol_id, seller_id, name, brand_name, category_name,
                    trendyol_url, trendyol_price, trendyol_original_price,
                    images, variants, rating_score, rating_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, data.get('trendyol_id'), data.get('seller_id'),
                data.get('name'), data.get('brand_name'), data.get('category_name'),
                data.get('trendyol_url'), data.get('trendyol_price'), data.get('trendyol_original_price'),
                json.dumps(data.get('images', [])), json.dumps(data.get('variants', [])),
                data.get('rating_score'), data.get('rating_count')
            ))
            product_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return product_id
    
    @staticmethod
    def get_all(page=1, per_page=50, seller_id=None, synced_only=False, user_id=None):
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        query = 'SELECT * FROM products WHERE 1=1'
        params = []
        
        if user_id:
            query += ' AND user_id = ?'
            params.append(user_id)
        
        if seller_id:
            query += ' AND seller_id = ?'
            params.append(seller_id)
        
        if synced_only:
            query += ' AND is_synced_to_shopify = 1'
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.extend([per_page, offset])
        
        products = conn.execute(query, params).fetchall()
        
        # Toplam sayı
        count_query = 'SELECT COUNT(*) FROM products WHERE 1=1'
        count_params = []
        if user_id:
            count_query += ' AND user_id = ?'
            count_params.append(user_id)
        if seller_id:
            count_query += ' AND seller_id = ?'
            count_params.append(seller_id)
        total = conn.execute(count_query, count_params).fetchone()[0]
        
        conn.close()
        
        result = []
        for p in products:
            prod = dict(p)
            prod['images'] = json.loads(prod['images']) if prod['images'] else []
            prod['variants'] = json.loads(prod['variants']) if prod['variants'] else []
            result.append(prod)
        
        return {
            'products': result,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    
    @staticmethod
    def get_by_id(product_id, user_id=None):
        conn = get_db_connection()
        if user_id:
            product = conn.execute('SELECT * FROM products WHERE id = ? AND user_id = ?', (product_id, user_id)).fetchone()
        else:
            product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
        conn.close()
        if product:
            prod = dict(product)
            prod['images'] = json.loads(prod['images']) if prod['images'] else []
            prod['variants'] = json.loads(prod['variants']) if prod['variants'] else []
            return prod
        return None
    
    @staticmethod
    def update_shopify_sync(product_id, shopify_id, shopify_price):
        conn = get_db_connection()
        conn.execute('''
            UPDATE products SET 
                shopify_id = ?, shopify_price = ?, 
                is_synced_to_shopify = 1, last_sync = ?
            WHERE id = ?
        ''', (shopify_id, shopify_price, datetime.now(), product_id))
        conn.commit()
        conn.close()
    
    @staticmethod
    def update_shopify_price(product_id, shopify_price):
        """Sadece Shopify fiyatını güncelle"""
        conn = get_db_connection()
        conn.execute('''
            UPDATE products SET 
                shopify_price = ?, updated_at = ?
            WHERE id = ?
        ''', (shopify_price, datetime.now(), product_id))
        conn.commit()
        conn.close()
    
    @staticmethod
    def update_profit_margin(product_id, margin):
        conn = get_db_connection()
        conn.execute('''
            UPDATE products SET profit_margin = ?, updated_at = ?
            WHERE id = ?
        ''', (margin, datetime.now(), product_id))
        conn.commit()
        conn.close()
    
    @staticmethod
    def bulk_update_margin(product_ids, margin):
        conn = get_db_connection()
        placeholders = ','.join(['?' for _ in product_ids])
        conn.execute(f'''
            UPDATE products SET profit_margin = ?, updated_at = ?
            WHERE id IN ({placeholders})
        ''', [margin, datetime.now()] + list(product_ids))
        conn.commit()
        conn.close()
    
    @staticmethod
    def update_stock_status(product_id, in_stock: bool, trendyol_price: float = None):
        """
        Ürünün stok durumunu güncelle
        
        Args:
            product_id: Ürün ID
            in_stock: Stokta var mı
            trendyol_price: Güncel Trendyol fiyatı
        """
        conn = get_db_connection()
        stock_status = 'in_stock' if in_stock else 'out_of_stock'
        
        if trendyol_price:
            conn.execute('''
                UPDATE products SET 
                    stock_status = ?, trendyol_price = ?,
                    is_active = ?, last_sync = ?, updated_at = ?
                WHERE id = ?
            ''', (stock_status, trendyol_price, in_stock, datetime.now(), datetime.now(), product_id))
        else:
            conn.execute('''
                UPDATE products SET 
                    stock_status = ?, is_active = ?, 
                    last_sync = ?, updated_at = ?
                WHERE id = ?
            ''', (stock_status, in_stock, datetime.now(), datetime.now(), product_id))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def bulk_update_stock(stock_updates: list):
        """
        Toplu stok güncelleme
        
        Args:
            stock_updates: [{product_id, in_stock, trendyol_price}, ...]
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for update in stock_updates:
            stock_status = 'in_stock' if update.get('in_stock') else 'out_of_stock'
            cursor.execute('''
                UPDATE products SET 
                    stock_status = ?, is_active = ?,
                    trendyol_price = ?, last_sync = ?, updated_at = ?
                WHERE trendyol_id = ?
            ''', (
                stock_status, update.get('in_stock', False),
                update.get('price', 0), datetime.now(), datetime.now(),
                update.get('trendyol_id')
            ))
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_synced_products():
        """Shopify'a senkronize edilmiş tüm ürünleri getir"""
        conn = get_db_connection()
        products = conn.execute('''
            SELECT id, trendyol_id, shopify_id, name, trendyol_price, 
                   shopify_price, stock_status, last_sync
            FROM products 
            WHERE is_synced_to_shopify = 1
        ''').fetchall()
        conn.close()
        return [dict(p) for p in products]
    
    @staticmethod
    def get_out_of_stock_products():
        """Stokta olmayan ürünleri getir"""
        conn = get_db_connection()
        products = conn.execute('''
            SELECT * FROM products 
            WHERE stock_status = 'out_of_stock' OR is_active = 0
        ''').fetchall()
        conn.close()
        return [dict(p) for p in products]
    
    @staticmethod
    def get_by_trendyol_id(trendyol_id):
        """Trendyol ID ile ürün getir"""
        conn = get_db_connection()
        product = conn.execute(
            'SELECT * FROM products WHERE trendyol_id = ?', 
            (trendyol_id,)
        ).fetchone()
        conn.close()
        if product:
            prod = dict(product)
            prod['images'] = json.loads(prod['images']) if prod['images'] else []
            prod['variants'] = json.loads(prod['variants']) if prod['variants'] else []
            return prod
        return None


class Order:
    """Sipariş modeli"""
    
    @staticmethod
    def create(data, user_id=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO orders (
                user_id, shopify_order_id, shopify_order_number,
                customer_name, customer_email, customer_phone,
                shipping_address, order_items,
                total_price, subtotal_price, shipping_price,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id, data.get('shopify_order_id'), data.get('shopify_order_number'),
            data.get('customer_name'), data.get('customer_email'), data.get('customer_phone'),
            json.dumps(data.get('shipping_address', {})),
            json.dumps(data.get('order_items', [])),
            data.get('total_price'), data.get('subtotal_price'), data.get('shipping_price'),
            data.get('status', 'pending')
        ))
        
        order_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return order_id
    
    @staticmethod
    def get_all(status=None, page=1, per_page=20, user_id=None):
        conn = get_db_connection()
        offset = (page - 1) * per_page
        
        query = 'SELECT * FROM orders WHERE 1=1'
        params = []
        
        if user_id:
            query += ' AND user_id = ?'
            params.append(user_id)
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.extend([per_page, offset])
        
        orders = conn.execute(query, params).fetchall()
        
        result = []
        for o in orders:
            order = dict(o)
            order['shipping_address'] = json.loads(order['shipping_address']) if order['shipping_address'] else {}
            order['order_items'] = json.loads(order['order_items']) if order['order_items'] else []
            
            # Kargo bilgisini ekle
            shipment = conn.execute(
                'SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
                (order['id'],)
            ).fetchone()
            if shipment:
                shipment_data = dict(shipment)
                order['tracking_number'] = shipment_data.get('tracking_number')
                order['carrier'] = shipment_data.get('carrier')
                order['carrier_name'] = Shipment.CARRIERS.get(shipment_data.get('carrier', ''), {}).get('name', '')
                order['tracking_url'] = shipment_data.get('tracking_url')
                order['shipment_status'] = shipment_data.get('status')
            
            result.append(order)
        
        conn.close()
        return result
    
    @staticmethod
    def get_by_id(order_id, user_id=None):
        conn = get_db_connection()
        if user_id:
            order = conn.execute('SELECT * FROM orders WHERE id = ? AND user_id = ?', (order_id, user_id)).fetchone()
        else:
            order = conn.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
        
        if order:
            o = dict(order)
            o['shipping_address'] = json.loads(o['shipping_address']) if o['shipping_address'] else {}
            o['order_items'] = json.loads(o['order_items']) if o['order_items'] else []
            
            # Kargo bilgisini ekle
            shipment = conn.execute(
                'SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
                (order_id,)
            ).fetchone()
            if shipment:
                shipment_data = dict(shipment)
                o['tracking_number'] = shipment_data.get('tracking_number')
                o['carrier'] = shipment_data.get('carrier')
                o['carrier_name'] = Shipment.CARRIERS.get(shipment_data.get('carrier', ''), {}).get('name', '')
                o['tracking_url'] = shipment_data.get('tracking_url')
                o['shipment_status'] = shipment_data.get('status')
            
            conn.close()
            return o
        conn.close()
        return None
    
    @staticmethod
    def update_status(order_id, status, notes=None, user_id=None):
        conn = get_db_connection()
        if user_id:
            conn.execute('''
                UPDATE orders SET status = ?, notes = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
            ''', (status, notes, datetime.now(), order_id, user_id))
        else:
            conn.execute('''
                UPDATE orders SET status = ?, notes = ?, updated_at = ?
                WHERE id = ?
            ''', (status, notes, datetime.now(), order_id))
        conn.commit()
        conn.close()
    
    @staticmethod
    def update_trendyol_order(order_id, trendyol_order_id, tracking_number=None):
        conn = get_db_connection()
        conn.execute('''
            UPDATE orders SET 
                trendyol_order_placed = 1,
                trendyol_order_id = ?,
                trendyol_tracking_number = ?,
                status = 'purchased',
                updated_at = ?
            WHERE id = ?
        ''', (trendyol_order_id, tracking_number, datetime.now(), order_id))
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_pending_orders(user_id=None):
        conn = get_db_connection()
        if user_id:
            orders = conn.execute(
                "SELECT * FROM orders WHERE status = 'pending' AND user_id = ? ORDER BY created_at ASC",
                (user_id,)
            ).fetchall()
        else:
            orders = conn.execute(
                "SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at ASC"
            ).fetchall()
        conn.close()
        return [dict(o) for o in orders]


class ShopifyStore:
    """Shopify Mağazaları modeli"""
    
    @staticmethod
    def create(user_id, shop_name, access_token, store_name=None, is_default=False):
        """Yeni mağaza ekle"""
        conn = get_db_connection()
        try:
            # Eğer is_default ise diğerlerini default olmaktan çıkar
            if is_default:
                conn.execute(
                    'UPDATE shopify_stores SET is_default = 0 WHERE user_id = ?',
                    (user_id,)
                )
            
            cursor = conn.execute('''
                INSERT INTO shopify_stores (user_id, shop_name, access_token, store_name, is_default)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, shop_name, access_token, store_name, is_default))
            conn.commit()
            store_id = cursor.lastrowid
            conn.close()
            return store_id
        except sqlite3.IntegrityError:
            conn.close()
            raise ValueError("Bu mağaza zaten eklenmiş")
    
    @staticmethod
    def get_all(user_id):
        """Kullanıcının tüm mağazalarını getir"""
        conn = get_db_connection()
        stores = conn.execute('''
            SELECT * FROM shopify_stores WHERE user_id = ? ORDER BY is_default DESC, created_at DESC
        ''', (user_id,)).fetchall()
        conn.close()
        return [dict(s) for s in stores]
    
    @staticmethod
    def get_by_id(store_id, user_id=None):
        """ID ile mağaza getir"""
        conn = get_db_connection()
        if user_id:
            store = conn.execute(
                'SELECT * FROM shopify_stores WHERE id = ? AND user_id = ?',
                (store_id, user_id)
            ).fetchone()
        else:
            store = conn.execute('SELECT * FROM shopify_stores WHERE id = ?', (store_id,)).fetchone()
        conn.close()
        return dict(store) if store else None
    
    @staticmethod
    def get_default(user_id):
        """Varsayılan mağazayı getir"""
        conn = get_db_connection()
        store = conn.execute('''
            SELECT * FROM shopify_stores WHERE user_id = ? AND is_default = 1
        ''', (user_id,)).fetchone()
        
        # Varsayılan yoksa ilk aktif olanı getir
        if not store:
            store = conn.execute('''
                SELECT * FROM shopify_stores WHERE user_id = ? AND is_active = 1 
                ORDER BY created_at ASC LIMIT 1
            ''', (user_id,)).fetchone()
        
        conn.close()
        return dict(store) if store else None
    
    @staticmethod
    def update(store_id, user_id, **kwargs):
        """Mağaza güncelle"""
        conn = get_db_connection()
        
        # Eğer is_default true yapılıyorsa diğerlerini false yap
        if kwargs.get('is_default'):
            conn.execute(
                'UPDATE shopify_stores SET is_default = 0 WHERE user_id = ?',
                (user_id,)
            )
        
        allowed_fields = ['shop_name', 'access_token', 'store_name', 'is_active', 'is_default']
        updates = []
        values = []
        
        for field in allowed_fields:
            if field in kwargs:
                updates.append(f"{field} = ?")
                values.append(kwargs[field])
        
        if updates:
            values.extend([store_id, user_id])
            conn.execute(f'''
                UPDATE shopify_stores SET {', '.join(updates)} 
                WHERE id = ? AND user_id = ?
            ''', values)
            conn.commit()
        
        conn.close()
    
    @staticmethod
    def delete(store_id, user_id):
        """Mağaza sil"""
        conn = get_db_connection()
        conn.execute(
            'DELETE FROM shopify_stores WHERE id = ? AND user_id = ?',
            (store_id, user_id)
        )
        conn.commit()
        conn.close()
    
    @staticmethod
    def set_default(store_id, user_id):
        """Mağazayı varsayılan yap"""
        conn = get_db_connection()
        # Önce tümünü false yap
        conn.execute(
            'UPDATE shopify_stores SET is_default = 0 WHERE user_id = ?',
            (user_id,)
        )
        # Seçileni true yap
        conn.execute(
            'UPDATE shopify_stores SET is_default = 1 WHERE id = ? AND user_id = ?',
            (store_id, user_id)
        )
        conn.commit()
        conn.close()


class Settings:
    """Ayarlar modeli (kullanıcı bazlı)"""
    
    @staticmethod
    def get(key, default=None, user_id=None):
        conn = get_db_connection()
        if user_id:
            result = conn.execute('SELECT value FROM settings WHERE key = ? AND user_id = ?', (key, user_id)).fetchone()
        else:
            result = conn.execute('SELECT value FROM settings WHERE key = ?', (key,)).fetchone()
        conn.close()
        if result:
            try:
                return json.loads(result['value'])
            except:
                return result['value']
        return default
    
    @staticmethod
    def set(key, value, user_id=None):
        conn = get_db_connection()
        value_str = json.dumps(value) if not isinstance(value, str) else value
        if user_id:
            # UPSERT for user-specific setting
            existing = conn.execute('SELECT id FROM settings WHERE key = ? AND user_id = ?', (key, user_id)).fetchone()
            if existing:
                conn.execute('''
                    UPDATE settings SET value = ?, updated_at = ? WHERE key = ? AND user_id = ?
                ''', (value_str, datetime.now(), key, user_id))
            else:
                conn.execute('''
                    INSERT INTO settings (user_id, key, value, updated_at)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, key, value_str, datetime.now()))
        else:
            conn.execute('''
                INSERT OR REPLACE INTO settings (key, value, updated_at)
                VALUES (?, ?, ?)
            ''', (key, value_str, datetime.now()))
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_all(user_id=None):
        conn = get_db_connection()
        if user_id:
            settings = conn.execute('SELECT * FROM settings WHERE user_id = ?', (user_id,)).fetchall()
        else:
            settings = conn.execute('SELECT * FROM settings').fetchall()
        conn.close()
        result = {}
        for s in settings:
            try:
                result[s['key']] = json.loads(s['value'])
            except:
                result[s['key']] = s['value']
        return result


class ActivityLog:
    """Aktivite log modeli"""
    
    @staticmethod
    def create(action, details=None, status='success', user_id=None):
        """Aktivite logu oluştur"""
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO activity_logs (user_id, action, details, status)
            VALUES (?, ?, ?, ?)
        ''', (user_id, action, details, status))
        conn.commit()
        conn.close()
    
    @staticmethod
    def log(action, details=None, status='success', user_id=None):
        """create ile aynı - geriye uyumluluk için"""
        ActivityLog.create(action, details, status, user_id)
    
    @staticmethod
    def get_recent(limit=50, user_id=None):
        conn = get_db_connection()
        if user_id:
            logs = conn.execute(
                'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', 
                (user_id, limit)
            ).fetchall()
        else:
            logs = conn.execute(
                'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?', 
                (limit,)
            ).fetchall()
        conn.close()
        return [dict(l) for l in logs]


class Shipment:
    """Kargo takip modeli"""
    
    # Desteklenen kargo firmaları
    CARRIERS = {
        'yurtici': {
            'name': 'Yurtiçi Kargo',
            'tracking_url': 'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={}'
        },
        'aras': {
            'name': 'Aras Kargo',
            'tracking_url': 'https://www.araskargo.com.tr/trmKargoTakip.html?gonderinizi-takip-edin={}'
        },
        'mng': {
            'name': 'MNG Kargo',
            'tracking_url': 'https://www.mngkargo.com.tr/gonderi-takip?q={}'
        },
        'ptt': {
            'name': 'PTT Kargo',
            'tracking_url': 'https://gonderitakip.ptt.gov.tr/Track/Verify?q={}'
        },
        'ups': {
            'name': 'UPS',
            'tracking_url': 'https://www.ups.com/track?tracknum={}'
        },
        'trendyol_express': {
            'name': 'Trendyol Express',
            'tracking_url': 'https://www.trendyolexpress.com/gonderi-takip/{}'
        },
        'other': {
            'name': 'Diğer',
            'tracking_url': ''
        }
    }
    
    @staticmethod
    def create(user_id, order_id, tracking_number, carrier, carrier_name=None):
        """Yeni kargo takibi oluştur"""
        conn = get_db_connection()
        
        carrier_info = Shipment.CARRIERS.get(carrier, Shipment.CARRIERS['other'])
        if not carrier_name:
            carrier_name = carrier_info['name']
        
        tracking_url = carrier_info['tracking_url'].format(tracking_number) if carrier_info['tracking_url'] else ''
        
        cursor = conn.execute('''
            INSERT INTO shipments (user_id, order_id, tracking_number, carrier, carrier_name, tracking_url)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, order_id, tracking_number, carrier, carrier_name, tracking_url))
        
        shipment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return shipment_id
    
    @staticmethod
    def get_all(user_id, limit=50):
        """Kullanıcının tüm kargolarını getir"""
        conn = get_db_connection()
        shipments = conn.execute('''
            SELECT s.*, o.shopify_order_number, o.customer_name 
            FROM shipments s
            LEFT JOIN orders o ON s.order_id = o.id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
            LIMIT ?
        ''', (user_id, limit)).fetchall()
        conn.close()
        return [dict(s) for s in shipments]
    
    @staticmethod
    def get_by_id(shipment_id, user_id):
        """Belirli bir kargoyu getir"""
        conn = get_db_connection()
        shipment = conn.execute(
            'SELECT * FROM shipments WHERE id = ? AND user_id = ?', 
            (shipment_id, user_id)
        ).fetchone()
        conn.close()
        return dict(shipment) if shipment else None
    
    @staticmethod
    def get_by_order(order_id, user_id):
        """Siparişe ait kargoyu getir"""
        conn = get_db_connection()
        shipment = conn.execute(
            'SELECT * FROM shipments WHERE order_id = ? AND user_id = ?', 
            (order_id, user_id)
        ).fetchone()
        conn.close()
        return dict(shipment) if shipment else None
    
    @staticmethod
    def update(shipment_id, user_id, **kwargs):
        """Kargo bilgisini güncelle"""
        conn = get_db_connection()
        
        updates = []
        values = []
        for key, value in kwargs.items():
            if key in ['status', 'last_status_update', 'estimated_delivery', 'delivery_date', 'tracking_number']:
                updates.append(f'{key} = ?')
                values.append(value)
        
        if updates:
            updates.append('updated_at = CURRENT_TIMESTAMP')
            values.extend([shipment_id, user_id])
            conn.execute(f'''
                UPDATE shipments SET {', '.join(updates)} 
                WHERE id = ? AND user_id = ?
            ''', values)
            conn.commit()
        
        conn.close()
    
    @staticmethod
    def update_status(shipment_id, user_id, status, status_text=None):
        """Kargo durumunu güncelle"""
        Shipment.update(shipment_id, user_id, status=status, last_status_update=status_text)
    
    @staticmethod
    def delete(shipment_id, user_id):
        """Kargoyu sil"""
        conn = get_db_connection()
        conn.execute('DELETE FROM shipments WHERE id = ? AND user_id = ?', (shipment_id, user_id))
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_carriers():
        """Desteklenen kargo firmalarını döndür"""
        return [
            {'code': code, 'name': info['name']} 
            for code, info in Shipment.CARRIERS.items()
        ]


class WebhookLog:
    """Webhook Log Modeli"""
    
    @staticmethod
    def create(topic, shop_domain, payload, status='received', response=None):
        """Yeni webhook log kaydı oluştur"""
        conn = get_db_connection()
        cursor = conn.execute('''
            INSERT INTO webhook_logs (topic, shop_domain, payload, status, response)
            VALUES (?, ?, ?, ?, ?)
        ''', (topic, shop_domain, json.dumps(payload), status, json.dumps(response) if response else None))
        conn.commit()
        webhook_log_id = cursor.lastrowid
        conn.close()
        return webhook_log_id
    
    @staticmethod
    def get_all(limit=50):
        """Tüm webhook loglarını getir"""
        conn = get_db_connection()
        logs = conn.execute(
            'SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT ?',
            (limit,)
        ).fetchall()
        conn.close()
        return [dict(log) for log in logs]
    
    @staticmethod
    def get_by_id(log_id):
        """Belirli bir webhook log'u getir"""
        conn = get_db_connection()
        log = conn.execute('SELECT * FROM webhook_logs WHERE id = ?', (log_id,)).fetchone()
        conn.close()
        return dict(log) if log else None
    
    @staticmethod
    def update_status(log_id, status, response=None):
        """Webhook log durumunu güncelle"""
        conn = get_db_connection()
        conn.execute('''
            UPDATE webhook_logs SET status = ?, response = ?
            WHERE id = ?
        ''', (status, json.dumps(response) if response else None, log_id))
        conn.commit()
        conn.close()
    
    @staticmethod
    def delete(log_id):
        """Webhook log'u sil"""
        conn = get_db_connection()
        conn.execute('DELETE FROM webhook_logs WHERE id = ?', (log_id,))
        conn.commit()
        conn.close()
    
    @staticmethod
    def clear_all():
        """Tüm webhook loglarını temizle"""
        conn = get_db_connection()
        cursor = conn.execute('DELETE FROM webhook_logs')
        count = cursor.rowcount
        conn.commit()
        conn.close()
        return count


# Backward compatibility için db_session alias
db_session = type('db_session', (), {
    'add': lambda x: None,
    'commit': lambda: None,
    'rollback': lambda: None,
    'query': lambda x: None
})()


if __name__ == '__main__':
    init_database()
