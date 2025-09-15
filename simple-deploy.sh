#!/bin/bash
# Simple Git-based deployment for Viaticos 2025 Droplet

# Configuration
SERVER_IP="161.35.39.205"
SERVER_USER="root"
APP_DIR="/var/www/viaticos2025"

echo "🚀 Deploying to DigitalOcean Droplet: $SERVER_IP"
echo "============================================"

# 1. Push local changes
echo "📤 Pushing changes to GitHub..."
git add .
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

# 2. Deploy on server
echo "📥 Deploying on server..."
ssh $SERVER_USER@$SERVER_IP "
    cd $APP_DIR && 
    echo 'Pulling latest code...' &&
    git pull origin main && 
    echo 'Restarting containers...' &&
    docker-compose restart &&
    echo 'Deployment complete!'
"

echo "✅ Deployment successful!"
echo "Application: http://$SERVER_IP"
echo "API Health: http://$SERVER_IP/api/health"
