@echo off
setlocal EnableDelayedExpansion
title ARKIUM AI Desktop Chat - Setup

echo.
echo ========================================
echo   ARKIUM AI Desktop Chat - Setup
echo ========================================
echo.

:: Check Node.js
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ from https://nodejs.org
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%v in ('node --version') do echo [OK] Node.js %%v
)

:: Check npm
echo [2/5] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%v in ('npm --version') do echo [OK] npm %%v
)

:: Check Rust
echo [3/5] Checking Rust...
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Rust not found. Installing Rust...
    echo Please visit https://rustup.rs/ and run the installer.
    echo After installing Rust, run this script again.
    echo.
    start https://rustup.rs/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%v in ('rustc --version') do echo [OK] Rust %%v
)

:: Check Ollama (optional but recommended)
echo [4/5] Checking Ollama...
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Ollama not found. AI features require Ollama.
    echo Download from: https://ollama.ai
    echo You can install it later and restart the app.
) else (
    for /f "tokens=*" %%v in ('ollama --version') do echo [OK] Ollama %%v
)

:: Install Node.js dependencies
echo [5/5] Installing Node.js dependencies...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To start the development server:
echo   npm run tauri:dev
echo.
echo To build the application:
echo   npm run tauri:build
echo.
echo To pull an Ollama model (example):
echo   ollama pull llama3.2
echo.
pause
