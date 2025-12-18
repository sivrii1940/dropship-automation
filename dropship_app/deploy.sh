#!/bin/bash
# DigitalOcean Manual Deploy Script

echo "🚀 Dropzy App - Manuel Deploy"
echo "=============================="
echo ""
echo "DigitalOcean Console'dan çalıştırılacak komutlar:"
echo ""
echo "# 1. Static dosyaları kopyala"
echo "mkdir -p static/assets"
echo ""
echo "# 2. index.html oluştur"
cat > static/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Dropzy - Shopify ve Trendyol için otomatik dropshipping yönetimi" />
    <title>Dropzy - Dropshipping Yönetim Platformu</title>
    <script type="module" crossorigin src="/assets/index-BO63zKJO.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-Ba-8ieX6.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
HTMLEOF

echo "# 3. App'i yeniden başlat"
echo "# DigitalOcean Dashboard > App > Settings > Restart"
