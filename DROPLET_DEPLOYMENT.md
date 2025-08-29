# 🚀 Viaticos 2025 - DigitalOcean Droplet Deployment

## Why Droplet vs App Platform?

**Droplet Advantages:**
- ✅ **Much Cheaper**: $12/month vs $48+/month
- ✅ **Full Control**: Complete server access
- ✅ **Simpler Setup**: Direct Docker deployment
- ✅ **No Auto-Detection Issues**: Works with any configuration

## 📋 Deployment Steps

### Step 1: Create DigitalOcean Droplet

1. **Go to**: https://cloud.digitalocean.com/droplets
2. **Click**: "Create Droplet"
3. **Configure**:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic $12/month (2 GB RAM, 1 vCPU, 50 GB SSD)
   - **Region**: Choose closest to your users
   - **Authentication**: Add your SSH key or use password
   - **Hostname**: `viaticos-2025`
4. **Click**: "Create Droplet"

### Step 2: Connect to Droplet

```bash
# SSH into your droplet (replace with your IP)
ssh root@YOUR_DROPLET_IP
```

### Step 3: Run Automated Deployment

```bash
# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/rodrigo-Upfront/viaticos2025/main/deploy-droplet.sh | bash
```

### Step 4: Access Your Application

After deployment completes (~5-10 minutes):

- **Frontend**: `http://YOUR_DROPLET_IP:3000`
- **Backend API**: `http://YOUR_DROPLET_IP:8000/api/docs`
- **Health Check**: `http://YOUR_DROPLET_IP:8000/api/health`

## 🔑 Default Credentials

- **Email**: `test@test.com`
- **Password**: `admin123`

## 💰 Cost Comparison

| Service | App Platform | Droplet |
|---------|-------------|---------|
| Backend | $24/month | $12/month (total) |
| Frontend | $24/month | Included |
| Database | $15/month | Included |
| **Total** | **$63/month** | **$12/month** |

## 🔧 Management Commands

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Navigate to app directory
cd /opt/viaticos2025

# View logs
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Update application
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# Backup database
docker-compose -f docker-compose.prod.yml exec database pg_dump -U postgres viaticos > backup.sql
```

## 🌐 Optional: Setup Domain Name

### Add Domain (if you have one)

1. **Point your domain** to the droplet IP
2. **Update environment variables**:
   ```bash
   # Edit .env.prod
   REACT_APP_API_URL=https://yourdomain.com/api
   ```
3. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot
   sudo certbot --nginx -d yourdomain.com
   ```

## 🔐 Security Recommendations

1. **Change default passwords**
2. **Setup SSH key authentication**
3. **Configure firewall properly**
4. **Enable automatic security updates**
5. **Setup database backups**

## 🆘 Troubleshooting

### Services won't start
```bash
# Check Docker status
sudo systemctl status docker

# Check container logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
```

### Can't connect to application
```bash
# Check firewall
sudo ufw status

# Check if ports are open
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :8000
```

### Database issues
```bash
# Reset database
docker-compose -f docker-compose.prod.yml down
docker volume rm viaticos2025_postgres_data
docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/droplets/
- **Docker Docs**: https://docs.docker.com/
- **Application Issues**: Check the logs and error messages
