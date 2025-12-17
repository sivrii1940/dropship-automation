"""
PostgreSQL Database Configuration for Production
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Environment'tan database URL al
DATABASE_URL = os.getenv("DATABASE_URL")

# Eğer DATABASE_URL yoksa SQLite kullan (development)
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./database/dropship.db"
    print("⚠️  Using SQLite (Development mode)")
else:
    print(f"✅ Using PostgreSQL (Production mode)")
    # PostgreSQL URL düzeltmesi (DigitalOcean postgres:// kullanır)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Engine oluştur
if DATABASE_URL.startswith("sqlite"):
    # SQLite için
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL için
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,  # Connection pooling (production)
        pool_pre_ping=True,  # Connection health check
        echo=False  # SQL query logging (False in production)
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
