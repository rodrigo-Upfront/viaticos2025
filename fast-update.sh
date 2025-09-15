#!/bin/bash
# Fast update script - updates only changed files without full rebuild

SERVER_IP="161.35.39.205"
SERVER_USER="root"
APP_DIR="/var/www/viaticos2025"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Fast Update (No Rebuild) to $SERVER_IP${NC}"
echo "============================================"

# Push changes
echo -e "${YELLOW}📤 Pushing changes...${NC}"
git add .
git commit -m "fast-update: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

# Update server without rebuild
echo -e "${YELLOW}📥 Updating server (no rebuild)...${NC}"
ssh $SERVER_USER@$SERVER_IP "
    cd $APP_DIR && 
    echo '🔄 Pulling latest code...' &&
    git pull origin main && 
    echo '⚡ Restarting containers (no rebuild)...' &&
    docker-compose -f docker-compose.prod.yml restart &&
    echo '✅ Fast update complete!'
"

# Quick verification
echo -e "${YELLOW}🔍 Quick verification...${NC}"
sleep 3
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/api/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
    echo "🌐 Application: http://$SERVER_IP"
else
    echo -e "${RED}❌ Backend check failed${NC}"
fi
