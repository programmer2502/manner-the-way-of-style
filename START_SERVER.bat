@echo off
title Manner - Backend Server
color 0A
echo.
echo  ============================================
echo    MANNER - The Way of Style
echo    Starting Backend Server...
echo  ============================================
echo.

cd /d "%~dp0backend"

echo  Checking dependencies...
if not exist node_modules (
    echo  Installing packages (first run - please wait)...
    cmd /c "npm config set registry http://registry.npmjs.org/ && npm install --no-audit"
    echo.
)

echo  Starting server on http://localhost:3001
echo.
echo  Visit:
echo    Storefront:  http://localhost:3001
echo    Admin Panel: http://localhost:3001/admin
echo    API Docs:    http://localhost:3001/api
echo.
echo  Admin Login:
echo    Email:    admin@manner.com
echo    Password: manner2025
echo.
echo  Press Ctrl+C to stop the server.
echo  ============================================
echo.

node server.js

pause
