@echo off
rem TikTok Motion Studio updater (double-click to get the latest version)
rem Your settings, API keys, ideas and audio are stored in the browser and are kept.
cd /d "%~dp0"
echo Downloading the latest version...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $url='https://codeload.github.com/y-tst-i/codex/zip/refs/heads/claude/tiktok-motion-graphics-tool-20kv97'; $zip=Join-Path $env:TEMP 'tms-update.zip'; $dir=Join-Path $env:TEMP 'tms-update'; Invoke-WebRequest $url -OutFile $zip -UseBasicParsing; if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }; Expand-Archive $zip $dir -Force; $src = Join-Path (Get-ChildItem $dir | Select-Object -First 1).FullName 'tiktok-studio'; Get-ChildItem $src -Exclude '*.bat' | Copy-Item -Destination . -Recurse -Force; Remove-Item $zip, $dir -Recurse -Force"
if errorlevel 1 (
  echo.
  echo Update failed. Check your internet connection and try again.
  pause
  exit /b 1
)
echo Updating packages...
call npm install --no-audit --no-fund
echo.
echo Done! If the app is open, press F5 in the browser.
echo If the app is not running, double-click the start file.
pause
