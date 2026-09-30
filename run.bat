@echo off
echo ========================================================
echo        Starting BizManager Business Management System
echo ========================================================
echo.
echo Starting backend server on http://localhost:5000 ...
echo Both API and Frontend UI are served from http://localhost:5000
echo.
start http://localhost:5000
node backend/server.js
pause
