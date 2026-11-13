@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\electron" (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 goto fail
)

call npm start
exit /b 0

:fail
echo.
echo Installation failed. Check Node.js and your internet connection.
pause
exit /b 1
