# Viaticos 2025 - DigitalOcean Droplet Deployment

## Overview
This guide covers deploying Viaticos 2025 to a DigitalOcean Droplet using Docker Compose.

## Prerequisites ✅
- DigitalOcean Droplet running Ubuntu 18.04.5 LTS
- Docker and Docker Compose installed
- SSH access to the droplet
- Git repository pushed to GitHub

## Droplet Information
- **IP Address**: 161.35.39.205
- **OS**: Ubuntu 18.04.5 LTS
- **Resources**: 4GB RAM, 58GB Storage, 24GB Available
- **Ports**: 3000 (Frontend), 8000 (Backend), 5432 (Database)

## Quick Deployment

### Option 1: Automated Script (Recommended)
```bash
# From your local machine, run:
./deploy-droplet.sh
```

This script will:
- ✅ Verify droplet connectivity
- ✅ Check Docker installation
- ✅ Clone/update the repository
- ✅ Deploy with production configuration
- ✅ Start all services
- ✅ Verify deployment

### Option 2: Manual Deployment

#### Step 1: Connect to Droplet
```bash
ssh root@161.35.39.205
```

#### Step 2: Clone Repository
```bash
cd /var/www
git clone https://github.com/rodrigo-Upfront/viaticos2025.git
cd viaticos2025
```

#### Step 3: Copy Production Config
```bash
# Copy docker-compose.prod.yml from your local machine
# Or create it directly on the droplet
```

#### Step 4: Deploy
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Service Configuration

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: viaticos_db
- **User**: postgres
- **Password**: postgres123
- **Data Volume**: postgres_data

### Backend (FastAPI)
- **Port**: 8000
- **Environment**: Production
- **Database URL**: postgresql://postgres:postgres123@database:5432/viaticos_db
- **Upload Directory**: ./backend/uploads

### Frontend (React)
- **Port**: 3000
- **API Base URL**: http://161.35.39.205:8000/api
- **Build**: Production optimized

## Application URLs
- **Frontend**: http://161.35.39.205:3000
- **Backend API**: http://161.35.39.205:8000
- **API Documentation**: http://161.35.39.205:8000/docs
- **Health Check**: http://161.35.39.205:8000/api/health

## Default Credentials
- **Email**: test@test.com
- **Password**: admin123
- **Role**: Super Admin

## Useful Commands

### Service Management
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update and restart
git pull origin main
docker-compose down
docker-compose up -d --build
```

### System Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
docker stats

# Check port usage
netstat -tlnp | grep -E ":(3000|8000|5432)"
```

### Database Management
```bash
# Connect to database
docker-compose exec database psql -U postgres -d viaticos_db

# Backup database
docker-compose exec database pg_dump -U postgres viaticos_db > backup.sql

# Restore database
docker-compose exec -T database psql -U postgres viaticos_db < backup.sql
```

## Troubleshooting

### Common Issues

#### Service Not Starting
```bash
# Check logs for specific service
docker-compose logs backend

# Restart specific service
docker-compose restart backend
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec database pg_isready -U postgres

# Check database logs
docker-compose logs database
```

#### Port Conflicts
```bash
# Check what's using the ports
netstat -tlnp | grep -E ":(3000|8000|5432)"

# Stop conflicting services
sudo systemctl stop service-name
```

#### Out of Disk Space
```bash
# Clean up Docker
docker system prune -a

# Remove old images
docker image prune -a

# Check disk usage
df -h
```

## Security Considerations

### Environment Variables
- Change default passwords in production
- Use proper secret keys
- Consider using Docker secrets for sensitive data

### Firewall (Optional)
```bash
# Install UFW
apt install ufw

# Allow SSH
ufw allow ssh

# Allow application ports
ufw allow 3000
ufw allow 8000

# Enable firewall
ufw enable
```

### SSL/HTTPS (Future Enhancement)
- Consider adding Nginx as reverse proxy
- Use Let's Encrypt for SSL certificates
- Redirect HTTP to HTTPS

## Monitoring and Maintenance

### Log Rotation
```bash
# Configure Docker log rotation
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json
systemctl restart docker
```

### Backup Strategy
- Regular database backups
- Application code in Git
- Upload files backup
- Configuration backup

### Updates
1. Test updates locally first
2. Backup database before updates
3. Use blue-green deployment for zero downtime
4. Monitor application after updates

## Support
For issues or questions:
1. Check application logs
2. Verify service status
3. Check system resources
4. Review this documentation