-- Fleet Management System v2 - Extended Schema
-- Run after schema.sql

-- =============================================
-- MAINTENANCE MANAGEMENT
-- =============================================
CREATE TABLE IF NOT EXISTS maintenance_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    interval_km INTEGER,           -- trigger every X km
    interval_days INTEGER,         -- trigger every X days
    estimated_cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    maintenance_type_id UUID REFERENCES maintenance_types(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
    scheduled_date DATE,
    completed_date DATE,
    odometer_at_service DECIMAL(12,2),
    next_service_km DECIMAL(12,2),
    next_service_date DATE,
    cost DECIMAL(10,2),
    workshop VARCHAR(255),
    technician VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    maintenance_type_id UUID REFERENCES maintenance_types(id),
    title VARCHAR(255) NOT NULL,
    due_date DATE,
    due_km DECIMAL(12,2),
    is_sent BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- DISPATCH / TASKS
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','completed','cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    -- Pickup
    pickup_address TEXT,
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    pickup_time TIMESTAMP,
    -- Delivery
    delivery_address TEXT,
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),
    delivery_time TIMESTAMP,
    -- Actual times
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    -- Customer info
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    -- Tracking
    distance_km DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    status VARCHAR(50),
    message TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- DRIVER BEHAVIOR SCORING
-- =============================================
CREATE TABLE IF NOT EXISTS driver_behavior_events (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,  -- harsh_brake, harsh_accel, sharp_turn, speeding, idle_long
    severity VARCHAR(20) DEFAULT 'warning',
    value DECIMAL(8,2),                -- actual value (speed, g-force, etc.)
    threshold DECIMAL(8,2),            -- configured threshold
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    points_deducted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    score_date DATE NOT NULL,
    total_score INTEGER DEFAULT 100,   -- starts at 100
    speeding_events INTEGER DEFAULT 0,
    harsh_brake_events INTEGER DEFAULT 0,
    harsh_accel_events INTEGER DEFAULT 0,
    idle_time_minutes INTEGER DEFAULT 0,
    total_distance DECIMAL(10,2) DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    grade VARCHAR(5),                  -- A, B, C, D, F
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(driver_id, score_date)
);

-- =============================================
-- FUEL MANAGEMENT
-- =============================================
CREATE TABLE IF NOT EXISTS fuel_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    fuel_date TIMESTAMP DEFAULT NOW(),
    liters DECIMAL(8,2) NOT NULL,
    cost_per_liter DECIMAL(6,3),
    total_cost DECIMAL(10,2),
    odometer DECIMAL(12,2),
    station_name VARCHAR(255),
    fuel_type VARCHAR(50) DEFAULT 'gasoline',
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_theft_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    detected_at TIMESTAMP DEFAULT NOW(),
    fuel_before DECIMAL(5,2),
    fuel_after DECIMAL(5,2),
    drop_amount DECIMAL(5,2),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_confirmed BOOLEAN DEFAULT false,
    notes TEXT
);

-- =============================================
-- TEMPERATURE MONITORING
-- =============================================
CREATE TABLE IF NOT EXISTS temperature_sensors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    sensor_name VARCHAR(100) NOT NULL,
    sensor_name_ar VARCHAR(100),
    min_temp DECIMAL(5,2) DEFAULT -20,
    max_temp DECIMAL(5,2) DEFAULT 8,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS temperature_readings (
    id BIGSERIAL,
    sensor_id UUID REFERENCES temperature_sensors(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    temperature DECIMAL(5,2) NOT NULL,
    humidity DECIMAL(5,2),
    is_alert BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE temperature_readings_2025 PARTITION OF temperature_readings
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE temperature_readings_2026 PARTITION OF temperature_readings
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- =============================================
-- COMPANIES (SaaS Multi-tenant) - extend existing
-- =============================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'basic';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_expires DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Oman';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;

-- =============================================
-- WHATSAPP NOTIFICATIONS LOG
-- =============================================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- HEAT MAP DATA (aggregated)
-- =============================================
CREATE TABLE IF NOT EXISTS heatmap_data (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    lat_grid DECIMAL(6,4),   -- rounded to 4 decimals for grid
    lng_grid DECIMAL(7,4),
    visit_count INTEGER DEFAULT 1,
    date_bucket DATE DEFAULT CURRENT_DATE,
    UNIQUE(company_id, vehicle_id, lat_grid, lng_grid, date_bucket)
);

-- =============================================
-- COMPLIANCE REPORTS
-- =============================================
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,  -- daily_hours, weekly_summary, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_by UUID REFERENCES users(id),
    file_path VARCHAR(500),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON tasks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_behavior_driver ON driver_behavior_events(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_scores_date ON driver_scores(driver_id, score_date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id, fuel_date DESC);
CREATE INDEX IF NOT EXISTS idx_temp_readings_sensor ON temperature_readings(sensor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_heatmap_company ON heatmap_data(company_id, date_bucket);

-- Triggers
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
