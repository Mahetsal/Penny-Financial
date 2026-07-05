@echo off
title "Penny Server & Cloudflare Tunnel Booter"
echo ===================================================
echo     Penny Offline-First Financial Application
echo ===================================================
echo.
echo [System] Running npm install in root folder...
call npm install
echo.
echo [System] Running npm install in frontend folder...
cd frontend
call npm install
cd ..
echo.
echo [System] Starting dev servers and Cloudflare tunnel...
node scratch/start_tunnel.js
pause
