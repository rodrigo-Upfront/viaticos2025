# Manual Deployment Steps for Existing Droplet

## Prerequisites Check
```bash
# Check available space
df -h

# Check RAM
free -h

# Check OS
lsb_release -a
```

## Step 1: Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose

# Install Git (if not installed)
sudo apt install -y git
```

## Step 2: Clone and Setup
```bash
# Navigate to where you want to install (e.g., /opt or /home/user)
cd /opt  # or cd ~

# Clone the repository
sudo git clone https://github.com/rodrigo-Upfront/viaticos2025.git
sudo chown -R $USER:$USER viaticos2025
cd viaticos2025
```

## Step 3: Configure Environment
```bash
# Create production environment file
cat > .env.prod << EOF
POSTGRES_DB=viaticos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=viaticos2025_prod_$(openssl rand -base64 8)
DATABASE_URL=postgresql://postgres:viaticos2025_prod_$(openssl rand -base64 8)@database:5432/viaticos
JWT_SECRET_KEY=$(openssl rand -base64 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
REACT_APP_API_URL=http://$(curl -s ipinfo.io/ip):8000/api
UPLOAD_PATH=/app/storage/uploads
EXPORT_PATH=/app/storage/exports
MAX_FILE_SIZE=10485760
EOF
```

## Step 4: Deploy
```bash
# Start the application
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs

# Create initial data
docker-compose exec backend python create_initial_data.py
```

## Step 5: Configure Firewall (if needed)
```bash
# Allow necessary ports
sudo ufw allow 3000
sudo ufw allow 8000

# Check firewall status
sudo ufw status
```

## Access URLs
- Frontend: http://YOUR_DROPLET_IP:3000
- Backend API: http://YOUR_DROPLET_IP:8000/api/docs
- Health Check: http://YOUR_DROPLET_IP:8000/api/health

## Default Credentials
- Email: test@test.com
- Password: admin123

