@echo off
chcp 65001 >nul
title Dropship Otomasyon Sistemi - Masaustu Uygulamasi

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          DROPSHIP OTOMASYON SISTEMI v1.0                   ║
echo ║          Trendyol → Shopify Entegrasyonu                   ║
echo ║             MASAUSTU UYGULAMASI                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Python kontrolu
python --version >nul 2>&1
if errorlevel 1 (
    echo [HATA] Python bulunamadi! Lutfen Python 3.11+ yukleyin.
    echo Indirme linki: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Sanal ortam kontrolu ve olusturma
if not exist "venv" (
    echo [INFO] Sanal ortam olusturuluyor...
    python -m venv venv
)

:: Sanal ortami aktifle
echo [INFO] Sanal ortam aktifleştiriliyor...
call venv\Scripts\activate.bat

:: Bagimliliklari yukle
echo [INFO] Bagimliliklar kontrol ediliyor...
pip install -r requirements.txt --quiet

:: Veritabanini baslat
echo [INFO] Veritabani hazirlaniyor...
python -c "from models import init_database; init_database()"

:: Uygulamayi baslat
echo.
echo [INFO] Masaustu uygulamasi baslatiliyor...
echo.

python main.py

pause
