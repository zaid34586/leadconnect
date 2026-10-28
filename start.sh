#!/bin/bash

# LeadConnect - Production Startup Script
# Usage: ./start.sh [dev|prod]

set -e

MODE=${1:-prod}
ENV_FILE=".env"

echo "🚀 Starting LeadConnect in $MODE mode..."

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found!"
    echo "📋 Copy .env.example to .env and fill in your credentials:"
    echo "   cp .env.example .env"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' $ENV_FILE | xargs)

# Generate INTERNAL_API_KEY if not set
if [ -z "$INTERNAL_API_KEY" ]; then
    export INTERNAL_API_KEY="leadconnect-internal-$(openssl rand -hex 16)"
    echo "Generated INTERNAL_API_KEY: $INTERNAL_API_KEY"
fi

echo "🔧 Environment: $NODE_ENV"
echo "🔗 Frontend URL: $FRONTEND_URL"
echo "🔐 Internal API Key: ${INTERNAL_API_KEY:0:20}..."

if [ "$MODE" = "dev" ]; then
    echo "🔨 Starting in DEVELOPMENT mode with hot reload..."
    
    # Start services individually for development
    echo "Starting Browser Automation..."
    cd services/browser-automation && npm run dev &
    
    sleep 3
    echo "Starting Lead Sourcing..."
    cd ../lead-sourcing && npm run dev &
    
    sleep 3
    echo "Starting Outreach Engine..."
    cd ../outreach-engine && npm run dev &
    
    sleep 3
    echo "Starting AI Engine..."
    cd ../ai-engine && npm run dev &
    
    sleep 3
    echo "Starting Main App..."
    cd ../../ && npm run dev &
    
    echo "✅ All services started in development mode!"
    echo "📝 Logs will appear here. Press Ctrl+C to stop all."
    
    # Wait for all background processes
    wait
    
else
    echo "🐳 Starting in PRODUCTION mode with Docker Compose..."
    
    # Build and start all services
    docker-compose up --build -d
    
    echo "✅ All containers started!"
    echo ""
    echo "📋 Service URLs:"
    echo "   Main App:           http://localhost:3000"
    echo "   Browser Automation: http://localhost:3001"
    echo "   Lead Sourcing:      http://localhost:3002"
    echo "   Outreach Engine:    http://localhost:3003"
    echo "   AI Engine:          http://localhost:3004"
    echo ""
    echo "📊 View logs: docker-compose logs -f"
    echo "🛑 Stop: docker-compose down"
fi