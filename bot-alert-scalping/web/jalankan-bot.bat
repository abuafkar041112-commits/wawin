@echo off
REM Dobel-klik untuk menjalankan dashboard + worker di Windows.
cd /d "%~dp0"
echo === Bot Alert Scalping ===
echo Folder: %CD%

REM 1. Bot lama masih jalan di port 3000?
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if not errorlevel 1 (
  echo.
  echo Port 3000 masih dipakai, kemungkinan bot lama masih jalan.
  choice /m "Hentikan proses lama itu sekarang"
  if errorlevel 2 goto :portbusy
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do taskkill /PID %%p /T /F >nul 2>&1
  timeout /t 2 /nobreak >nul
)

REM 2. Paket dan build
if not exist node_modules (
  echo Menginstal paket, tunggu sebentar...
  call npm install || goto :err
)
if not exist .next\BUILD_ID (
  echo Build pertama kali...
  call npm run build || goto :err
)

REM 3. Password dashboard dan SESSION_SECRET
node ..\tools\setup_login.mjs .env.local || goto :err

REM 4. Jalankan
start "Bot Alert - Dashboard" cmd /k npm start
start "Bot Alert - Worker" cmd /k npm run worker
timeout /t 6 /nobreak >nul
start "" http://localhost:3000
exit /b 0

:portbusy
echo Tutup dulu jendela bot lama, lalu jalankan file ini lagi.
pause
exit /b 1
:err
echo.
echo Gagal. Baca pesan di atas, atau kirim screenshot jendela ini.
pause
exit /b 1
