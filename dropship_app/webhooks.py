"""
Shopify Webhook Handler
Shopify'dan gelen webhook isteklerini işler
"""
import hmac
import hashlib
import base64
import json
from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
from datetime import datetime
from models import Order, WebhookLog
from config import SHOPIFY_WEBHOOK_SECRET
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def verify_webhook(data: bytes, hmac_header: str, secret: str) -> bool:
    """
    Shopify webhook HMAC doğrulaması
    
    Args:
        data: Request body (bytes)
        hmac_header: X-Shopify-Hmac-SHA256 header değeri
        secret: Shopify webhook secret
    
    Returns:
        bool: Doğrulama başarılı mı?
    """
    try:
        # HMAC hesapla
        computed_hmac = base64.b64encode(
            hmac.new(
                secret.encode('utf-8'),
                data,
                hashlib.sha256
            ).digest()
        ).decode('utf-8')
        
        # Karşılaştır (timing attack'a karşı hmac.compare_digest kullan)
        return hmac.compare_digest(computed_hmac, hmac_header)
    except Exception as e:
        logger.error(f"HMAC verification error: {e}")
        return False


@router.post("/shopify/orders/create")
async def shopify_order_created(
    request: Request,
    x_shopify_hmac_sha256: Optional[str] = Header(None),
    x_shopify_topic: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None)
):
    """
    Shopify'dan yeni sipariş webhook'u
    
    Headers:
        X-Shopify-Hmac-SHA256: HMAC imzası
        X-Shopify-Topic: orders/create
        X-Shopify-Shop-Domain: myshop.myshopify.com
    """
    try:
        # Request body'yi oku
        body = await request.body()
        
        # HMAC doğrulama
        if SHOPIFY_WEBHOOK_SECRET:
            if not x_shopify_hmac_sha256:
                logger.warning("Missing HMAC header")
                raise HTTPException(status_code=401, detail="Missing HMAC header")
            
            if not verify_webhook(body, x_shopify_hmac_sha256, SHOPIFY_WEBHOOK_SECRET):
                logger.warning("Invalid HMAC signature")
                raise HTTPException(status_code=401, detail="Invalid HMAC signature")
        
        # JSON parse
        order_data = json.loads(body)
        
        # Webhook log kaydet
        webhook_log_id = WebhookLog.create(
            topic=x_shopify_topic or "orders/create",
            shop_domain=x_shopify_shop_domain or "unknown",
            payload=order_data,
            status="received"
        )
        
        # Siparişi işle
        result = await process_order_webhook(order_data)
        
        # Log güncelle
        status = "processed" if result.get("success") else "failed"
        WebhookLog.update_status(webhook_log_id, status, result)
        
        logger.info(f"Webhook processed: Order #{order_data.get('order_number')}")
        
        return {
            "success": True,
            "message": "Webhook processed",
            "order_id": result.get("order_id")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_order_webhook(order_data: dict) -> dict:
    """
    Webhook'tan gelen sipariş verisini işle
    
    Args:
        order_data: Shopify order JSON
    
    Returns:
        dict: İşlem sonucu
    """
    try:
        # Müşteri bilgilerini çıkar
        customer = order_data.get('customer', {})
        shipping_address = order_data.get('shipping_address', {})
        
        # Siparişi veritabanına kaydet
        order_id = Order.create(
            user_id=1,  # TODO: Webhook'tan kullanıcı ID belirle
            shopify_order_id=str(order_data.get('id')),
            order_number=order_data.get('order_number', ''),
            customer_name=f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
            customer_email=customer.get('email', ''),
            customer_phone=shipping_address.get('phone', ''),
            shipping_address=f"{shipping_address.get('address1', '')} {shipping_address.get('city', '')} {shipping_address.get('country', '')}".strip(),
            total_price=float(order_data.get('total_price', 0)),
            status='pending',
            created_at=order_data.get('created_at')
        )
        
        # Mobil bildirim gönder
        await send_order_notification(
            order_id=order_id,
            order_number=order_data.get('order_number', ''),
            customer_name=f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
        )
        
        return {
            "success": True,
            "order_id": order_id
        }
        
    except Exception as e:
        logger.error(f"Order processing error: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def send_order_notification(order_id: int, order_number: str, customer_name: str):
    """
    Yeni sipariş için mobile notification gönder
    
    Args:
        order_id: Order ID
        order_number: Shopify order number
        customer_name: Customer name
    """
    # TODO: Expo Push Notification entegrasyonu
    # Push token'ları al ve bildirim gönder
    logger.info(f"Notification sent for order #{order_number}")


@router.get("/shopify/test")
async def test_webhook():
    """Test endpoint - webhook bağlantısını kontrol et"""
    return {
        "success": True,
        "message": "Webhook endpoint is active",
        "timestamp": datetime.now().isoformat()
    }


@router.get("/logs")
async def get_webhook_logs(limit: int = 50):
    """
    Webhook loglarını getir
    
    Args:
        limit: Maksimum log sayısı (default: 50)
    """
    try:
        logs = WebhookLog.get_all(limit)
        
        # Parse JSON fields
        for log in logs:
            if log.get('payload'):
                try:
                    log['payload'] = json.loads(log['payload'])
                except:
                    pass
            if log.get('response'):
                try:
                    log['response'] = json.loads(log['response'])
                except:
                    pass
        
        return {
            "success": True,
            "data": logs,
            "count": len(logs)
        }
    except Exception as e:
        logger.error(f"Error fetching webhook logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/logs/{log_id}")
async def delete_webhook_log(log_id: int):
    """
    Webhook log'u sil
    
    Args:
        log_id: Log ID
    """
    try:
        # Log var mı kontrol et
        log = WebhookLog.get_by_id(log_id)
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        
        # Sil
        WebhookLog.delete(log_id)
        
        return {
            "success": True,
            "message": "Log deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting webhook log: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logs/clear")
async def clear_webhook_logs():
    """Tüm webhook loglarını temizle"""
    try:
        WebhookLog.clear_all()
        
        return {
            "success": True,
            "message": "All webhook logs cleared"
        }
    except Exception as e:
        logger.error(f"Error clearing webhook logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
