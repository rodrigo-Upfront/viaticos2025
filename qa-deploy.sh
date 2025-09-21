#!/bin/bash
# QA Hot Reload Deployment Script
# Deploys from qa-deploy branch with instant hot reload

SERVER_IP="161.35.39.205"
SERVER_USER="root"
APP_DIR="/var/www/viaticos2025"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 QA Hot Reload Deployment to $SERVER_IP${NC}"
echo "============================================"

# Check if we're on qa-deploy branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "qa-deploy" ]; then
    echo -e "${RED}❌ Not on qa-deploy branch. Currently on: $CURRENT_BRANCH${NC}"
    echo "Switch to qa-deploy branch first: git checkout qa-deploy"
    exit 1
fi

# Push to qa-deploy branch
echo -e "${YELLOW}📤 Pushing to qa-deploy branch...${NC}"
git add .
git commit -m "qa-deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin qa-deploy

# Deploy to server with hot reload setup
echo -e "${YELLOW}📥 Setting up hot reload on server...${NC}"
ssh $SERVER_USER@$SERVER_IP "
    cd $APP_DIR && 
    echo '🔄 Pulling from qa-deploy branch...' &&
    git fetch origin &&
    git checkout qa-deploy &&
    git pull origin qa-deploy && 
    
    echo '🔥 Starting hot reload environment...' &&
    docker-compose -f docker-compose.hotreload.yml down &&
    docker-compose -f docker-compose.hotreload.yml up -d &&
    
    echo '✅ Hot reload deployment complete!'
"

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Restart nginx to refresh proxy connections after container restart
echo -e "${YELLOW}🔄 Restarting nginx to refresh proxy connections...${NC}"
ssh root@$SERVER_IP "systemctl restart nginx"
sleep 3

# Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/api/health)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/)

if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy (hot reload active)${NC}"
else
    echo -e "${RED}❌ Backend health check failed (HTTP $BACKEND_STATUS)${NC}"
fi

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible (hot reload active)${NC}"
else
    echo -e "${RED}❌ Frontend check failed (HTTP $FRONTEND_STATUS)${NC}"
fi

echo -e "${GREEN}🎉 QA Hot Reload Deployment Complete!${NC}"
echo "🌐 Application: http://$SERVER_IP"
echo "💚 API Health: http://$SERVER_IP/api/health"
echo ""
echo -e "${BLUE}ℹ️  How it works:${NC}"
echo "1. Make changes locally"
echo "2. Run: git add . && git commit -m 'your changes'"
echo "3. Run: ./qa-deploy.sh"
echo "4. Changes appear instantly (no rebuild needed!)"
