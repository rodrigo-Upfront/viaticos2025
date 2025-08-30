#!/bin/bash

# Manual deployment - copy files directly to droplet
# Use this if you prefer not to make the repository public

DROPLET_IP="161.35.39.205"
DROPLET_USER="root"
APP_DIR="/var/www/viaticos2025"

echo "🚀 Manual deployment to DigitalOcean Droplet..."
echo "📍 Target: $DROPLET_USER@$DROPLET_IP"

# Create directory on droplet
ssh $DROPLET_USER@$DROPLET_IP "mkdir -p $APP_DIR"

echo "📂 Copying application files..."

# Copy all files except node_modules, .git, etc.
rsync -av --progress \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='.env' \
  --exclude='*.log' \
  ./ $DROPLET_USER@$DROPLET_IP:$APP_DIR/

echo "📋 Copying production configuration..."
scp docker-compose.prod.yml $DROPLET_USER@$DROPLET_IP:$APP_DIR/docker-compose.yml

echo "🐳 Starting deployment on droplet..."
ssh $DROPLET_USER@$DROPLET_IP "cd $APP_DIR && docker-compose down && docker-compose up -d --build"

echo "🎉 Manual deployment complete!"
echo "Frontend: http://$DROPLET_IP:3000"
echo "Backend: http://$DROPLET_IP:8000"

