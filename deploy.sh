#!/bin/bash

# Production Deployment Script
# Bu script'i çalıştırarak production'a deploy edebilirsin

echo "🚀 Production Deployment Script"
echo "================================"
echo ""

# 1. Git durumunu kontrol et
echo "📋 Git durumu kontrol ediliyor..."
if [ -d ".git" ]; then
    echo "✅ Git repository mevcut"
else
    echo "❌ Git repository bulunamadı. Önce 'git init' çalıştır."
    exit 1
fi

# 2. Değişiklikleri kontrol et
echo ""
echo "📝 Değişiklikler kontrol ediliyor..."
git status --short

# 3. Commit yap
echo ""
read -p "Commit mesajı gir: " commit_message
if [ -z "$commit_message" ]; then
    commit_message="Production deployment $(date +%Y-%m-%d)"
fi

echo "💾 Değişiklikler commit ediliyor..."
git add .
git commit -m "$commit_message"

# 4. Remote kontrol et
echo ""
echo "🔗 Remote repository kontrol ediliyor..."
if git remote | grep -q 'origin'; then
    echo "✅ Remote 'origin' mevcut"
    git remote -v
else
    echo "❌ Remote 'origin' bulunamadı"
    read -p "GitHub repository URL gir (örn: https://github.com/user/repo.git): " repo_url
    git remote add origin "$repo_url"
    echo "✅ Remote eklendi"
fi

# 5. Push et
echo ""
echo "📤 GitHub'a push ediliyor..."
git push origin main

# 6. Sonuç
echo ""
echo "================================"
echo "✅ DEPLOYMENT TAMAMLANDI!"
echo ""
echo "📌 Sonraki Adımlar:"
echo "1. DigitalOcean Dashboard'a git"
echo "2. Apps sekmesinde deployment'ı izle"
echo "3. 5-10 dakika sonra canlıda olacak"
echo ""
echo "🌐 URL: https://your-app-name.ondigitalocean.app"
echo ""
