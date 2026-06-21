require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const logger = require('./utils/logger');
const { initWebSocket } = require('./services/websocket.service');
const { initCronJobs } = require('./services/cron.service');
const { startTCPServer, startMQTTClient, createHTTPHandler } = require('./gps/gps.server');

// Route imports
const authRoutes = require('./api/auth.routes');
const vehicleRoutes = require('./api/vehicles.routes');
const trackingRoutes = require('./api/tracking.routes');
const alertRoutes = require('./api/alerts.routes');
const geofenceRoutes = require('./api/geofences.routes');
const reportRoutes = require('./api/reports.routes');
const userRoutes = require('./api/users.routes');
const driverRoutes = require('./api/drivers.routes');
const deviceRoutes = require('./api/devices.routes');
const maintenanceRoutes = require('./api/maintenance.routes');
const tasksRoutes = require('./api/tasks.routes');
const fuelRoutes = require('./api/fuel.routes');
const driverBehaviorRoutes = require('./api/driver-behavior.routes');
const temperatureRoutes = require('./api/temperature.routes');
const companiesRoutes = require('./api/companies.routes');
const analyticsRoutes = require('./api/analytics.routes');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const app = express();
const server = http.createServer(app);

// =============================================
// Security Middleware
// =============================================
app.use(helmet({
  contentSecurityPolicy: false, // Configured separately for frontend
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://fleetgps.vercel.app', 'https://fleetgps.vercel.app/'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter for auth endpoints
  message: { success: false, message: 'Too many login attempts' }
});

// =============================================
// General Middleware
// =============================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.url === '/health'
}));

// =============================================
// Routes
// =============================================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vehicles', apiLimiter, vehicleRoutes);
app.use('/api/tracking', apiLimiter, trackingRoutes);
app.use('/api/alerts', apiLimiter, alertRoutes);
app.use('/api/geofences', apiLimiter, geofenceRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/drivers', apiLimiter, driverRoutes);
app.use('/api/devices', apiLimiter, deviceRoutes);
app.use('/api/maintenance', apiLimiter, maintenanceRoutes);
app.use('/api/tasks', apiLimiter, tasksRoutes);
app.use('/api/fuel', apiLimiter, fuelRoutes);
app.use('/api/driver-behavior', apiLimiter, driverBehaviorRoutes);
app.use('/api/temperature', apiLimiter, temperatureRoutes);
app.use('/api/companies', apiLimiter, companiesRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);

// GPS HTTP endpoint (for devices that use HTTP protocol)
app.post('/gps/data', createHTTPHandler());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// =============================================
// Start Server
// =============================================
const PORT = parseInt(process.env.PORT) || 3000;

server.listen(PORT, async () => {
  logger.info(`Fleet Management API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize WebSocket for real-time tracking
  await initWebSocket(server);

  // Start GPS servers (conditionally for platforms that support custom ports)
  if (process.env.DISABLE_TCP_SERVER !== 'true') {
    startTCPServer();
  } else {
    logger.info('TCP server disabled (DISABLE_TCP_SERVER=true)');
  }
  
  if (process.env.DISABLE_MQTT_CLIENT !== 'true') {
    startMQTTClient();
  } else {
    logger.info('MQTT client disabled (DISABLE_MQTT_CLIENT=true)');
  }

  // Start scheduled jobs
  initCronJobs();

  logger.info('All services started successfully');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

module.exports = { app, server };
