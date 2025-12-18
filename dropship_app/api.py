"""
Dropship Otomasyon Sistemi - REST API
Mobil uygulama için backend API
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uvicorn
import logging
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
import os

from models import init_database, User, Seller, Product, Order, Settings, ActivityLog, ShopifyStore, Shipment
from trendyol_scraper import get_scraper
from shopify_api import get_shopify_api, ShopifyAPI
from stock_sync import get_stock_sync_manager
from webhooks import router as webhook_router
from websocket_manager import manager, EventTypes, broadcast_product_event, broadcast_seller_event, broadcast_order_event

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Periyodik görev durumu
periodic_task = None
ORDER_CHECK_INTERVAL = 300  # 5 dakika (saniye cinsinden)


async def periodic_order_check():
    """Her 5 dakikada bir tüm kullanıcılar için sipariş kontrolü yap"""
    while True:
        try:
            await asyncio.sleep(ORDER_CHECK_INTERVAL)
            logger.info("🔄 Periyodik sipariş kontrolü başlıyor...")
            
            # Tüm kullanıcıları al ve her biri için sipariş çek
            import sqlite3
            conn = sqlite3.connect('database/dropship.db')
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users")
            users = cursor.fetchall()
            conn.close()
            
            for (user_id,) in users:
                try:
                    await sync_shopify_orders(user_id)
                except Exception as e:
                    logger.error(f"Kullanıcı {user_id} sipariş çekme hatası: {e}")
            
            logger.info(f"✅ Periyodik sipariş kontrolü tamamlandı ({len(users)} kullanıcı)")
        except asyncio.CancelledError:
            logger.info("Periyodik görev durduruldu")
            break
        except Exception as e:
            logger.error(f"Periyodik kontrol hatası: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başlangıç ve kapanış işlemleri"""
    global periodic_task
    # Başlangıç: Periyodik görevi başlat
    logger.info("🚀 Periyodik sipariş kontrolü başlatılıyor (her 5 dakika)...")
    periodic_task = asyncio.create_task(periodic_order_check())
    
    yield
    
    # Kapanış: Periyodik görevi durdur
    if periodic_task:
        periodic_task.cancel()
        try:
            await periodic_task
        except asyncio.CancelledError:
            pass


# FastAPI uygulaması
app = FastAPI(
    title="Dropship Otomasyon API",
    description="Trendyol → Shopify Entegrasyon API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS ayarları (mobil uygulamadan erişim için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Veritabanını başlat
init_database()

# Webhook router'ını ekle
app.include_router(webhook_router)

# Security
security = HTTPBearer(auto_error=False)


# ==================== ROOT ENDPOINT ====================

@app.get("/")
async def root():
    """API Ana Sayfa"""
    return {
        "app": "Dropship Automation API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth/*",
            "sellers": "/api/sellers",
            "products": "/api/products",
            "orders": "/api/orders",
            "websocket": "/ws"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ==================== WEBSOCKET ENDPOINT ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint - Real-time senkronizasyon
    Kullanım: ws://localhost:8000/ws
    """
    await manager.connect(websocket)
    
    try:
        # Bağlantı mesajı gönder
        await manager.send_personal_message({
            "type": "connected",
            "message": "WebSocket bağlantısı kuruldu",
            "connections": manager.get_connection_count()
        }, websocket)
        
        # Mesaj dinlemeye başla
        while True:
            data = await websocket.receive_json()
            
            # Ping-pong için
            if data.get("type") == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": data.get("timestamp")
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@app.get("/ws/stats")
async def websocket_stats():
    """WebSocket bağlantı istatistikleri"""
    return {
        "total_connections": manager.get_connection_count(),
        "active_users": manager.get_user_count()
    }


# ==================== AUTH HELPER ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Mevcut kullanıcıyı token ile doğrula"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Giriş yapmanız gerekiyor")
    
    token = credentials.credentials
    user = User.validate_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")
    
    return user


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Opsiyonel kullanıcı doğrulama (bazı endpointler için)"""
    if not credentials:
        return None
    
    token = credentials.credentials
    return User.validate_token(token)


# ==================== AUTH MODELLER ====================

class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class SellerCreate(BaseModel):
    trendyol_seller_id: int
    name: Optional[str] = None
    url: Optional[str] = None
    note: Optional[str] = None

class SettingsUpdate(BaseModel):
    shopify_shop_name: Optional[str] = None
    shopify_access_token: Optional[str] = None
    profit_margin: Optional[float] = None
    currency_buffer: Optional[float] = None
    auto_stock_sync: Optional[bool] = None
    auto_price_update: Optional[bool] = None
    hide_out_of_stock: Optional[bool] = None
    stock_sync_interval: Optional[int] = None

class ProductSync(BaseModel):
    product_ids: List[int]
    profit_margin: Optional[float] = 50


# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/register")
async def register(data: UserRegister):
    """Yeni kullanıcı kaydı"""
    try:
        # Email kontrolü
        if User.get_by_email(data.email):
            raise HTTPException(status_code=400, detail="Bu email adresi zaten kayıtlı")
        
        # Şifre kontrolü
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalı")
        
        # Kullanıcı oluştur
        user_id = User.create(data.email, data.password, data.name)
        if not user_id:
            raise HTTPException(status_code=400, detail="Kayıt başarısız")
        
        # Oturum token'ı oluştur
        token = User.create_session(user_id)
        
        return {
            "success": True,
            "message": "Kayıt başarılı",
            "data": {
                "user_id": user_id,
                "email": data.email,
                "name": data.name,
                "token": token
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kayıt hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login")
async def login(data: UserLogin):
    """Kullanıcı girişi"""
    try:
        user = User.authenticate(data.email, data.password)
        if not user:
            raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
        
        # Oturum token'ı oluştur
        token = User.create_session(user['id'])
        
        return {
            "success": True,
            "message": "Giriş başarılı",
            "data": {
                "user_id": user['id'],
                "email": user['email'],
                "name": user['name'],
                "token": token
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Giriş hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user), 
                 credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Çıkış yap"""
    try:
        User.delete_session(credentials.credentials)
        return {"success": True, "message": "Çıkış yapıldı"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Mevcut kullanıcı bilgileri"""
    return {
        "success": True,
        "data": current_user
    }


# ==================== DASHBOARD ====================

@app.get("/api/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """Dashboard verileri"""
    try:
        user_id = current_user['user_id']
        scraper = get_scraper()
        
        # İstatistikler (kullanıcıya özel)
        products = Product.get_all(per_page=10000, user_id=user_id)
        orders = Order.get_all(user_id=user_id)
        sellers = Seller.get_all(user_id=user_id)
        
        total_products = products.get('total', 0)
        synced_products = len([p for p in products.get('products', []) if p.get('is_synced_to_shopify')])
        
        return {
            "success": True,
            "data": {
                "currency_rate": scraper.get_currency_rate(),
                "total_sellers": len(sellers),
                "total_products": total_products,
                "synced_products": synced_products,
                "pending_orders": len([o for o in orders if o.get('status') == 'pending']),
                "total_orders": len(orders),
                "recent_activities": ActivityLog.get_recent(10, user_id=user_id)
            }
        }
    except Exception as e:
        logger.error(f"Dashboard hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SATICILAR ====================

@app.get("/api/sellers")
async def get_sellers(current_user: dict = Depends(get_current_user)):
    """Tüm satıcıları listele"""
    try:
        sellers = Seller.get_all(user_id=current_user['user_id'])
        return {"success": True, "data": sellers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sellers")
async def create_seller(seller: SellerCreate, background_tasks: BackgroundTasks, 
                        current_user: dict = Depends(get_current_user)):
    """Yeni satıcı ekle ve ürünlerini çek"""
    try:
        user_id = current_user['user_id']
        seller_id = Seller.create(seller.trendyol_seller_id, user_id, seller.name, seller.url, seller.note)
        if not seller_id:
            raise HTTPException(status_code=400, detail="Satıcı zaten mevcut")
        
        # Arka planda ürünleri çek
        background_tasks.add_task(scrape_seller_products, seller.trendyol_seller_id, seller_id, user_id)
        
        seller_data = {
            "id": seller_id,
            "name": seller.name,
            "url": seller.url,
            "note": seller.note,
            "trendyol_seller_id": seller.trendyol_seller_id,
            "product_count": 0
        }
        
        # WebSocket broadcast - Tüm bağlı cihazlara bildir
        await broadcast_seller_event(EventTypes.SELLER_ADDED, seller_data)
        
        return {
            "success": True, 
            "message": "Satıcı eklendi, ürünler çekiliyor...",
            "data": seller_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def scrape_seller_products(trendyol_seller_id: int, db_seller_id: int, user_id: int):
    """Satıcı ürünlerini çek (arka plan görevi)"""
    try:
        scraper = get_scraper()
        products = scraper.scrape_seller_products(trendyol_seller_id)
        
        for product in products:
            product['seller_id'] = db_seller_id
            Product.create_or_update(product, user_id=user_id)
        
        Seller.update_last_sync(db_seller_id)
        ActivityLog.create('seller_sync', f'{len(products)} ürün çekildi (Satıcı: {trendyol_seller_id})', user_id=user_id)
        
        # WebSocket broadcast - Ürünler çekildi bildirimi
        await broadcast_seller_event(EventTypes.SELLER_PRODUCTS_FETCHED, {
            "seller_id": db_seller_id,
            "trendyol_seller_id": trendyol_seller_id,
            "product_count": len(products)
        })
        logger.info(f"Satıcı {trendyol_seller_id}: {len(products)} ürün çekildi")
    except Exception as e:
        logger.error(f"Ürün çekme hatası: {e}")

@app.delete("/api/sellers/{seller_id}")
async def delete_seller(seller_id: int, current_user: dict = Depends(get_current_user)):
    """Satıcı sil"""
    try:
        Seller.delete(seller_id, user_id=current_user['user_id'])
        return {"success": True, "message": "Satıcı silindi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sellers/{seller_id}/sync-products")
async def sync_seller_products(seller_id: int, background_tasks: BackgroundTasks,
                               current_user: dict = Depends(get_current_user)):
    """Belirli bir satıcının ürünlerini senkronize et"""
    try:
        user_id = current_user['user_id']
        seller = Seller.get_by_id(seller_id, user_id=user_id)
        if not seller:
            raise HTTPException(status_code=404, detail="Satıcı bulunamadı")
        
        background_tasks.add_task(scrape_seller_products, seller['trendyol_seller_id'], seller_id, user_id)
        return {
            "success": True,
            "message": f"Satıcı ürünleri senkronize ediliyor..."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ÜRÜNLER ====================

@app.get("/api/products")
async def get_products(page: int = 1, per_page: int = 20, seller_id: Optional[int] = None, 
                       synced_only: bool = False, current_user: dict = Depends(get_current_user)):
    """Ürün listesi"""
    try:
        result = Product.get_all(page=page, per_page=per_page, seller_id=seller_id, 
                                 synced_only=synced_only, user_id=current_user['user_id'])
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/{product_id}")
async def get_product(product_id: int, current_user: dict = Depends(get_current_user)):
    """Ürün detayı"""
    try:
        product = Product.get_by_id(product_id, user_id=current_user['user_id'])
        if not product:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        return {"success": True, "data": product}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products/sync-to-shopify")
async def sync_products_to_shopify(data: ProductSync, background_tasks: BackgroundTasks,
                                   current_user: dict = Depends(get_current_user)):
    """Seçili ürünleri Shopify'a yükle"""
    try:
        user_id = current_user['user_id']
        background_tasks.add_task(upload_products_to_shopify, data.product_ids, data.profit_margin, user_id)
        return {
            "success": True, 
            "message": f"{len(data.product_ids)} ürün Shopify'a yükleniyor..."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def upload_products_to_shopify(product_ids: List[int], profit_margin: float, user_id: int):
    """Ürünleri Shopify'a yükle (arka plan)"""
    try:
        shopify_api = get_shopify_api()
        scraper = get_scraper()
        
        for pid in product_ids:
            product = Product.get_by_id(pid, user_id=user_id)
            if not product:
                continue
            
            # Shopify fiyatını hesapla
            shopify_price = scraper.calculate_shopify_price(
                product['trendyol_price'],
                profit_margin=profit_margin,
                to_usd=True
            )
            
            # Shopify'a yükle
            shopify_product = shopify_api.create_product({
                'title': product['name'],
                'body_html': f"Marka: {product.get('brand_name', '')}",
                'vendor': product.get('brand_name', ''),
                'product_type': product.get('category_name', ''),
                'variants': [{
                    'price': str(shopify_price),
                    'sku': f"TY-{product['trendyol_id']}"
                }],
                'images': [{'src': img} for img in product.get('images', [])[:5]]
            })
            
            if shopify_product:
                Product.update_shopify_sync(pid, str(shopify_product['id']), shopify_price)
                Product.update_profit_margin(pid, profit_margin)
                
                # WebSocket broadcast - Ürün Shopify'a yüklendi
                await broadcast_product_event(EventTypes.PRODUCT_SYNCED, {
                    "product_id": pid,
                    "shopify_product_id": str(shopify_product['id']),
                    "price": shopify_price
                })
        
        ActivityLog.create('shopify_sync', f'{len(product_ids)} ürün Shopify\'a yüklendi', user_id=user_id)
    except Exception as e:
        logger.error(f"Shopify yükleme hatası: {e}")

@app.get("/api/products/{product_id}/check-stock")
async def check_product_stock(product_id: int, current_user: dict = Depends(get_current_user)):
    """Ürün stok durumunu kontrol et"""
    try:
        product = Product.get_by_id(product_id, user_id=current_user['user_id'])
        if not product:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
        scraper = get_scraper()
        stock_info = scraper.check_product_stock(product['trendyol_id'])
        
        return {
            "success": True,
            "data": {
                "product_id": product_id,
                "trendyol_id": product['trendyol_id'],
                **stock_info
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SİPARİŞLER ====================

@app.get("/api/orders")
async def get_orders(status: Optional[str] = None, page: int = 1, per_page: int = 20,
                     current_user: dict = Depends(get_current_user)):
    """Sipariş listesi"""
    try:
        orders = Order.get_all(status=status, page=page, per_page=per_page, user_id=current_user['user_id'])
        return {"success": True, "data": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}")
async def get_order(order_id: int, current_user: dict = Depends(get_current_user)):
    """Sipariş detayı"""
    try:
        order = Order.get_by_id(order_id, user_id=current_user['user_id'])
        if not order:
            raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
        return {"success": True, "data": order}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/orders/fetch-from-shopify")
async def fetch_orders_from_shopify(background_tasks: BackgroundTasks,
                                    current_user: dict = Depends(get_current_user)):
    """Shopify'dan yeni siparişleri çek"""
    try:
        user_id = current_user['user_id']
        background_tasks.add_task(sync_shopify_orders, user_id)
        return {"success": True, "message": "Siparişler çekiliyor..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def sync_shopify_orders(user_id: int):
    """Shopify siparişlerini senkronize et"""
    new_orders = []
    try:
        shopify_api = get_shopify_api()
        orders = shopify_api.get_new_orders()
        
        for order_data in orders:
            try:
                Order.create(order_data, user_id=user_id)
                new_orders.append(order_data)
            except:
                pass  # Mevcut sipariş
        
        if new_orders:
            ActivityLog.create('order_sync', f'{len(new_orders)} yeni sipariş geldi!', user_id=user_id)
            logger.info(f"🛒 {len(new_orders)} yeni sipariş - User: {user_id}")
            
            # WebSocket broadcast
            await broadcast_order_event(EventTypes.ORDER_CREATED, {
                "order_count": len(new_orders),
                "message": f"{len(new_orders)} yeni sipariş!"
            })
        
        return new_orders
    except Exception as e:
        logger.error(f"Sipariş çekme hatası: {e}")
        return []


# ==================== BİLDİRİMLER ====================

@app.get("/api/notifications/new-orders")
async def check_new_orders(current_user: dict = Depends(get_current_user)):
    """Yeni siparişleri kontrol et (mobil bildirim için)"""
    try:
        user_id = current_user['user_id']
        
        # Bekleyen siparişleri say
        pending_orders = Order.get_all(status='pending', user_id=user_id)
        pending_count = len(pending_orders) if isinstance(pending_orders, list) else 0
        
        # Son aktiviteleri al (bildirim olarak)
        activities = ActivityLog.get_recent(10, user_id=user_id)
        
        # Bildirim formatına çevir
        notifications = []
        for activity in activities:
            notification = {
                'id': str(activity.get('id', '')),
                'type': activity.get('action_type', 'info'),
                'title': get_notification_title(activity.get('action_type', '')),
                'message': activity.get('details', ''),
                'timestamp': activity.get('created_at', ''),
                'read': False
            }
            notifications.append(notification)
        
        return {
            "success": True,
            "data": {
                "pending_orders": pending_count,
                "notifications": notifications
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_notification_title(action_type: str) -> str:
    """Aksiyon tipine göre bildirim başlığı"""
    titles = {
        'order_sync': '🛒 Sipariş Senkronizasyonu',
        'new_order': '🆕 Yeni Sipariş!',
        'order_processed': '✅ Sipariş İşlendi',
        'stock_sync': '📊 Stok Güncellendi',
        'stock_alert': '⚠️ Stok Uyarısı',
        'product_sync': '📦 Ürün Senkronizasyonu',
        'error': '❌ Hata',
    }
    return titles.get(action_type, '📢 Bildirim')


@app.put("/api/orders/{order_id}/status")
async def update_order_status(order_id: int, status: str, notes: Optional[str] = None,
                              current_user: dict = Depends(get_current_user)):
    """Sipariş durumunu güncelle"""
    try:
        Order.update_status(order_id, status, notes, user_id=current_user['user_id'])
        return {"success": True, "message": "Sipariş durumu güncellendi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PERİYODİK KONTROL ====================

@app.get("/api/orders/auto-check/status")
async def get_order_check_status(current_user: dict = Depends(get_current_user)):
    """Periyodik sipariş kontrolü durumu"""
    global periodic_task
    is_running = periodic_task is not None and not periodic_task.done()
    return {
        "success": True,
        "data": {
            "is_running": is_running,
            "interval_seconds": ORDER_CHECK_INTERVAL,
            "interval_minutes": ORDER_CHECK_INTERVAL // 60
        }
    }


# ==================== STOK SENKRONİZASYONU ====================

@app.post("/api/stock/sync")
async def sync_stock(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Tüm ürünlerin stok durumunu senkronize et"""
    try:
        user_id = current_user['user_id']
        background_tasks.add_task(run_stock_sync, user_id)
        return {"success": True, "message": "Stok senkronizasyonu başlatıldı..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_stock_sync(user_id: int):
    """Stok senkronizasyonu çalıştır"""
    sync_manager = get_stock_sync_manager()
    sync_manager.sync_all_products(user_id=user_id)

@app.get("/api/stock/status")
async def get_stock_sync_status(current_user: dict = Depends(get_current_user)):
    """Stok senkronizasyon durumu"""
    try:
        sync_manager = get_stock_sync_manager()
        return {"success": True, "data": sync_manager.get_sync_status()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stock/auto-sync/start")
async def start_auto_sync(current_user: dict = Depends(get_current_user)):
    """Otomatik stok senkronizasyonunu başlat"""
    try:
        user_id = current_user['user_id']
        sync_manager = get_stock_sync_manager()
        sync_manager.start_auto_sync()
        Settings.set('auto_stock_sync', True, user_id=user_id)
        return {"success": True, "message": "Otomatik senkronizasyon başlatıldı"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stock/auto-sync/stop")
async def stop_auto_sync(current_user: dict = Depends(get_current_user)):
    """Otomatik stok senkronizasyonunu durdur"""
    try:
        user_id = current_user['user_id']
        sync_manager = get_stock_sync_manager()
        sync_manager.stop_auto_sync()
        Settings.set('auto_stock_sync', False, user_id=user_id)
        return {"success": True, "message": "Otomatik senkronizasyon durduruldu"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TOPLU ÜRÜN İŞLEMLERİ ====================

class BulkPriceUpdate(BaseModel):
    product_ids: List[int]
    margin_percentage: Optional[float] = None  # Kar marjı yüzdesi
    fixed_increase: Optional[float] = None  # Sabit artış (TL)
    fixed_price: Optional[float] = None  # Sabit fiyat

class BulkSyncRequest(BaseModel):
    product_ids: List[int]

class BulkDeleteRequest(BaseModel):
    product_ids: List[int]

@app.post("/api/products/bulk/sync-shopify")
async def bulk_sync_to_shopify(request: BulkSyncRequest, current_user: dict = Depends(get_current_user)):
    """Seçili ürünleri toplu olarak Shopify'a yükle"""
    try:
        user_id = current_user['user_id']
        shop_name = Settings.get('shopify_shop_name', user_id)
        access_token = Settings.get('shopify_access_token', user_id)
        
        if not shop_name or not access_token:
            return {"success": False, "error": "Shopify ayarları yapılandırılmamış"}
        
        api = ShopifyAPI(shop_name, access_token)
        
        success_count = 0
        error_count = 0
        errors = []
        
        for product_id in request.product_ids:
            try:
                product = Product.get_by_id(product_id, user_id)
                if not product:
                    continue
                
                result = api.create_product(
                    title=product['title'],
                    body_html=product.get('description', ''),
                    price=str(product['selling_price']),
                    compare_at_price=str(product.get('original_price', product['selling_price'])),
                    sku=product.get('sku', ''),
                    inventory_quantity=product.get('stock', 0),
                    images=[{'src': product.get('image_url', '')}] if product.get('image_url') else None
                )
                
                if result.get('product'):
                    Product.update(product_id, 
                                   is_synced_to_shopify=True, 
                                   shopify_product_id=result['product']['id'],
                                   user_id=user_id)
                    success_count += 1
                else:
                    error_count += 1
                    errors.append(f"{product['title']}: Yükleme başarısız")
            except Exception as e:
                error_count += 1
                errors.append(f"ID {product_id}: {str(e)}")
        
        ActivityLog.create('bulk_sync', 
                          f'{success_count} ürün Shopify\'a yüklendi, {error_count} hata', 
                          user_id=user_id)
        
        # WebSocket broadcast
        await broadcast_product_event(EventTypes.PRODUCT_SYNCED, {
            "success_count": success_count,
            "error_count": error_count,
            "product_ids": request.product_ids
        })
        
        return {
            "success": True,
            "data": {
                "success_count": success_count,
                "error_count": error_count,
                "errors": errors[:10]  # İlk 10 hata
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/products/bulk/update-price")
async def bulk_update_price(request: BulkPriceUpdate, current_user: dict = Depends(get_current_user)):
    """Seçili ürünlerin fiyatlarını toplu güncelle"""
    try:
        user_id = current_user['user_id']
        import sqlite3
        
        conn = sqlite3.connect('database/dropship.db')
        cursor = conn.cursor()
        
        success_count = 0
        
        for product_id in request.product_ids:
            try:
                product = Product.get_by_id(product_id, user_id)
                if not product:
                    continue
                
                original_price = product.get('original_price', product['selling_price'])
                
                # Yeni fiyat hesapla
                if request.fixed_price:
                    new_price = request.fixed_price
                elif request.margin_percentage:
                    new_price = original_price * (1 + request.margin_percentage / 100)
                elif request.fixed_increase:
                    new_price = original_price + request.fixed_increase
                else:
                    continue
                
                cursor.execute("""
                    UPDATE products SET selling_price = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND user_id = ?
                """, (round(new_price, 2), product_id, user_id))
                success_count += 1
            except Exception:
                pass
        
        conn.commit()
        conn.close()
        
        ActivityLog.create('bulk_price_update', 
                          f'{success_count} ürün fiyatı güncellendi', 
                          user_id=user_id)
        
        # WebSocket broadcast
        await broadcast_product_event(EventTypes.PRODUCT_PRICE_CHANGED, {
            "updated_count": success_count,
            "product_ids": request.product_ids
        })
        
        return {
            "success": True,
            "data": {"updated_count": success_count}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/products/bulk/delete")
async def bulk_delete_products(request: BulkDeleteRequest, current_user: dict = Depends(get_current_user)):
    """Seçili ürünleri toplu sil"""
    try:
        user_id = current_user['user_id']
        import sqlite3
        
        conn = sqlite3.connect('database/dropship.db')
        cursor = conn.cursor()
        
        deleted_count = 0
        for product_id in request.product_ids:
            cursor.execute("DELETE FROM products WHERE id = ? AND user_id = ?", (product_id, user_id))
            if cursor.rowcount > 0:
                deleted_count += 1
        
        conn.commit()
        conn.close()
        
        ActivityLog.create('bulk_delete', f'{deleted_count} ürün silindi', user_id=user_id)
        
        # WebSocket broadcast
        await broadcast_product_event(EventTypes.PRODUCT_DELETED, {
            "deleted_count": deleted_count,
            "product_ids": request.product_ids
        })
        
        return {
            "success": True,
            "data": {"deleted_count": deleted_count}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/products/export")
async def export_products(current_user: dict = Depends(get_current_user)):
    """Ürünleri CSV formatında dışa aktar"""
    try:
        user_id = current_user['user_id']
        products = Product.get_all(user_id)
        
        # CSV formatında dönüş
        csv_data = "id,sku,title,original_price,selling_price,stock,is_synced_to_shopify\n"
        for p in products:
            csv_data += f'{p["id"]},{p.get("sku", "")},"{p["title"]}",{p.get("original_price", 0)},{p["selling_price"]},{p.get("stock", 0)},{p.get("is_synced_to_shopify", 0)}\n'
        
        return {"success": True, "data": {"csv": csv_data, "count": len(products)}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CSVImportData(BaseModel):
    csv_content: str
    seller_id: Optional[int] = None

@app.post("/api/products/import")
async def import_products(data: CSVImportData, current_user: dict = Depends(get_current_user)):
    """CSV'den ürün içe aktar"""
    try:
        user_id = current_user['user_id']
        import csv
        from io import StringIO
        
        reader = csv.DictReader(StringIO(data.csv_content))
        
        imported_count = 0
        error_count = 0
        
        for row in reader:
            try:
                Product.create(
                    url=row.get('url', ''),
                    title=row.get('title', 'İsimsiz Ürün'),
                    original_price=float(row.get('original_price', 0)),
                    selling_price=float(row.get('selling_price', 0)),
                    stock=int(row.get('stock', 0)),
                    sku=row.get('sku', ''),
                    description=row.get('description', ''),
                    image_url=row.get('image_url', ''),
                    seller_id=data.seller_id,
                    user_id=user_id
                )
                imported_count += 1
            except Exception:
                error_count += 1
        
        ActivityLog.create('import', 
                          f'{imported_count} ürün içe aktarıldı, {error_count} hata', 
                          user_id=user_id)
        
        return {
            "success": True,
            "data": {
                "imported_count": imported_count,
                "error_count": error_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/products/bulk/stock-update")
async def bulk_stock_update(current_user: dict = Depends(get_current_user)):
    """Tüm ürünlerin stok bilgilerini Trendyol'dan güncelle"""
    try:
        user_id = current_user['user_id']
        products = Product.get_all(user_id)
        
        scraper = get_scraper()
        updated_count = 0
        
        for product in products:
            if product.get('url'):
                try:
                    stock_info = scraper.get_product_stock(product['url'])
                    if stock_info:
                        Product.update(product['id'], 
                                       stock=stock_info.get('stock', 0),
                                       original_price=stock_info.get('price', product.get('original_price')),
                                       user_id=user_id)
                        updated_count += 1
                except Exception:
                    pass
        
        ActivityLog.create('bulk_stock_update', 
                          f'{updated_count} ürün stok bilgisi güncellendi', 
                          user_id=user_id)
        
        # WebSocket broadcast
        await broadcast_product_event(EventTypes.PRODUCT_STOCK_CHANGED, {
            "updated_count": updated_count,
            "message": "Toplu stok güncelleme tamamlandı"
        })
        
        return {
            "success": True,
            "data": {"updated_count": updated_count}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== RAPORLAMA VE İSTATİSTİKLER ====================

@app.get("/api/reports/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Dashboard için özet istatistikler"""
    try:
        user_id = current_user['user_id']
        import sqlite3
        from datetime import datetime, timedelta
        
        conn = sqlite3.connect('database/dropship.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Bugün
        today = datetime.now().strftime('%Y-%m-%d')
        # Bu hafta başlangıcı (Pazartesi)
        week_start = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime('%Y-%m-%d')
        # Bu ay başlangıcı
        month_start = datetime.now().replace(day=1).strftime('%Y-%m-%d')
        
        # Toplam ürün sayısı
        cursor.execute("SELECT COUNT(*) as count FROM products WHERE user_id = ?", (user_id,))
        total_products = cursor.fetchone()['count']
        
        # Stokta olan ürünler
        cursor.execute("SELECT COUNT(*) as count FROM products WHERE user_id = ? AND stock > 0", (user_id,))
        in_stock_products = cursor.fetchone()['count']
        
        # Shopify'a yüklenen ürünler
        cursor.execute("SELECT COUNT(*) as count FROM products WHERE user_id = ? AND is_synced_to_shopify = 1", (user_id,))
        synced_products = cursor.fetchone()['count']
        
        # Toplam sipariş sayısı
        cursor.execute("SELECT COUNT(*) as count FROM orders WHERE user_id = ?", (user_id,))
        total_orders = cursor.fetchone()['count']
        
        # Bugünkü siparişler
        cursor.execute("""
            SELECT COUNT(*) as count FROM orders 
            WHERE user_id = ? AND DATE(created_at) = ?
        """, (user_id, today))
        today_orders = cursor.fetchone()['count']
        
        # Bu haftaki siparişler
        cursor.execute("""
            SELECT COUNT(*) as count FROM orders 
            WHERE user_id = ? AND DATE(created_at) >= ?
        """, (user_id, week_start))
        week_orders = cursor.fetchone()['count']
        
        # Bu ayki siparişler
        cursor.execute("""
            SELECT COUNT(*) as count FROM orders 
            WHERE user_id = ? AND DATE(created_at) >= ?
        """, (user_id, month_start))
        month_orders = cursor.fetchone()['count']
        
        # Toplam satış tutarı (TL)
        cursor.execute("SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE user_id = ?", (user_id,))
        total_revenue = cursor.fetchone()['total']
        
        # Bugünkü satış tutarı
        cursor.execute("""
            SELECT COALESCE(SUM(total_price), 0) as total FROM orders 
            WHERE user_id = ? AND DATE(created_at) = ?
        """, (user_id, today))
        today_revenue = cursor.fetchone()['total']
        
        # Bu haftaki satış tutarı
        cursor.execute("""
            SELECT COALESCE(SUM(total_price), 0) as total FROM orders 
            WHERE user_id = ? AND DATE(created_at) >= ?
        """, (user_id, week_start))
        week_revenue = cursor.fetchone()['total']
        
        # Bu ayki satış tutarı
        cursor.execute("""
            SELECT COALESCE(SUM(total_price), 0) as total FROM orders 
            WHERE user_id = ? AND DATE(created_at) >= ?
        """, (user_id, month_start))
        month_revenue = cursor.fetchone()['total']
        
        # Sipariş durumlarına göre dağılım
        cursor.execute("""
            SELECT status, COUNT(*) as count FROM orders 
            WHERE user_id = ? GROUP BY status
        """, (user_id,))
        status_distribution = {row['status']: row['count'] for row in cursor.fetchall()}
        
        # Satıcı sayısı
        cursor.execute("SELECT COUNT(*) as count FROM sellers WHERE user_id = ?", (user_id,))
        total_sellers = cursor.fetchone()['count']
        
        conn.close()
        
        return {
            "success": True,
            "data": {
                "products": {
                    "total": total_products,
                    "in_stock": in_stock_products,
                    "synced_to_shopify": synced_products,
                    "out_of_stock": total_products - in_stock_products
                },
                "orders": {
                    "total": total_orders,
                    "today": today_orders,
                    "this_week": week_orders,
                    "this_month": month_orders,
                    "by_status": status_distribution
                },
                "revenue": {
                    "total": round(total_revenue, 2),
                    "today": round(today_revenue, 2),
                    "this_week": round(week_revenue, 2),
                    "this_month": round(month_revenue, 2)
                },
                "sellers": {
                    "total": total_sellers
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/sales")
async def get_sales_report(
    period: str = "week",
    current_user: dict = Depends(get_current_user)
):
    """Satış raporu - günlük bazda"""
    try:
        user_id = current_user['user_id']
        import sqlite3
        from datetime import datetime, timedelta
        
        conn = sqlite3.connect('database/dropship.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Dönem belirleme
        if period == "week":
            days = 7
        elif period == "month":
            days = 30
        elif period == "year":
            days = 365
        else:
            days = 7
        
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Günlük satış verileri
        cursor.execute("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as order_count,
                COALESCE(SUM(total_price), 0) as revenue
            FROM orders 
            WHERE user_id = ? AND DATE(created_at) >= ?
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """, (user_id, start_date))
        
        daily_sales = []
        for row in cursor.fetchall():
            daily_sales.append({
                "date": row['date'],
                "order_count": row['order_count'],
                "revenue": round(row['revenue'], 2)
            })
        
        conn.close()
        
        return {
            "success": True,
            "data": {
                "period": period,
                "start_date": start_date,
                "daily_sales": daily_sales
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/top-products")
async def get_top_products(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """En çok satan ürünler"""
    try:
        user_id = current_user['user_id']
        import sqlite3
        
        conn = sqlite3.connect('database/dropship.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # En çok sipariş verilen ürünler (order_items tablosu varsa)
        # Şimdilik siparişlerdeki product_title'a göre gruplama yapalım
        cursor.execute("""
            SELECT 
                product_title as title,
                COUNT(*) as order_count,
                COALESCE(SUM(total_price), 0) as total_revenue
            FROM orders 
            WHERE user_id = ? AND product_title IS NOT NULL
            GROUP BY product_title
            ORDER BY order_count DESC
            LIMIT ?
        """, (user_id, limit))
        
        top_products = []
        for row in cursor.fetchall():
            top_products.append({
                "title": row['title'],
                "order_count": row['order_count'],
                "total_revenue": round(row['total_revenue'], 2)
            })
        
        conn.close()
        
        return {
            "success": True,
            "data": top_products
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/profit-analysis")
async def get_profit_analysis(current_user: dict = Depends(get_current_user)):
    """Kar marjı analizi"""
    try:
        user_id = current_user['user_id']
        import sqlite3
        
        conn = sqlite3.connect('database/dropship.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Kar marjı ayarı
        settings = Settings.get('profit_margin', user_id)
        profit_margin = float(settings) if settings else 50.0
        
        # Satılan ürünlerin toplam tutarı ve tahmini kar
        cursor.execute("""
            SELECT 
                COALESCE(SUM(total_price), 0) as total_revenue,
                COUNT(*) as total_orders
            FROM orders 
            WHERE user_id = ?
        """, (user_id,))
        
        result = cursor.fetchone()
        total_revenue = result['total_revenue']
        total_orders = result['total_orders']
        
        # Tahmini maliyet (kar marjına göre)
        estimated_cost = total_revenue / (1 + profit_margin / 100) if profit_margin > 0 else 0
        estimated_profit = total_revenue - estimated_cost
        
        conn.close()
        
        return {
            "success": True,
            "data": {
                "profit_margin_setting": profit_margin,
                "total_revenue": round(total_revenue, 2),
                "estimated_cost": round(estimated_cost, 2),
                "estimated_profit": round(estimated_profit, 2),
                "total_orders": total_orders,
                "average_order_value": round(total_revenue / total_orders, 2) if total_orders > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/activity-log")
async def get_activity_log(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Aktivite logları"""
    try:
        user_id = current_user['user_id']
        logs = ActivityLog.get_recent(user_id, limit)
        return {"success": True, "data": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SHOPIFY MAĞAZALARI ====================

class ShopifyStoreCreate(BaseModel):
    shop_name: str
    access_token: str
    store_name: Optional[str] = None
    is_default: Optional[bool] = False

class ShopifyStoreUpdate(BaseModel):
    shop_name: Optional[str] = None
    access_token: Optional[str] = None
    store_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

@app.get("/api/shopify-stores")
async def get_shopify_stores(current_user: dict = Depends(get_current_user)):
    """Kullanıcının Shopify mağazalarını listele"""
    try:
        user_id = current_user['user_id']
        stores = ShopifyStore.get_all(user_id)
        return {"success": True, "data": stores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/shopify-stores")
async def add_shopify_store(store: ShopifyStoreCreate, current_user: dict = Depends(get_current_user)):
    """Yeni Shopify mağazası ekle"""
    try:
        user_id = current_user['user_id']
        
        # İlk mağaza ise varsayılan yap
        existing = ShopifyStore.get_all(user_id)
        is_default = len(existing) == 0 or store.is_default
        
        store_id = ShopifyStore.create(
            user_id=user_id,
            shop_name=store.shop_name,
            access_token=store.access_token,
            store_name=store.store_name,
            is_default=is_default
        )
        
        ActivityLog.create('store_added', f'Mağaza eklendi: {store.shop_name}', user_id=user_id)
        return {"success": True, "data": {"id": store_id}, "message": "Mağaza eklendi"}
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/shopify-stores/{store_id}")
async def get_shopify_store(store_id: int, current_user: dict = Depends(get_current_user)):
    """Mağaza detayı"""
    try:
        user_id = current_user['user_id']
        store = ShopifyStore.get_by_id(store_id, user_id)
        if not store:
            raise HTTPException(status_code=404, detail="Mağaza bulunamadı")
        return {"success": True, "data": store}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/shopify-stores/{store_id}")
async def update_shopify_store(store_id: int, store: ShopifyStoreUpdate, 
                               current_user: dict = Depends(get_current_user)):
    """Mağaza güncelle"""
    try:
        user_id = current_user['user_id']
        update_data = {k: v for k, v in store.dict().items() if v is not None}
        ShopifyStore.update(store_id, user_id, **update_data)
        return {"success": True, "message": "Mağaza güncellendi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/shopify-stores/{store_id}")
async def delete_shopify_store(store_id: int, current_user: dict = Depends(get_current_user)):
    """Mağaza sil"""
    try:
        user_id = current_user['user_id']
        ShopifyStore.delete(store_id, user_id)
        return {"success": True, "message": "Mağaza silindi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/shopify-stores/{store_id}/set-default")
async def set_default_store(store_id: int, current_user: dict = Depends(get_current_user)):
    """Mağazayı varsayılan yap"""
    try:
        user_id = current_user['user_id']
        ShopifyStore.set_default(store_id, user_id)
        return {"success": True, "message": "Varsayılan mağaza değiştirildi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/shopify-stores/{store_id}/test")
async def test_store_connection(store_id: int, current_user: dict = Depends(get_current_user)):
    """Mağaza bağlantısını test et"""
    try:
        user_id = current_user['user_id']
        store = ShopifyStore.get_by_id(store_id, user_id)
        
        if not store:
            return {"success": False, "error": "Mağaza bulunamadı"}
        
        api = ShopifyAPI(store['shop_name'], store['access_token'])
        result = api.test_connection()
        
        return {"success": result['success'], "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ==================== KARGO TAKİP ====================

class ShipmentCreate(BaseModel):
    order_id: Optional[int] = None
    tracking_number: str
    carrier: str
    carrier_name: Optional[str] = None

class ShipmentUpdate(BaseModel):
    status: Optional[str] = None
    last_status_update: Optional[str] = None
    estimated_delivery: Optional[str] = None

@app.get("/api/carriers")
async def get_carriers(current_user: dict = Depends(get_current_user)):
    """Desteklenen kargo firmalarını listele"""
    try:
        carriers = Shipment.get_carriers()
        return {"success": True, "data": carriers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/shipments")
async def get_shipments(current_user: dict = Depends(get_current_user)):
    """Kullanıcının tüm kargolarını listele"""
    try:
        user_id = current_user['user_id']
        shipments = Shipment.get_all(user_id)
        return {"success": True, "data": shipments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/shipments")
async def create_shipment(data: ShipmentCreate, current_user: dict = Depends(get_current_user)):
    """Yeni kargo takibi oluştur"""
    try:
        user_id = current_user['user_id']
        
        shipment_id = Shipment.create(
            user_id=user_id,
            order_id=data.order_id,
            tracking_number=data.tracking_number,
            carrier=data.carrier,
            carrier_name=data.carrier_name
        )
        
        # Sipariş varsa durumunu güncelle
        if data.order_id:
            Order.update_status(data.order_id, 'shipped', f'Kargo: {data.tracking_number}', user_id)
        
        ActivityLog.create('shipment_created', 
                          f'Kargo oluşturuldu: {data.tracking_number}', 
                          user_id=user_id)
        
        return {"success": True, "data": {"id": shipment_id}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/shipments/{shipment_id}")
async def get_shipment(shipment_id: int, current_user: dict = Depends(get_current_user)):
    """Kargo detayını getir"""
    try:
        user_id = current_user['user_id']
        shipment = Shipment.get_by_id(shipment_id, user_id)
        if not shipment:
            raise HTTPException(status_code=404, detail="Kargo bulunamadı")
        return {"success": True, "data": shipment}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/shipments/{shipment_id}")
async def update_shipment(shipment_id: int, data: ShipmentUpdate, 
                          current_user: dict = Depends(get_current_user)):
    """Kargo bilgisini güncelle"""
    try:
        user_id = current_user['user_id']
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        Shipment.update(shipment_id, user_id, **update_data)
        return {"success": True, "message": "Kargo güncellendi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/shipments/{shipment_id}")
async def delete_shipment(shipment_id: int, current_user: dict = Depends(get_current_user)):
    """Kargo kaydını sil"""
    try:
        user_id = current_user['user_id']
        Shipment.delete(shipment_id, user_id)
        return {"success": True, "message": "Kargo silindi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}/shipment")
async def get_order_shipment(order_id: int, current_user: dict = Depends(get_current_user)):
    """Siparişe ait kargo bilgisini getir"""
    try:
        user_id = current_user['user_id']
        shipment = Shipment.get_by_order(order_id, user_id)
        return {"success": True, "data": shipment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/orders/{order_id}/shipment")
async def add_shipment_to_order(order_id: int, data: ShipmentCreate, 
                                current_user: dict = Depends(get_current_user)):
    """Siparişe kargo ekle"""
    try:
        user_id = current_user['user_id']
        
        # Sipariş var mı kontrol et
        order = Order.get_by_id(order_id, user_id)
        if not order:
            return {"success": False, "error": "Sipariş bulunamadı"}
        
        # Zaten kargo var mı kontrol et
        existing = Shipment.get_by_order(order_id, user_id)
        if existing:
            return {"success": False, "error": "Bu siparişe zaten kargo eklenmiş"}
        
        shipment_id = Shipment.create(
            user_id=user_id,
            order_id=order_id,
            tracking_number=data.tracking_number,
            carrier=data.carrier,
            carrier_name=data.carrier_name
        )
        
        # Sipariş durumunu güncelle
        Order.update_status(order_id, 'shipped', f'Kargo: {data.tracking_number}', user_id)
        
        # WebSocket broadcast
        await broadcast_order_event(EventTypes.ORDER_STATUS_CHANGED, {
            "order_id": order_id,
            "status": "shipped",
            "tracking_number": data.tracking_number
        })
        
        shipment = Shipment.get_by_id(shipment_id, user_id)
        return {"success": True, "data": shipment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AYARLAR ====================

@app.get("/api/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Tüm ayarları al"""
    try:
        user_id = current_user['user_id']
        settings = Settings.get_all(user_id=user_id)
        # Hassas verileri maskele
        if 'shopify_access_token' in settings:
            token = settings['shopify_access_token']
            if token:
                settings['shopify_access_token'] = token[:10] + '***'
        return {"success": True, "data": settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/settings")
async def update_settings(settings: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    """Ayarları güncelle"""
    try:
        user_id = current_user['user_id']
        if settings.shopify_shop_name:
            Settings.set('shopify_shop_name', settings.shopify_shop_name, user_id=user_id)
        if settings.shopify_access_token:
            Settings.set('shopify_access_token', settings.shopify_access_token, user_id=user_id)
        if settings.profit_margin is not None:
            Settings.set('profit_margin', settings.profit_margin, user_id=user_id)
        if settings.currency_buffer is not None:
            Settings.set('currency_buffer', settings.currency_buffer, user_id=user_id)
        if settings.auto_stock_sync is not None:
            Settings.set('auto_stock_sync', settings.auto_stock_sync, user_id=user_id)
        if settings.auto_price_update is not None:
            Settings.set('auto_price_update', settings.auto_price_update, user_id=user_id)
        if settings.hide_out_of_stock is not None:
            Settings.set('hide_out_of_stock', settings.hide_out_of_stock, user_id=user_id)
        if settings.stock_sync_interval is not None:
            Settings.set('stock_sync_interval', settings.stock_sync_interval, user_id=user_id)
        
        ActivityLog.create('settings_updated', 'Ayarlar güncellendi', user_id=user_id)
        return {"success": True, "message": "Ayarlar kaydedildi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/test-shopify")
async def test_shopify_connection(current_user: dict = Depends(get_current_user)):
    """Shopify bağlantısını test et"""
    try:
        user_id = current_user['user_id']
        shop_name = Settings.get('shopify_shop_name', user_id=user_id)
        token = Settings.get('shopify_access_token', user_id=user_id)
        
        if not shop_name or not token:
            return {"success": False, "error": "Shopify ayarları eksik"}
        
        api = ShopifyAPI(shop_name, token)
        result = api.test_connection()
        
        return {"success": result['success'], "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ==================== DOLAR KURU ====================

@app.get("/api/currency-rate")
async def get_currency_rate():
    """Güncel dolar kurunu al"""
    try:
        scraper = get_scraper()
        rate = scraper.get_currency_rate()
        return {"success": True, "data": {"rate": rate, "currency": "USD/TRY"}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== AKTİVİTE LOG ====================

@app.get("/api/activities")
async def get_activities(limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Son aktiviteleri al"""
    try:
        activities = ActivityLog.get_recent(limit, user_id=current_user['user_id'])
        return {"success": True, "data": activities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SİPARİŞ OTOMASYONU ====================

from order_automation import get_order_service, TrendyolAutoPurchaser

class TrendyolCredentials(BaseModel):
    email: str
    password: str

class OrderProcessRequest(BaseModel):
    order_id: int
    trendyol_email: Optional[str] = None
    trendyol_password: Optional[str] = None

@app.get("/api/order-automation/status")
async def get_order_automation_status(current_user: dict = Depends(get_current_user)):
    """Sipariş otomasyon durumu"""
    try:
        service = get_order_service()
        status = service.get_status()
        
        # Kullanıcının Trendyol hesabı kayıtlı mı?
        user_id = current_user['user_id']
        has_credentials = bool(
            Settings.get('trendyol_email', user_id=user_id) and 
            Settings.get('trendyol_password', user_id=user_id)
        )
        
        return {
            "success": True,
            "data": {
                **status,
                "has_trendyol_credentials": has_credentials
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/order-automation/save-trendyol-credentials")
async def save_trendyol_credentials(credentials: TrendyolCredentials, 
                                    current_user: dict = Depends(get_current_user)):
    """Trendyol giriş bilgilerini kaydet"""
    try:
        user_id = current_user['user_id']
        Settings.set('trendyol_email', credentials.email, user_id=user_id)
        Settings.set('trendyol_password', credentials.password, user_id=user_id)
        return {"success": True, "message": "Trendyol bilgileri kaydedildi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/order-automation/test-trendyol-login")
async def test_trendyol_login(credentials: TrendyolCredentials,
                              current_user: dict = Depends(get_current_user)):
    """Trendyol girişini test et"""
    try:
        purchaser = TrendyolAutoPurchaser(headless=True)
        success = purchaser.login(credentials.email, credentials.password)
        purchaser._close_driver()
        
        if success:
            return {"success": True, "message": "Trendyol girişi başarılı"}
        else:
            return {"success": False, "error": "Giriş başarısız. Email veya şifre hatalı."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/orders/{order_id}/process")
async def process_order_to_trendyol(order_id: int, 
                                    background_tasks: BackgroundTasks,
                                    current_user: dict = Depends(get_current_user)):
    """Siparişi Trendyol'da işle"""
    try:
        user_id = current_user['user_id']
        
        # Trendyol bilgilerini al
        email = Settings.get('trendyol_email', user_id=user_id)
        password = Settings.get('trendyol_password', user_id=user_id)
        
        if not email or not password:
            return {"success": False, "error": "Trendyol giriş bilgileri kayıtlı değil"}
        
        # Siparişi kontrol et
        order = Order.get_by_id(order_id, user_id=user_id)
        if not order:
            return {"success": False, "error": "Sipariş bulunamadı"}
        
        # Arka planda işle
        background_tasks.add_task(process_single_order, order_id, email, password, user_id)
        
        # WebSocket broadcast
        await broadcast_order_event(EventTypes.ORDER_UPDATED, {
            "order_id": order_id,
            "status": "processing",
            "message": "Sipariş işleniyor"
        })
        
        return {"success": True, "message": "Sipariş Trendyol'da işleniyor..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_single_order(order_id: int, email: str, password: str, user_id: int):
    """Tek siparişi işle (arka plan görevi)"""
    try:
        # Durumu güncelle
        Order.update_status(order_id, 'processing', 'Trendyol siparişi hazırlanıyor...', user_id=user_id)
        
        purchaser = TrendyolAutoPurchaser(headless=True)
        
        # Giriş yap
        if not purchaser.login(email, password):
            Order.update_status(order_id, 'error', 'Trendyol girişi başarısız', user_id=user_id)
            purchaser._close_driver()
            return
        
        # Siparişi al
        order = Order.get_by_id(order_id, user_id=user_id)
        
        # Her ürünü sepete ekle
        all_added = True
        for item in order.get('order_items', []):
            product = Product.get_by_shopify_id(item.get('product_id'), user_id=user_id)
            
            if product and product.get('trendyol_url'):
                success = purchaser.add_to_cart(
                    product['trendyol_url'],
                    variant_value=item.get('variant_title'),
                    quantity=item.get('quantity', 1)
                )
                if not success:
                    all_added = False
                    logger.warning(f"Ürün sepete eklenemedi: {item.get('title')}")
        
        if not all_added:
            Order.update_status(order_id, 'partial', 'Bazı ürünler sepete eklenemedi', user_id=user_id)
        
        # Checkout'a git
        result = purchaser.checkout(order.get('shipping_address', {}))
        
        if result:
            Order.update_status(
                order_id, 
                'pending_payment', 
                f"Trendyol ödeme bekliyor: {result.get('cart_url', '')}",
                user_id=user_id
            )
            ActivityLog.create(
                'order_processed',
                f"Sipariş #{order.get('shopify_order_number')} Trendyol'a hazırlandı",
                user_id=user_id
            )
        else:
            Order.update_status(order_id, 'error', 'Checkout başarısız', user_id=user_id)
        
        purchaser._close_driver()
        
    except Exception as e:
        logger.error(f"Sipariş işleme hatası: {e}")
        Order.update_status(order_id, 'error', str(e), user_id=user_id)

@app.post("/api/order-automation/start")
async def start_order_automation(current_user: dict = Depends(get_current_user)):
    """Otomatik sipariş işleme servisini başlat"""
    try:
        service = get_order_service()
        service.start()
        return {"success": True, "message": "Otomasyon servisi başlatıldı"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/order-automation/stop")
async def stop_order_automation(current_user: dict = Depends(get_current_user)):
    """Otomatik sipariş işleme servisini durdur"""
    try:
        service = get_order_service()
        service.stop()
        return {"success": True, "message": "Otomasyon servisi durduruldu"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WEB FRONTEND - Static Files Serving
# ============================================================================

# Static files (CSS, JS, images)
if os.path.exists("static"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
    
    @app.get("/")
    async def serve_root():
        """Ana sayfa - Web dashboard"""
        return FileResponse("static/index.html")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA routing - Tüm route'lar index.html'e yönlendirilir"""
        # API route'larını atla
        if full_path.startswith("api/") or full_path.startswith("ws"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Dosya varsa serve et
        file_path = f"static/{full_path}"
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Yoksa index.html'i serve et (SPA routing için)
        return FileResponse("static/index.html")


# Ana çalıştırma
if __name__ == "__main__":
    print("=" * 50)
    print("Dropship Otomasyon API + Web Dashboard")
    print("Web: http://localhost:8000")
    print("API: http://localhost:8000/api")
    print("API Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
