#!/bin/bash
# Comprehensive deployment script for Viaticos 2025

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

# Function to show usage
show_usage() {
    echo -e "${BLUE}Viaticos 2025 Deployment Script${NC}"
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  fast     - Fast deployment with optimized rebuilds"
    echo "  prod     - Full production deployment (secure, slower)"
    echo "  simple   - Simple git pull and restart (fastest)"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 fast    # Fast deployment for development-like speed"
    echo "  $0 prod    # Full production deployment"
    echo "  $0 simple  # Quick restart without rebuild"
}

# Function for fast deployment
fast_deploy() {
    echo -e "${YELLOW}🚀 Fast Deployment Mode${NC}"
    ./fast-deploy.sh
}

# Function for production deployment
prod_deploy() {
    echo -e "${YELLOW}🏭 Production Deployment Mode${NC}"
    
    echo -e "${YELLOW}📤 Pushing changes to GitHub...${NC}"
    git add .
    git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
    git push origin main
    
    echo -e "${YELLOW}📥 Deploying on server...${NC}"
    ssh $SERVER_USER@$SERVER_IP "
        cd $APP_DIR && 
        echo '🔄 Pulling latest code...' &&
        git pull origin main && 
        echo '🔨 Rebuilding all services...' &&
        docker-compose -f docker-compose.prod.yml build &&
        docker-compose -f docker-compose.prod.yml up -d &&
        echo '✅ Production deployment complete!'
    "
}

# Function for simple deployment
simple_deploy() {
    echo -e "${YELLOW}⚡ Simple Deployment Mode${NC}"
    ./simple-deploy.sh
}

# Main script logic
case "$1" in
    "fast")
        fast_deploy
        ;;
    "prod")
        prod_deploy
        ;;
    "simple")
        simple_deploy
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    "")
        echo -e "${RED}❌ No deployment mode specified${NC}"
        echo ""
        show_usage
        exit 1
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac

# Final verification
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
sleep 3

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

echo -e "${GREEN}🎉 Deployment verification complete!${NC}"
echo "🌐 Frontend: http://$SERVER_IP:3000"
echo "🔧 Backend: http://$SERVER_IP:8000"
echo "💚 Health: http://$SERVER_IP:8000/api/health"