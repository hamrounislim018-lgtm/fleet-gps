@echo off
title Fleet Management System
color 0A

echo.
echo  ========================================
echo   Fleet Management System - Starting...
echo  ========================================
echo.

:: Start Backend
echo [1/2] Starting Backend API...
start "Fleet Backend" cmd /k "cd /d %~dp0backend && node src/server.js"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [2/2] Starting Frontend...
start "Fleet Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait for frontend to be ready
timeout /t 5 /nobreak >nul

:: Open browser
echo.
echo  Opening browser...
start http://localhost:5173

echo.
echo  ========================================
echo   System is running!
echo   URL: http://localhost:5173
echo   Login: admin@fleet.com
echo   Pass:  Admin@123456
echo  ========================================
echo.
echo  Close the two black windows to stop the system.
echo.
pause
