#!/bin/bash

# Viaticos 2025 - DigitalOcean Droplet Deployment Script (SSH Key Authentication)
# This script uses SSH keys instead of password authentication

set -e  # Exit on any error

DROPLET_IP="161.35.39.205"
DROPLET_USER="root"
APP_DIR="/var/www/viaticos2025"
SSH_KEY="$HOME/.ssh/viaticos_droplet"

echo "🚀 Starting passwordless deployment to DigitalOcean Droplet..."
echo "📍 Target: $DROPLET_USER@$DROPLET_IP"

# Function to run commands on the droplet using SSH key
run_on_droplet() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$DROPLET_USER@$DROPLET_IP" "$1"
}

# Function to copy files to droplet using SSH key
copy_to_droplet() {
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r "$1" "$DROPLET_USER@$DROPLET_IP:$2"
}

echo "🔍 Testing SSH key connectivity..."
if ! run_on_droplet "echo 'SSH key authentication successful!'"; then
    echo "❌ SSH key authentication failed. Please ensure the public key is added to ~/.ssh/authorized_keys on the droplet"
    echo "Run this on your droplet:"
    echo "echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCi4Que3dqxeoeWfYMEQ0YisslHblOhd0Z/5+QpQxOdrfCYlNOZVqRF5u6UEJs3/IhQmuOz+HH19v3EL0c71oAC6H3LvvEToH1L/qrOzKrqaOUZ70R0Dd6qXMHJtPAGGnnBU1GjzPHPxWVDPIpXrbMRKjEI1bHmdAYNIX2HibXBker2G6/6+4j+V1QyboTs5e1LD0ZUT/YQ0KhWJyB0p12ZIYROETxGvh6TQc2xkeB/SF/GnICwj6jgNqSrkkKp5kVj1gy1jNJBGDP+1cUDHOE2GyqJ/Wub96B6liJpAowsaMvohyD+asYTke0/rHWkZ0jFzQm1/yDGnFllrO+lLKUKNfSbrchG5O8pV3Aw7sigfziqBgQc8tJyv0JEe6tq1X79iQhbV7hK2sjfVgfjSYQFFgd3J1ev7n5E2jnbO/+oNccRr+yKdGElS3h7EfnBPQADvyxc5WlontXIukX8y4flwFozMtRObhyBMTzf5kDk2vpMeiVnrP/N3405LCP+Qo5yDYTsRhhybLNZ/Du3DZLgj93lOYBWxqrxudGM6oaU1edJ+9D5EwE4AzfghmAr65BRU/0OiDIvEdQoM6MT1dEVoTtS0tf7pT8NVuQni2PtNBSa6p0Zypl8hfAaGisUSZFz/xnbZ4QxS3rRIBgzjQe89n4mChBb7E+mGzSFBUwLIw== viaticos-deployment-20250829' >> ~/.ssh/authorized_keys"
    exit 1
fi

echo "✅ SSH key authentication working!"

echo "🐳 Verifying Docker installation..."
run_on_droplet "docker --version && docker-compose --version"

echo "🔄 Updating repository with latest changes..."
run_on_droplet "cd $APP_DIR && git pull origin main"

echo "📋 Copying updated production configuration..."
copy_to_droplet "docker-compose.prod.yml" "$APP_DIR/docker-compose.yml"

echo "🛑 Stopping existing containers..."
run_on_droplet "cd $APP_DIR && docker-compose down || true"

echo "🧹 Cleaning up any remaining containers and networks..."
run_on_droplet "docker system prune -f"

echo "🏗️ Building and starting services..."
run_on_droplet "cd $APP_DIR && docker-compose up -d --build"

echo "⏳ Waiting for services to start..."
sleep 45

echo "🔍 Checking service status..."
run_on_droplet "cd $APP_DIR && docker-compose ps"

echo "📋 Checking service logs..."
echo "=== Database Logs ==="
run_on_droplet "cd $APP_DIR && docker-compose logs database | tail -10"
echo "=== Backend Logs ==="
run_on_droplet "cd $APP_DIR && docker-compose logs backend | tail -10"
echo "=== Frontend Logs ==="
run_on_droplet "cd $APP_DIR && docker-compose logs frontend | tail -10"

echo "🌐 Testing application endpoints..."
if run_on_droplet "curl -f http://localhost:8000/api/health 2>/dev/null || curl -f http://localhost:8000/docs 2>/dev/null"; then
    echo "✅ Backend is responding!"
else
    echo "⚠️ Backend not responding yet..."
fi

if run_on_droplet "curl -f http://localhost:3000 2>/dev/null"; then
    echo "✅ Frontend is responding!"
else
    echo "⚠️ Frontend not responding yet..."
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Application URLs:"
echo "   Frontend: http://$DROPLET_IP:3000"
echo "   Backend API: http://$DROPLET_IP:8000"
echo "   API Docs: http://$DROPLET_IP:8000/docs"
echo ""
echo "🔑 Default login: test@test.com / admin123"
echo ""
echo "🔧 Useful commands (passwordless):"
echo "   Check logs: ssh -i $SSH_KEY $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose logs'"
echo "   Restart: ssh -i $SSH_KEY $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose restart'"
echo "   Status: ssh -i $SSH_KEY $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose ps'"

