@echo off
REM Dobel-klik untuk menjalankan dashboard + worker di Windows.
cd /d "%~dp0"
if not exist node_modules (
  echo Menginstal paket, tunggu sebentar...
  call npm install || goto :err
)
if not exist .next\BUILD_ID (
  echo Build pertama kali...
  call npm run build || goto :err
)
start "Bot Alert - Dashboard" cmd /k npm start
start "Bot Alert - Worker" cmd /k npm run worker
timeout /t 6 /nobreak >nul
start "" http://localhost:3000
exit /b 0
:err
echo Gagal. Baca pesan error di atas.
pause
