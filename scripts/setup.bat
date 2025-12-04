@echo off
setlocal enabledelayedexpansion

echo 🚀 Setting up discourse.ai...

REM Check for Bun
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Bun is required. Install from https://bun.sh
    exit /b 1
)

REM Check for Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker is required. Install from https://docker.com
    exit /b 1
)

REM Copy env file if not exists
if not exist .env (
    copy .env.example .env
    echo 📝 Created .env file - please update with your API keys
)

REM Start database containers
echo 🐘 Starting PostgreSQL and Redis...
docker-compose up -d

REM Wait for database
echo ⏳ Waiting for database...
timeout /t 5 /nobreak >nul

REM Install dependencies
echo 📦 Installing dependencies...
call bun install

REM Run database migrations
echo 🔄 Pushing database schema...
call bun run db:push

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update .env with your API keys
echo 2. Run: bun run dev
