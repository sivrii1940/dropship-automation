# 🔒 Güvenlik ve Erişim Yönetimi

## Kullanıcı Rolleri

### 1. Normal Kullanıcı (Default)
- Kendi ürünlerini görebilir/düzenleyebilir
- Kendi siparişlerini görebilir
- Kendi ayarlarını değiştirebilir
- Başka kullanıcıların verilerini göremez

### 2. Admin Kullanıcı (Opsiyonel)
- Tüm kullanıcıları görebilir
- Kullanıcı ekleyebilir/silebilir
- Sistem ayarlarını değiştirebilir
- Tüm kullanıcıların verilerini görebilir

## Güvenlik Özellikleri

### 1. Şifre Güvenliği
```python
# Şifreler bcrypt ile hashlenir
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Şifre minimum 6 karakter
# Önerilen: Büyük harf, küçük harf, rakam, özel karakter
```

### 2. JWT Token
```python
# Her istekte token kontrol edilir
@app.get("/api/products")
async def get_products(current_user: dict = Depends(get_current_user)):
    # current_user otomatik gelir, token geçersizse 401 döner
    user_id = current_user['user_id']
    # ...
```

### 3. Rate Limiting (Opsiyonel)
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/auth/login")
@limiter.limit("5/minute")  # Dakikada max 5 deneme
async def login(request: Request, data: UserLogin):
    # ...
```

### 4. CORS Ayarları
```python
# Sadece izin verilen domain'lerden istek kabul et
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "https://your-app.ondigitalocean.app",
    "https://yourdomain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Kullanıcı İzolasyonu

### Database Level
Her tablo `user_id` kolonu içerir:

```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT,
    price REAL,
    -- ...
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Kullanıcı sadece kendi kayıtlarını görebilir
SELECT * FROM products WHERE user_id = ?;
```

### API Level
Her endpoint kullanıcı kontrolü yapar:

```python
@app.get("/api/products")
async def get_products(current_user: dict = Depends(get_current_user)):
    user_id = current_user['user_id']
    # Sadece bu kullanıcının ürünleri
    products = Product.get_all(user_id)
    return {"success": True, "data": products}
```

### WebSocket Level
WebSocket mesajları da kullanıcıya özel:

```python
# Kullanıcı bazlı broadcast
await manager.send_to_user(user_id, {
    "type": "product_added",
    "data": product_data
})

# Tüm kullanıcılara değil, sadece ilgili kullanıcıya gönderir
```

## Admin Panel (Opsiyonel)

### Admin Kullanıcı Oluşturma

```python
# İlk admin kullanıcıyı manuel oluştur
import sqlite3
import bcrypt

conn = sqlite3.connect('database/dropship.db')
cursor = conn.cursor()

# Şifreyi hashle
password = "admin123"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Admin kullanıcı ekle
cursor.execute("""
    INSERT INTO users (email, password, name, role, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
""", ('admin@yourdomain.com', hashed.decode('utf-8'), 'Admin User', 'admin'))

conn.commit()
conn.close()
```

### Admin Endpoint'leri

```python
def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Admin kontrolü"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekli")
    return current_user

@app.get("/api/admin/users")
async def list_all_users(admin: dict = Depends(get_admin_user)):
    """Tüm kullanıcıları listele (sadece admin)"""
    users = User.get_all()
    return {"success": True, "data": users}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, admin: dict = Depends(get_admin_user)):
    """Kullanıcı sil (sadece admin)"""
    User.delete(user_id)
    return {"success": True, "message": "Kullanıcı silindi"}

@app.get("/api/admin/stats")
async def get_system_stats(admin: dict = Depends(get_admin_user)):
    """Sistem istatistikleri (sadece admin)"""
    return {
        "success": True,
        "data": {
            "total_users": User.count(),
            "total_products": Product.count_all(),
            "total_orders": Order.count_all(),
            "active_users_today": User.count_active_today()
        }
    }
```

## Veri Silme ve GDPR

### Kullanıcı Hesabını Silme

```python
@app.delete("/api/user/account")
async def delete_my_account(current_user: dict = Depends(get_current_user)):
    """Kullanıcı kendi hesabını siler"""
    user_id = current_user['user_id']
    
    # Kullanıcıya ait tüm verileri sil
    Product.delete_all_by_user(user_id)
    Order.delete_all_by_user(user_id)
    Seller.delete_all_by_user(user_id)
    Settings.delete_all_by_user(user_id)
    User.delete(user_id)
    
    return {"success": True, "message": "Hesabınız ve tüm verileriniz silindi"}
```

### Veri İndirme (GDPR)

```python
@app.get("/api/user/export")
async def export_my_data(current_user: dict = Depends(get_current_user)):
    """Kullanıcı verilerini JSON olarak indir"""
    user_id = current_user['user_id']
    
    data = {
        "user": User.get_by_id(user_id),
        "products": Product.get_all(user_id),
        "orders": Order.get_all(user_id),
        "sellers": Seller.get_all(user_id),
        "settings": Settings.get_all(user_id)
    }
    
    return {"success": True, "data": data}
```

## Güvenlik Best Practices

### 1. Environment Variables
```bash
# Asla hardcode etme!
# ❌ KÖTÜ
JWT_SECRET = "my-secret-key"

# ✅ İYİ
JWT_SECRET = os.getenv("JWT_SECRET_KEY")
```

### 2. SQL Injection Koruması
```python
# Parametreli sorgular kullan
# ❌ KÖTÜ
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ İYİ
cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
```

### 3. HTTPS Zorunlu
```python
# Production'da HTTP kabul etme
if os.getenv("ENVIRONMENT") == "production":
    @app.middleware("http")
    async def redirect_to_https(request, call_next):
        if request.url.scheme == "http":
            url = request.url.replace(scheme="https")
            return RedirectResponse(url)
        return await call_next(request)
```

### 4. Session Timeout
```python
# Token'lara expiration ekle
JWT_EXPIRE_HOURS = 24

def create_token(user_id: int):
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    token = jwt.encode({
        "user_id": user_id,
        "exp": expire
    }, JWT_SECRET, algorithm="HS256")
    return token
```

### 5. Input Validation
```python
from pydantic import BaseModel, EmailStr, validator

class UserRegister(BaseModel):
    email: EmailStr  # Email formatı otomatik kontrol
    password: str
    name: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Şifre en az 8 karakter olmalı')
        if not any(c.isupper() for c in v):
            raise ValueError('Şifre en az 1 büyük harf içermeli')
        if not any(c.isdigit() for c in v):
            raise ValueError('Şifre en az 1 rakam içermeli')
        return v
```

## Monitoring ve Logging

### 1. Başarısız Login Denemeleri
```python
failed_login_attempts = {}  # IP: count

@app.post("/api/auth/login")
async def login(request: Request, data: UserLogin):
    client_ip = request.client.host
    
    # Çok fazla başarısız deneme
    if failed_login_attempts.get(client_ip, 0) > 5:
        raise HTTPException(status_code=429, detail="Çok fazla başarısız deneme. 1 saat bekleyin.")
    
    user = User.authenticate(data.email, data.password)
    if not user:
        failed_login_attempts[client_ip] = failed_login_attempts.get(client_ip, 0) + 1
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
    
    # Başarılı login, counter'ı sıfırla
    failed_login_attempts[client_ip] = 0
    
    token = User.create_session(user['id'])
    return {"success": True, "token": token}
```

### 2. Aktivite Loglama
```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {duration:.2f}s")
    
    return response
```

### 3. Error Tracking (Sentry)
```python
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=1.0,
    environment=os.getenv("ENVIRONMENT", "development")
)
```

## Yedekleme Stratejisi

### 1. Otomatik Database Backup
DigitalOcean:
- Günlük otomatik backup
- 7 gün saklanır
- Tek tıkla restore

### 2. Manuel Backup Script
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# PostgreSQL dump
pg_dump $DATABASE_URL > $BACKUP_DIR/db_backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Upload to S3 (opsiyonel)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-bucket/backups/

# Keep only last 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete
```

---

## ✅ Güvenlik Kontrol Listesi

### Deployment Öncesi
- [ ] JWT secret güçlü ve random
- [ ] Database şifreleri güvenli
- [ ] HTTPS aktif
- [ ] CORS doğru ayarlanmış
- [ ] Rate limiting aktif
- [ ] Input validation var
- [ ] SQL injection koruması var
- [ ] XSS koruması var
- [ ] CSRF koruması var (gerekirse)

### Deployment Sonrası
- [ ] Güvenlik taraması yap
- [ ] Penetrasyon testi yap
- [ ] Log monitoring aktif
- [ ] Alert sistemi kurulu
- [ ] Backup aktif
- [ ] Disaster recovery planı var
- [ ] GDPR compliance kontrol et

---

**Güvenli kodlama!** 🔒
