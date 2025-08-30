#!/bin/bash

# Viaticos 2025 - DigitalOcean Droplet Deployment Script
# This script automates the deployment to your Ubuntu 18.04.5 LTS droplet

set -e  # Exit on any error

DROPLET_IP="161.35.39.205"
DROPLET_USER="root"
APP_DIR="/var/www/viaticos2025"
REPO_URL="https://github.com/rodrigo-Upfront/viaticos2025.git"

echo "🚀 Starting deployment to DigitalOcean Droplet..."
echo "📍 Target: $DROPLET_USER@$DROPLET_IP"

# Function to run commands on the droplet
run_on_droplet() {
    ssh $DROPLET_USER@$DROPLET_IP "$1"
}

# Function to copy files to droplet
copy_to_droplet() {
    scp -r "$1" $DROPLET_USER@$DROPLET_IP:"$2"
}

echo "🔍 Checking droplet connectivity..."
if ! ssh -o ConnectTimeout=10 $DROPLET_USER@$DROPLET_IP "echo 'Connection successful'"; then
    echo "❌ Cannot connect to droplet. Please check:"
    echo "   - SSH key is properly configured"
    echo "   - Droplet IP is correct: $DROPLET_IP"
    echo "   - Droplet is running"
    exit 1
fi

echo "✅ Connected to droplet successfully!"

echo "🐳 Verifying Docker installation..."
if ! run_on_droplet "docker --version && docker-compose --version"; then
    echo "❌ Docker is not properly installed. Please install Docker first."
    exit 1
fi

echo "✅ Docker is installed and ready!"

echo "📂 Setting up application directory..."
run_on_droplet "mkdir -p /var/www"

echo "🔄 Cloning/updating repository..."
if run_on_droplet "[ -d $APP_DIR/.git ]"; then
    echo "📦 Repository exists, updating..."
    run_on_droplet "cd $APP_DIR && git pull origin main"
else
    echo "📦 Cloning repository..."
    run_on_droplet "cd /var/www && git clone $REPO_URL viaticos2025"
fi

echo "📋 Copying production configuration..."
copy_to_droplet "docker-compose.prod.yml" "$APP_DIR/docker-compose.yml"

echo "🛑 Stopping existing containers..."
run_on_droplet "cd $APP_DIR && docker-compose down || true"

echo "🏗️ Building and starting services..."
run_on_droplet "cd $APP_DIR && docker-compose up -d --build"

echo "⏳ Waiting for services to start..."
sleep 30

echo "🔍 Checking service status..."
run_on_droplet "cd $APP_DIR && docker-compose ps"

echo "🌐 Testing application endpoints..."
if run_on_droplet "curl -f http://localhost:8000/api/health || curl -f http://localhost:8000/docs"; then
    echo "✅ Backend is responding!"
else
    echo "⚠️ Backend might not be ready yet, checking logs..."
    run_on_droplet "cd $APP_DIR && docker-compose logs backend | tail -20"
fi

if run_on_droplet "curl -f http://localhost:3000"; then
    echo "✅ Frontend is responding!"
else
    echo "⚠️ Frontend might not be ready yet, checking logs..."
    run_on_droplet "cd $APP_DIR && docker-compose logs frontend | tail -20"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Application URLs:"
echo "   Frontend: http://$DROPLET_IP:3000"
echo "   Backend API: http://$DROPLET_IP:8000"
echo "   API Docs: http://$DROPLET_IP:8000/docs"
echo ""
echo "🔧 Useful commands:"
echo "   Check logs: ssh $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose logs'"
echo "   Restart: ssh $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose restart'"
echo "   Stop: ssh $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose down'"
echo ""
echo "🔑 Default login: test@test.com / admin123"