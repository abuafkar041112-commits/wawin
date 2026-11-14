@echo off
REM Dobel-klik untuk mengganti password dashboard.
cd /d "%~dp0"
node ..\tools\setup_login.mjs .env.local --reset
echo.
echo Tutup jendela "Bot Alert - Dashboard" dan "Bot Alert - Worker" jika masih terbuka,
echo lalu dobel-klik jalankan-bot.bat lagi supaya password baru terbaca.
pause
