#!/bin/bash
# Quick QA Update - for when hot reload is already running
# Just pulls latest changes (takes 5-10 seconds)

SERVER_IP="161.35.39.205"
SERVER_USER="root"
APP_DIR="/var/www/viaticos2025"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⚡ Quick QA Update${NC}"
echo "===================="

# Check if we're on qa-deploy branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "qa-deploy" ]; then
    echo "❌ Not on qa-deploy branch. Currently on: $CURRENT_BRANCH"
    exit 1
fi

# Push changes
echo -e "${YELLOW}📤 Pushing changes...${NC}"
git add .
git commit -m "qa-update: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin qa-deploy

# Quick update on server (no container restart)
echo -e "${YELLOW}⚡ Quick update on server...${NC}"
ssh $SERVER_USER@$SERVER_IP "
    cd $APP_DIR && 
    git pull origin qa-deploy &&
    echo '✅ Files updated - hot reload will detect changes automatically!'
"

echo -e "${GREEN}🎉 Update complete! Changes should appear in seconds.${NC}"
echo "🌐 Check: http://$SERVER_IP"
