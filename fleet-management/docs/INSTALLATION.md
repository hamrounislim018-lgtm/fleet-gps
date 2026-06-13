# Fleet Management System - Installation Guide
# دليل التثبيت الكامل

## Requirements / المتطلبات

- Ubuntu 20.04+ / 22.04 LTS
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Nginx (for production)
- SSL Certificate (Let's Encrypt)

---

## 1. Server Setup / إعداد السيرفر

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

---

## 2. Database Setup / إعداد قاعدة البيانات

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE fleet_management;
CREATE USER fleet_user WITH ENCRYPTED PASSWORD 'StrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE fleet_management TO fleet_user;
\q

# Run migrations
cd /var/www/fleet-management/backend
npm run migrate

# Seed initial data (creates admin user)
npm run seed
```

---

## 3. Backend Setup / إعداد الـ Backend

```bash
# Clone or upload project
cd /var/www
git clone <your-repo> fleet-management
cd fleet-management/backend

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env
# Fill in all required values

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start src/server.js --name "fleet-backend" --instances 2 --exec-mode cluster
pm2 save
pm2 startup
```

---

## 4. Frontend Build / بناء الـ Frontend

```bash
cd /var/www/fleet-management/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Output will be in /dist folder
```

---

## 5. Nginx Configuration / إعداد Nginx

```nginx
# /etc/nginx/sites-available/fleet
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend (React build)
    root /var/www/fleet-management/frontend/dist;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # GPS HTTP endpoint
    location /gps/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fleet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 6. Firewall Setup / إعداد الجدار الناري

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 5000/tcp    # GPS TCP (from device IPs only ideally)
sudo ufw allow 1883/tcp    # MQTT (if using external broker)
sudo ufw enable
```

---

## 7. Default Login / بيانات الدخول الافتراضية

```
URL: https://yourdomain.com
Email: admin@fleet.com
Password: Admin@123456
```

**Change the password immediately after first login!**

---

## 8. Backup Configuration / إعداد النسخ الاحتياطي

```bash
# Create backup script
cat > /usr/local/bin/fleet-backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/fleet
mkdir -p $BACKUP_DIR
pg_dump -U fleet_user fleet_management | gzip > $BACKUP_DIR/db_$DATE.sql.gz
# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/fleet-backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/fleet-backup.sh" | crontab -
```

---

## 9. Monitoring / المراقبة

```bash
# View backend logs
pm2 logs fleet-backend

# View application logs
tail -f /var/www/fleet-management/backend/logs/combined.log

# Monitor processes
pm2 monit
```
