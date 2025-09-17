#!/bin/bash
# Proper Development Workflow Script
# Test locally first, then deploy to QA

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Development Workflow${NC}"
echo "================================"

# Function to check if localhost is running
check_localhost() {
    echo -e "${YELLOW}🔍 Checking localhost...${NC}"
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health)
    
    if [ "$FRONTEND_STATUS" = "200" ] && [ "$BACKEND_STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Localhost is running with hot reload${NC}"
        echo "🌐 Frontend: http://localhost:3000"
        echo "🔧 Backend: http://localhost:8000"
        return 0
    else
        echo -e "${RED}❌ Localhost not running properly${NC}"
        echo "Frontend status: $FRONTEND_STATUS, Backend status: $BACKEND_STATUS"
        return 1
    fi
}

# Function to start localhost if not running
start_localhost() {
    echo -e "${YELLOW}🚀 Starting localhost hot reload...${NC}"
    docker-compose down > /dev/null 2>&1
    docker-compose up -d
    echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
    sleep 10
}

# Function to deploy to QA
deploy_to_qa() {
    echo -e "${YELLOW}📤 Deploying to QA...${NC}"
    if [ ! -f "./qa-update.sh" ]; then
        echo -e "${RED}❌ qa-update.sh not found${NC}"
        return 1
    fi
    ./qa-update.sh
}

# Main workflow
case "$1" in
    "start")
        start_localhost
        check_localhost
        ;;
    "check")
        check_localhost
        ;;
    "deploy")
        echo -e "${BLUE}Step 1: Check localhost${NC}"
        if ! check_localhost; then
            echo -e "${YELLOW}Starting localhost first...${NC}"
            start_localhost
            if ! check_localhost; then
                echo -e "${RED}❌ Cannot proceed - localhost not working${NC}"
                exit 1
            fi
        fi
        
        echo -e "${BLUE}Step 2: Deploy to QA${NC}"
        deploy_to_qa
        
        echo -e "${GREEN}🎉 Workflow complete!${NC}"
        echo "🔍 Test locally: http://localhost:3000"
        echo "🔍 Test QA: http://161.35.39.205"
        ;;
    "")
        echo "Usage: $0 {start|check|deploy}"
        echo ""
        echo "Commands:"
        echo "  start   - Start localhost hot reload"
        echo "  check   - Check if localhost is running"
        echo "  deploy  - Full workflow: check localhost → deploy to QA"
        echo ""
        echo "Examples:"
        echo "  $0 start    # Start local development"
        echo "  $0 deploy   # Test locally, then deploy to QA"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use: $0 {start|check|deploy}"
        exit 1
        ;;
esac
