@echo off
REM Production Deployment Script for Windows
REM Bu script'i çalıştırarak production'a deploy edebilirsin

echo ==============================
echo 🚀 Production Deployment
echo ==============================
echo.

REM 1. Git durumunu kontrol et
echo 📋 Git durumu kontrol ediliyor...
if exist .git (
    echo ✅ Git repository mevcut
) else (
    echo ❌ Git repository bulunamadı. Önce 'git init' çalıştır.
    pause
    exit /b 1
)

REM 2. Değişiklikleri göster
echo.
echo 📝 Değişiklikler:
git status --short

REM 3. Commit yap
echo.
set /p commit_message="Commit mesajı gir (boş bırakırsan otomatik): "
if "%commit_message%"=="" (
    set commit_message=Production deployment %date% %time%
)

echo 💾 Değişiklikler commit ediliyor...
git add .
git commit -m "%commit_message%"

REM 4. Remote kontrol et
echo.
echo 🔗 Remote repository kontrol ediliyor...
git remote -v | findstr origin > nul
if %errorlevel% equ 0 (
    echo ✅ Remote 'origin' mevcut
    git remote -v
) else (
    echo ❌ Remote 'origin' bulunamadı
    set /p repo_url="GitHub repository URL gir: "
    git remote add origin %repo_url%
    echo ✅ Remote eklendi
)

REM 5. Branch kontrol et
echo.
echo 🔀 Branch kontrol ediliyor...
git branch -M main

REM 6. Push et
echo.
echo 📤 GitHub'a push ediliyor...
git push -u origin main

REM 7. Sonuç
echo.
echo ==============================
echo ✅ DEPLOYMENT TAMAMLANDI!
echo ==============================
echo.
echo 📌 Sonraki Adımlar:
echo 1. DigitalOcean Dashboard'a git: https://cloud.digitalocean.com/apps
echo 2. Apps sekmesinde deployment'ı izle
echo 3. 5-10 dakika sonra canlıda olacak
echo.
echo 🌐 URL: https://your-app-name.ondigitalocean.app
echo.
echo ⚡ WebSocket: wss://your-app-name.ondigitalocean.app/ws
echo.
pause
