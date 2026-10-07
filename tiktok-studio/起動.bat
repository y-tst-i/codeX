@echo off
rem TikTok Motion Studio launcher (double-click to start)
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages for the first time...
  call npm ci
)
echo.
echo Starting TikTok Motion Studio: http://localhost:5180
echo Keep this window open while you use the app. Close it to stop.
echo.
call npm run dev
pause
