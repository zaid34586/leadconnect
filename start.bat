@echo off
REM LeadConnect - Production Startup Script for Windows
REM Usage: start.bat [dev|prod]

set MODE=%1
if "%MODE%"=="" set MODE=prod

echo 🚀 Starting LeadConnect in %MODE% mode...

REM Check if .env exists
if not exist .env (
    echo ❌ .env file not found!
    echo 📋 Copy .env.example to .env and fill in your credentials:
    echo    copy .env.example .env
    pause
    exit /b 1
)

REM Load environment variables
for /f "usebackq delims=" %%a in (`.env`) do set %%a

REM Generate INTERNAL_API_KEY if not set
if "%INTERNAL_API_KEY%"=="" (
    powershell -Command "$env:INTERNAL_API_KEY='leadconnect-internal-' + [System.Web.Security.Membership]::GeneratePassword(32,0); Write-Host $env:INTERNAL_API_KEY"
    for /f "delims=" %%i in ('powershell -Command "$env:INTERNAL_API_KEY='leadconnect-internal-' + [System.Web.Security.Membership]::GeneratePassword(32,0); Write-Host $env:INTERNAL_API_KEY"') do set INTERNAL_API_KEY=%%i
    echo Generated INTERNAL_API_KEY: %INTERNAL_API_KEY%
)

echo 🔧 Environment: %NODE_ENV%
echo 🔗 Frontend URL: %FRONTEND_URL%
echo 🔐 Internal API Key: %INTERNAL_API_KEY:~0,20%...

if "%MODE%"=="dev" (
    echo 🔨 Starting in DEVELOPMENT mode...
    echo ⚠️  Development mode requires manual service startup
    echo.
    echo Run these in separate terminals:
    echo   cd services\browser-automation && npm run dev
    echo   cd services\lead-sourcing && npm run dev
    echo   cd services\outreach-engine && npm run dev
    echo   cd services\ai-engine && npm run dev
    echo   npm run dev
    pause
) else (
    echo 🐳 Starting in PRODUCTION mode with Docker Compose...
    
    REM Check if Docker is running
    docker info >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker is not running! Please start Docker Desktop first.
        pause
        exit /b 1
    )
    
    echo Building and starting containers...
    docker-compose up --build -d
    
    if errorlevel 1 (
        echo ❌ Failed to start containers
        pause
        exit /b 1
    )
    
    echo ✅ All containers started!
    echo.
    echo 📋 Service URLs:
    echo    Main App:           http://localhost:3000
    echo    Browser Automation: http://localhost:3001
    echo    Lead Sourcing:      http://localhost:3002
    echo    Outreach Engine:    http://localhost:3003
    echo    AI Engine:          http://localhost:3004
    echo.
    echo 📊 View logs: docker-compose logs -f
    echo 🛑 Stop: docker-compose down
    echo.
    echo 🎉 LeadConnect is running!
    pause
)