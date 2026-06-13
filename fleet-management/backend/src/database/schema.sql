-- Fleet Management System - Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS & AUTHENTICATION
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'ar',
    theme VARCHAR(10) DEFAULT 'light',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- COMPANIES (Multi-tenant support)
-- =============================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    logo_url VARCHAR(500),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    max_vehicles INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Link users to companies
CREATE TABLE IF NOT EXISTS user_companies (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user',
    PRIMARY KEY (user_id, company_id)
);

-- =============================================
-- DRIVERS
-- =============================================
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    full_name_ar VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    license_number VARCHAR(100),
    license_expiry DATE,
    photo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- VEHICLE GROUPS
-- =============================================
CREATE TABLE IF NOT EXISTS vehicle_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    color VARCHAR(20) DEFAULT '#3B82F6',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- VEHICLES
-- =============================================
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    group_id UUID REFERENCES vehicle_groups(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    vin VARCHAR(100),
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    photo_url VARCHAR(500),
    fuel_type VARCHAR(50) DEFAULT 'gasoline',
    max_speed INTEGER DEFAULT 120,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- GPS DEVICES
-- =============================================
CREATE TABLE IF NOT EXISTS gps_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    imei VARCHAR(100) UNIQUE NOT NULL,
    device_type VARCHAR(100), -- Teltonika, Concox, Queclink
    model VARCHAR(100),
    sim_number VARCHAR(50),
    firmware_version VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- GPS POSITIONS (Main tracking table - partitioned by month)
-- =============================================
CREATE TABLE IF NOT EXISTS gps_positions (
    id BIGSERIAL,
    device_id UUID,
    vehicle_id UUID,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude DECIMAL(8, 2) DEFAULT 0,
    speed DECIMAL(6, 2) DEFAULT 0,
    heading DECIMAL(5, 2) DEFAULT 0,
    accuracy DECIMAL(6, 2),
    satellites INTEGER DEFAULT 0,
    fuel_level DECIMAL(5, 2),
    engine_status BOOLEAN DEFAULT false,
    ignition BOOLEAN DEFAULT false,
    odometer DECIMAL(12, 2),
    battery_voltage DECIMAL(5, 2),
    gsm_signal INTEGER,
    raw_data JSONB,
    server_time TIMESTAMP DEFAULT NOW(),
    device_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for performance
CREATE TABLE gps_positions_2024_01 PARTITION OF gps_positions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE gps_positions_2024_12 PARTITION OF gps_positions
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE gps_positions_2025_01 PARTITION OF gps_positions
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE gps_positions_2025_06 PARTITION OF gps_positions
    FOR VALUES FROM ('2025-06-01') TO ('2026-01-01');
CREATE TABLE gps_positions_2026_01 PARTITION OF gps_positions
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- =============================================
-- LATEST POSITIONS (for real-time dashboard)
-- =============================================
CREATE TABLE IF NOT EXISTS vehicle_latest_position (
    vehicle_id UUID PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES gps_devices(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    speed DECIMAL(6, 2) DEFAULT 0,
    heading DECIMAL(5, 2) DEFAULT 0,
    fuel_level DECIMAL(5, 2),
    engine_status BOOLEAN DEFAULT false,
    ignition BOOLEAN DEFAULT false,
    odometer DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'offline', -- moving, stopped, idle, offline
    address TEXT,                          -- Reverse geocoded address
    last_update TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- GEOFENCES
-- =============================================
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    type VARCHAR(50) DEFAULT 'polygon' CHECK (type IN ('circle', 'polygon', 'rectangle')),
    coordinates JSONB NOT NULL,            -- GeoJSON format
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    radius DECIMAL(10, 2),                 -- meters (for circle type)
    color VARCHAR(20) DEFAULT '#EF4444',
    alert_on_enter BOOLEAN DEFAULT true,
    alert_on_exit BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Link geofences to vehicles
CREATE TABLE IF NOT EXISTS geofence_vehicles (
    geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    PRIMARY KEY (geofence_id, vehicle_id)
);

-- =============================================
-- ALERTS CONFIGURATION
-- =============================================
CREATE TABLE IF NOT EXISTS alert_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,      -- speed, geofence, disconnect, engine, etc.
    threshold_value DECIMAL(10, 2),        -- e.g., speed limit
    is_active BOOLEAN DEFAULT true,
    notify_email BOOLEAN DEFAULT true,
    notify_sms BOOLEAN DEFAULT false,
    notify_push BOOLEAN DEFAULT true,
    recipients JSONB,                      -- email/phone list
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ALERTS LOG
-- =============================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    message TEXT,
    message_ar TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    speed DECIMAL(6, 2),
    geofence_id UUID REFERENCES geofences(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    notified_email BOOLEAN DEFAULT false,
    notified_sms BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TRIPS
-- =============================================
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    start_lat DECIMAL(10, 8),
    start_lng DECIMAL(11, 8),
    end_lat DECIMAL(10, 8),
    end_lng DECIMAL(11, 8),
    start_address TEXT,
    end_address TEXT,
    distance DECIMAL(10, 2) DEFAULT 0,     -- km
    duration INTEGER DEFAULT 0,            -- seconds
    max_speed DECIMAL(6, 2) DEFAULT 0,
    avg_speed DECIMAL(6, 2) DEFAULT 0,
    fuel_consumed DECIMAL(8, 2),
    idle_time INTEGER DEFAULT 0,           -- seconds
    is_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- AUDIT LOG
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- REFRESH TOKENS
-- =============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_gps_positions_vehicle_time ON gps_positions(vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_positions_device_time ON gps_positions(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_company_read ON alerts(company_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_time ON trips(vehicle_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_devices_imei ON gps_devices(imei);

-- =============================================
-- UPDATED_AT trigger function
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
