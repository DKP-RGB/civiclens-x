@echo off
setlocal
echo ============================================
echo  CivicLens X - development server
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [error] Node.js was not found on PATH.
  echo         Install Node.js 20 or newer from https://nodejs.org/.
  exit /b 1
)

if not exist "%~dp0frontend\node_modules" (
  echo [error] Dependencies are not installed yet.
  echo         Run setup.bat first.
  exit /b 1
)

echo Starting Vite on http://localhost:5173/
echo Press Ctrl+C to stop.
echo.
pushd "%~dp0frontend"
call npm run dev
popd
endlocal
