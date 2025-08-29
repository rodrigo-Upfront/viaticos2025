#!/bin/bash

# 🚀 Viaticos 2025 - DigitalOcean Droplet Deployment Script
# Run this script on your DigitalOcean droplet

set -e

echo "🚀 Viaticos 2025 - Droplet Deployment"
echo "===================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo apt install -y docker-compose

# Install Git
echo "📂 Installing Git..."
sudo apt install -y git

# Clone repository
echo "📥 Cloning repository..."
cd /opt
sudo git clone https://github.com/rodrigo-Upfront/viaticos2025.git
sudo chown -R $USER:$USER viaticos2025
cd viaticos2025

# Create production environment file
echo "⚙️ Creating production environment..."
cat > .env.prod << EOF
# Database
POSTGRES_DB=viaticos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=viaticos2025_prod_$(openssl rand -base64 12)
DATABASE_URL=postgresql://postgres:viaticos2025_prod_$(openssl rand -base64 12)@database:5432/viaticos

# JWT
JWT_SECRET_KEY=$(openssl rand -base64 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# API URLs
REACT_APP_API_URL=http://$(curl -s ipinfo.io/ip):8000/api

# File settings
UPLOAD_PATH=/app/storage/uploads
EXPORT_PATH=/app/storage/exports
MAX_FILE_SIZE=10485760
EOF

# Create production docker-compose
echo "🔧 Creating production docker-compose..."
cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    container_name: viaticos_db_prod
    environment:
      POSTGRES_DB: viaticos
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - viaticos_network
    restart: unless-stopped

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: viaticos_backend_prod
    env_file: .env.prod
    ports:
      - "8000:8000"
    volumes:
      - ./storage:/app/storage
    depends_on:
      - database
    networks:
      - viaticos_network
    restart: unless-stopped
    command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: viaticos_frontend_prod
    environment:
      - REACT_APP_API_URL=http://$(curl -s ipinfo.io/ip):8000/api
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - viaticos_network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  viaticos_network:
    driver: bridge
EOF

# Set up firewall
echo "🔥 Setting up firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 3000
sudo ufw allow 8000
sudo ufw --force enable

# Create storage directories
echo "📁 Creating storage directories..."
mkdir -p storage/uploads storage/exports
chmod 755 storage/uploads storage/exports

# Build and start services
echo "🚀 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Create initial data
echo "📊 Creating initial data..."
docker-compose -f docker-compose.prod.yml exec -T backend python create_initial_data.py || echo "Initial data creation failed - will need manual setup"

# Show status
echo ""
echo "✅ Deployment Complete!"
echo "======================="
echo "🌐 Frontend: http://$(curl -s ipinfo.io/ip):3000"
echo "🔗 Backend API: http://$(curl -s ipinfo.io/ip):8000/api/docs"
echo "📊 Health Check: http://$(curl -s ipinfo.io/ip):8000/api/health"
echo ""
echo "🔑 Default Admin Credentials:"
echo "   Email: test@test.com"
echo "   Password: admin123"
echo ""
echo "📋 Useful Commands:"
echo "   View logs: docker-compose -f docker-compose.prod.yml logs"
echo "   Restart: docker-compose -f docker-compose.prod.yml restart"
echo "   Stop: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "🔧 Next Steps:"
echo "   1. Test the application at the URLs above"
echo "   2. Configure domain name (optional)"
echo "   3. Set up SSL certificate with Let's Encrypt"
echo "   4. Configure backups"
EOF
