# Fleet Management & GPS Tracking System
# نظام إدارة وتتبع الأسطول

A professional, commercial-grade fleet management system with real-time GPS tracking.

## Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run migrate
npm run seed
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Open browser
```
http://localhost:5173
Login: admin@fleet.com / Admin@123456
```

## Features
- Real-time GPS tracking with WebSocket
- Interactive map (OpenStreetMap/Leaflet)
- Fleet management (vehicles, drivers, groups)
- Geofencing with enter/exit alerts
- Speed, disconnect, engine alerts
- Trip tracking & reports (PDF/Excel)
- Multi-language (Arabic RTL + English LTR)
- Dark/Light mode
- JWT authentication with role-based access
- Supports Teltonika, Concox, Queclink devices
- TCP + MQTT + HTTP GPS protocols

## Architecture
- Backend: Node.js + Express
- Frontend: React + Tailwind CSS + Leaflet
- Database: PostgreSQL (partitioned for scale)
- Cache: Redis (real-time positions)
- Real-time: WebSocket + Redis pub/sub

## Documentation
- [Installation Guide](docs/INSTALLATION.md)
- [API Reference](docs/API.md)
- [Device Setup Guide](docs/DEVICE_SETUP.md)
