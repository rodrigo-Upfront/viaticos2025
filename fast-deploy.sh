#!/bin/bash
# Fast deployment script for Viaticos 2025 with selective rebuilds

# Configuration
SERVER_IP="161.35.39.205"
SERVER_USER="root"
APP_DIR="/var/www/viaticos2025"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Fast Deploying to DigitalOcean Droplet: $SERVER_IP${NC}"
echo "============================================"

# Check what changed
echo -e "${YELLOW}📊 Analyzing changes...${NC}"
BACKEND_CHANGED=$(git diff --name-only HEAD~1 HEAD | grep -E '^backend/' | wc -l)
FRONTEND_CHANGED=$(git diff --name-only HEAD~1 HEAD | grep -E '^frontend/' | wc -l)
DB_CHANGED=$(git diff --name-only HEAD~1 HEAD | grep -E '^database/' | wc -l)

echo "Backend files changed: $BACKEND_CHANGED"
echo "Frontend files changed: $FRONTEND_CHANGED"
echo "Database files changed: $DB_CHANGED"

# 1. Push local changes
echo -e "${YELLOW}📤 Pushing changes to GitHub...${NC}"
git add .
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

# 2. Deploy on server with selective rebuilds
echo -e "${YELLOW}📥 Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_IP "
    cd $APP_DIR && 
    echo '🔄 Pulling latest code...' &&
    git pull origin main && 
    
    # Selective rebuild based on changes using fast Docker files
    if [ $BACKEND_CHANGED -gt 0 ]; then
        echo '🔨 Fast rebuilding backend...' &&
        docker-compose -f docker-compose.fast.yml build --no-cache backend &&
        docker-compose -f docker-compose.fast.yml up -d backend
    fi
    
    if [ $FRONTEND_CHANGED -gt 0 ]; then
        echo '🔨 Fast rebuilding frontend...' &&
        docker-compose -f docker-compose.fast.yml build --no-cache frontend &&
        docker-compose -f docker-compose.fast.yml up -d frontend
    fi
    
    if [ $DB_CHANGED -gt 0 ]; then
        echo '🗄️ Database changes detected - manual migration may be needed'
    fi
    
    # If no specific changes, restart all
    if [ $BACKEND_CHANGED -eq 0 ] && [ $FRONTEND_CHANGED -eq 0 ]; then
        echo '🔄 No specific changes detected, restarting all services...' &&
        docker-compose -f docker-compose.fast.yml restart
    fi
    
    echo '✅ Deployment complete!'
"

# 3. Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
sleep 5

# Check backend health
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP:8000/api/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed (HTTP $BACKEND_STATUS)${NC}"
fi

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP:3000)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend check failed (HTTP $FRONTEND_STATUS)${NC}"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo "Frontend: http://$SERVER_IP:3000"
echo "Backend: http://$SERVER_IP:8000"
echo "API Health: http://$SERVER_IP:8000/api/health"
