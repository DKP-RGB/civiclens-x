@echo off
setlocal
echo ============================================
echo  CivicLens X - first-time setup (frontend)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [error] Node.js was not found on PATH.
  echo         Install Node.js 20 or newer from https://nodejs.org/ and run this again.
  exit /b 1
)

for /f "delims=" %%v in ('node --version') do set NODE_VERSION=%%v
echo [ok] Node %NODE_VERSION%

echo.
echo Installing frontend dependencies...
pushd "%~dp0frontend"
call npm install
if errorlevel 1 (
  echo [error] npm install failed.
  popd
  exit /b 1
)
popd

if not exist "%~dp0.env" (
  copy "%~dp0.env.example" "%~dp0.env" >nul
  echo [ok] Created .env from .env.example
)
if not exist "%~dp0frontend\.env" (
  copy "%~dp0frontend\.env.example" "%~dp0frontend\.env" >nul
  echo [ok] Created frontend\.env from frontend\.env.example
)

echo.
echo ============================================
echo  Setup complete.
echo  Start the app with: start.bat
echo  Then open http://localhost:5173/
echo ============================================
endlocal
