"""
WebSocket Manager - Real-Time Senkronizasyon
Tüm bağlı istemcilere değişiklikleri broadcast eder
"""
from fastapi import WebSocket
from typing import Dict, List, Set
import json
import asyncio
from datetime import datetime


class ConnectionManager:
    """WebSocket bağlantılarını yöneten manager"""
    
    def __init__(self):
        # Aktif bağlantılar: user_id -> WebSocket list
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Tüm bağlantılar (user_id olmadan)
        self.all_connections: Set[WebSocket] = set()
        
    async def connect(self, websocket: WebSocket, user_id: str = None):
        """Yeni WebSocket bağlantısı kabul et"""
        await websocket.accept()
        
        # Tüm bağlantılara ekle
        self.all_connections.add(websocket)
        
        # User ID varsa kullanıcıya özel bağlantılara ekle
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)
            
        print(f"✅ WebSocket connected. Total: {len(self.all_connections)}")
        
    def disconnect(self, websocket: WebSocket, user_id: str = None):
        """WebSocket bağlantısını kapat"""
        # Tüm bağlantılardan çıkar
        self.all_connections.discard(websocket)
        
        # User ID varsa kullanıcıya özel bağlantılardan çıkar
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            # Eğer kullanıcının hiç bağlantısı kalmadıysa sil
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
        print(f"❌ WebSocket disconnected. Total: {len(self.all_connections)}")
        
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Belirli bir bağlantıya mesaj gönder"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
            
    async def send_to_user(self, message: dict, user_id: str):
        """Belirli bir kullanıcının tüm cihazlarına mesaj gönder"""
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending to user {user_id}: {e}")
                    disconnected.add(connection)
            
            # Bağlantısı kopanları temizle
            for conn in disconnected:
                self.disconnect(conn, user_id)
                
    async def broadcast(self, message: dict, exclude: WebSocket = None):
        """Tüm bağlantılara mesaj gönder (broadcast)"""
        disconnected = set()
        
        for connection in self.all_connections:
            if connection == exclude:
                continue
                
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting: {e}")
                disconnected.add(connection)
        
        # Bağlantısı kopanları temizle
        for conn in disconnected:
            self.disconnect(conn)
            
    async def broadcast_event(self, event_type: str, data: dict, exclude: WebSocket = None):
        """Olay broadcast et"""
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message, exclude)
        
    def get_connection_count(self) -> int:
        """Toplam bağlantı sayısı"""
        return len(self.all_connections)
        
    def get_user_count(self) -> int:
        """Bağlı kullanıcı sayısı"""
        return len(self.active_connections)


# Global manager instance
manager = ConnectionManager()


# Event Types
class EventTypes:
    """WebSocket event tipleri"""
    
    # Ürün events
    PRODUCT_ADDED = "product_added"
    PRODUCT_UPDATED = "product_updated"
    PRODUCT_DELETED = "product_deleted"
    PRODUCT_STOCK_CHANGED = "product_stock_changed"
    PRODUCT_PRICE_CHANGED = "product_price_changed"
    PRODUCT_SYNCED = "product_synced"
    
    # Satıcı events
    SELLER_ADDED = "seller_added"
    SELLER_UPDATED = "seller_updated"
    SELLER_DELETED = "seller_deleted"
    SELLER_PRODUCTS_FETCHED = "seller_products_fetched"
    
    # Sipariş events
    ORDER_CREATED = "order_created"
    ORDER_UPDATED = "order_updated"
    ORDER_STATUS_CHANGED = "order_status_changed"
    ORDER_PROCESSED = "order_processed"
    
    # Stok events
    STOCK_SYNC_STARTED = "stock_sync_started"
    STOCK_SYNC_COMPLETED = "stock_sync_completed"
    STOCK_LOW = "stock_low"
    STOCK_OUT = "stock_out"
    
    # Ayar events
    SETTINGS_UPDATED = "settings_updated"
    
    # Sistem events
    SYSTEM_NOTIFICATION = "system_notification"
    ERROR = "error"
    SUCCESS = "success"


async def broadcast_product_event(event_type: str, product_data: dict):
    """Ürün event'i broadcast et"""
    await manager.broadcast_event(event_type, product_data)


async def broadcast_seller_event(event_type: str, seller_data: dict):
    """Satıcı event'i broadcast et"""
    await manager.broadcast_event(event_type, seller_data)


async def broadcast_order_event(event_type: str, order_data: dict):
    """Sipariş event'i broadcast et"""
    await manager.broadcast_event(event_type, order_data)


async def broadcast_notification(message: str, type: str = "info"):
    """Genel bildirim gönder"""
    await manager.broadcast_event(
        EventTypes.SYSTEM_NOTIFICATION,
        {
            "message": message,
            "notification_type": type
        }
    )
