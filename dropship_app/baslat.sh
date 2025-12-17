#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          DROPSHIP OTOMASYON SISTEMI v1.0                   ║"
echo "║          Trendyol → Shopify Entegrasyonu                   ║"
echo "║             MASAUSTU UYGULAMASI                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

# Python kontrolu
if ! command -v python3 &> /dev/null; then
    echo "[HATA] Python3 bulunamadi! Lutfen Python 3.11+ yukleyin."
    exit 1
fi

# Sanal ortam kontrolu
if [ ! -d "venv" ]; then
    echo "[INFO] Sanal ortam olusturuluyor..."
    python3 -m venv venv
fi

# Sanal ortami aktifle
echo "[INFO] Sanal ortam aktifleştiriliyor..."
source venv/bin/activate

# Bagimliliklari yukle
echo "[INFO] Bagimliliklar kontrol ediliyor..."
pip install -r requirements.txt --quiet

# Veritabanini baslat
echo "[INFO] Veritabani hazirlaniyor..."
python -c "from models import init_database; init_database()"

# Uygulamayi baslat
echo ""
echo "[INFO] Masaustu uygulamasi baslatiliyor..."
echo ""

python main.py
