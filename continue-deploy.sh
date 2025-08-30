#!/bin/bash

# Continue deployment with the fixed Docker Compose version
DROPLET_IP="161.35.39.205"
DROPLET_USER="root"
APP_DIR="/var/www/viaticos2025"

echo "🔄 Updating repository with latest changes..."
ssh $DROPLET_USER@$DROPLET_IP "cd $APP_DIR && git pull origin main"

echo "📋 Copying updated production configuration..."
scp docker-compose.prod.yml $DROPLET_USER@$DROPLET_IP:$APP_DIR/docker-compose.yml

echo "🛑 Stopping any existing containers..."
ssh $DROPLET_USER@$DROPLET_IP "cd $APP_DIR && docker-compose down || true"

echo "🏗️ Building and starting services..."
ssh $DROPLET_USER@$DROPLET_IP "cd $APP_DIR && docker-compose up -d --build"

echo "⏳ Waiting for services to start..."
sleep 30

echo "🔍 Checking service status..."
ssh $DROPLET_USER@$DROPLET_IP "cd $APP_DIR && docker-compose ps"

echo "🌐 Testing application endpoints..."
if ssh $DROPLET_USER@$DROPLET_IP "curl -f http://localhost:8000/api/health || curl -f http://localhost:8000/docs"; then
    echo "✅ Backend is responding!"
else
    echo "⚠️ Backend might not be ready yet, checking logs..."
    ssh $DROPLET_USER@$DROPLET_IP "cd $APP_DIR && docker-compose logs backend | tail -20"
fi

if ssh $DROPLET_USER@$DROPLET_IP "curl -f http://localhost:3000"; then
    echo "✅ Frontend is responding!"
else
    echo "⚠️ Frontend might not be ready yet, checking logs..."
    ssh $DROPLET_USER@$DROPLET_IP "cd $APP_DIR && docker-compose logs frontend | tail -20"
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

