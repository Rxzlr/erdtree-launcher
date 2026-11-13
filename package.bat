@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\electron" (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 goto fail
)

call npm run package:win
if errorlevel 1 goto fail

echo.
echo Done. The installer is inside the release folder.
pause
exit /b 0

:fail
echo.
echo Build failed. Read the message above.
pause
exit /b 1
