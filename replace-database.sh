#!/bin/bash

# Database replacement script for production
set -e

DROPLET_IP="161.35.39.205"
DROPLET_USER="root"
APP_DIR="/var/www/viaticos2025"
DB_FILE="viaticos_clean_20250831_125119.sql"

echo "🗄️ Replacing production database..."
echo "📍 Target: $DROPLET_USER@$DROPLET_IP"

# Function to run commands on the droplet
run_on_droplet() {
    ssh $DROPLET_USER@$DROPLET_IP "$1"
}

echo "📦 Backing up current production database..."
run_on_droplet "cd $APP_DIR && docker-compose exec -T db pg_dump -U postgres -d viaticos > backup_$(date +%Y%m%d_%H%M%S).sql"

echo "🛑 Stopping application containers..."
run_on_droplet "cd $APP_DIR && docker-compose stop backend frontend"

echo "🗑️ Dropping existing database..."
run_on_droplet "cd $APP_DIR && docker-compose exec -T db psql -U postgres -c 'DROP DATABASE IF EXISTS viaticos;'"

echo "🆕 Creating new database..."
run_on_droplet "cd $APP_DIR && docker-compose exec -T db psql -U postgres -c 'CREATE DATABASE viaticos;'"

echo "📥 Importing clean database..."
run_on_droplet "cd $APP_DIR && docker-compose exec -T db psql -U postgres -d viaticos < $DB_FILE"

echo "🚀 Starting application containers..."
run_on_droplet "cd $APP_DIR && docker-compose start backend frontend"

echo "⏳ Waiting for services to restart..."
sleep 15

echo "✅ Database replacement complete!"
echo "🌐 Application should be available at: http://$DROPLET_IP:3000"
