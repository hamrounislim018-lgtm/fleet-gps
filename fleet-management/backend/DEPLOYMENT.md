# Render Deployment Guide for Fleet Management Backend

## Prerequisites
- Render account (free tier available at [render.com](https://render.com))
- GitHub repository with your backend code
- Frontend URL (your deployed Vercel frontend)

## Deployment Steps

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 2. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Verify your email

### 3. Deploy to Render

#### Option A: Automatic Deployment (Recommended)
1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select `fleet-management/backend` directory
5. Render will automatically detect `render.yaml` configuration
6. Click "Deploy Web Service"

#### Option B: Manual Configuration
1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: fleet-management-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (spins down after inactivity)

### 4. Set Environment Variables
In Render Dashboard, add these environment variables:

#### Required (Auto-configured by render.yaml):
- `NODE_ENV`: production
- `PORT`: 10000
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (auto from database)
- `JWT_SECRET`: (auto-generated)
- `ENCRYPTION_KEY`: (auto-generated)
- `DISABLE_TCP_SERVER`: true
- `DISABLE_MQTT_CLIENT`: true

#### Required (Manual):
- `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)

#### Optional (Configure if needed):
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (see Redis section below)
- `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` (see MQTT section below)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `GOOGLE_MAPS_API_KEY`

### 5. Create PostgreSQL Database
1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: fleet-management-db
   - **Database**: fleet_management
   - **User**: fleet_admin
   - **Plan**: Free (90 days, then $7/month)
4. Click "Create Database"

### 6. Run Database Migrations
After deployment, you'll need to run migrations:
1. Go to your web service in Render
2. Click "Shell" tab
3. Run: `npm run migrate`

### 7. Update Frontend URL
Update your frontend to point to the new backend URL:
- Backend URL: `https://fleet-management-backend.onrender.com`
- Update frontend environment variable: `VITE_API_URL`

## Free Tier Alternatives for Redis and MQTT

### Redis (Free Alternative)
Since Render Redis costs $7/month, use these free alternatives:

#### Option 1: Redis Cloud (Free Tier)
1. Go to [redis.com/try-free](https://redis.com/try-free/)
2. Sign up for free account
3. Create a free database (30MB)
4. Get connection details and add to Render environment variables:
   - `REDIS_HOST`: your-redis-cloud-host
   - `REDIS_PORT`: 6379
   - `REDIS_PASSWORD`: your-redis-password

#### Option 2: Disable Redis Temporarily
If you don't need caching immediately, you can modify the code to handle missing Redis gracefully.

### MQTT (Free Alternative)
Since Render doesn't support custom ports, use these alternatives:

#### Option 1: HiveMQ Cloud (Free Tier)
1. Go to [hivemq.com](https://www.hivemq.com/)
2. Sign up for free Cloud tier
3. Create a cluster
4. Get connection details and add to Render:
   - `MQTT_BROKER_URL`: your-hivemq-url
   - `MQTT_USERNAME`: your-username
   - `MQTT_PASSWORD`: your-password

#### Option 2: Use HTTP GPS Endpoint Only
The backend already has HTTP GPS endpoint (`/gps/data`) which works on Render.

## Limitations of Free Tier

### Render Free Tier:
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ Cold start takes ~30 seconds
- ⚠️ No custom ports (TCP server disabled)
- ⚠️ Redis costs $7/month
- ✅ PostgreSQL free for 90 days, then $7/month

### Workarounds:
- Use a cron job to ping the service every 10 minutes to keep it awake
- Upgrade to paid tier ($7/month) for always-on service
- Use alternative platforms like Railway ($5/month includes everything)

## Monitoring and Logs

### View Logs:
1. Go to your web service in Render
2. Click "Logs" tab
3. Real-time logs will appear

### Health Check:
Your backend has a health check endpoint:
```
https://fleet-management-backend.onrender.com/health
```

## Troubleshooting

### Service won't start:
- Check logs in Render Dashboard
- Ensure all environment variables are set
- Verify database connection details

### Database connection errors:
- Ensure PostgreSQL database is created
- Check database is in same region as web service
- Verify database credentials

### Frontend can't connect:
- Check CORS settings in backend
- Ensure FRONTEND_URL is set correctly
- Verify backend URL is correct in frontend

## Next Steps

1. Deploy backend to Render
2. Set up PostgreSQL database
3. Configure Redis (optional, use free alternative)
4. Configure MQTT (optional, use free alternative)
5. Run database migrations
6. Update frontend to use new backend URL
7. Test all functionality

## Cost Summary (Free Tier)

- **Web Service**: Free (with spin-down)
- **PostgreSQL**: Free for 90 days, then $7/month
- **Redis**: $7/month (or use free Redis Cloud)
- **MQTT**: Free (HiveMQ Cloud free tier)
- **Total**: $0-14/month depending on choices

## Upgrade Options

If you need always-on service, consider:
- **Render Starter**: $7/month (web service + database)
- **Railway**: $5/month (includes everything)
- **DigitalOcean**: $4-6/month (VPS with full control)
