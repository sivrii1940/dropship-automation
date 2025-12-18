@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════╗
echo ║   🚀 DROPZY - OTOMATIK DEPLOY             ║
echo ╚════════════════════════════════════════════╝
echo.

REM GitHub Token kontrolü
set /p TOKEN="GitHub Personal Access Token'inizi girin (ghp_xxx...): "
if "%TOKEN%"=="" (
    echo ❌ Token gerekli!
    echo.
    echo Token oluşturmak için: https://github.com/settings/tokens/new
    echo Scope: repo (tümü)
    pause
    exit /b 1
)

echo.
echo 📝 Remote URL güncelleniyor...
git remote set-url origin https://%TOKEN%@github.com/sivrii1940/dropship-automation.git

echo.
echo 📤 GitHub'a push ediliyor...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ Push başarısız!
    echo.
    echo Manuel çözüm:
    echo 1. https://cloud.digitalocean.com/apps
    echo 2. Console'da: git pull origin main
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════╗
echo ║   ✅ DEPLOY BAŞARILI!                     ║
echo ╚════════════════════════════════════════════╝
echo.
echo DigitalOcean otomatik deploy yapacak (5-10 dk)
echo.
echo Test için: https://dropzy.app
echo.
pause
