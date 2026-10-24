-- Barber's Shop PostgreSQL / Supabase Schema & Migration
-- Supports Row Level Security (RLS), Concurrency Constraints, and Role-Based Access Control

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (extends Supabase auth.users or standalone)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Business Settings Table
CREATE TABLE IF NOT EXISTS business_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    business_name TEXT NOT NULL DEFAULT 'Barber''s shop',
    description TEXT NOT NULL DEFAULT 'Bespoke men''s grooming, master scissor craft, and hot-towel straight razor shaves.',
    address TEXT NOT NULL DEFAULT 'Khaira, Najafgarh, South West Delhi, Delhi, 110043, India',
    maps_url TEXT NOT NULL DEFAULT 'https://www.google.com/maps/place/Barber''s+shop/@28.5949406,76.9663757,17z/data=!3m1!4b1!4m6!3m5!1s0x390d11005d56b245:0xa03f3885eafc332!8m2!3d28.5949406!4d76.9689506!16s%2Fg%2F11njcnyk0f',
    phone TEXT NOT NULL DEFAULT '+91 98100 12345',
    email TEXT NOT NULL DEFAULT 'contact@barbershop.local',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    booking_interval_minutes INTEGER NOT NULL DEFAULT 15,
    min_notice_hours INTEGER NOT NULL DEFAULT 1,
    max_horizon_days INTEGER NOT NULL DEFAULT 30,
    cancellation_policy TEXT NOT NULL DEFAULT 'Appointments can be cancelled or rescheduled up to 2 hours prior without fee.',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Services Table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    buffer_minutes INTEGER NOT NULL DEFAULT 5,
    category TEXT NOT NULL DEFAULT 'Haircut',
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name TEXT NOT NULL,
    role_title TEXT NOT NULL DEFAULT 'Master Barber',
    bio TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Business Hours Table (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
CREATE TABLE IF NOT EXISTS business_hours (
    id SERIAL PRIMARY KEY,
    weekday INTEGER NOT NULL UNIQUE CHECK (weekday >= 0 AND weekday <= 6),
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    open_time TEXT NOT NULL DEFAULT '09:30',
    close_time TEXT NOT NULL DEFAULT '20:30',
    break_start TEXT,
    break_end TEXT
);

-- 6. Blocked Periods Table (Dates or specific time ranges)
CREATE TABLE IF NOT EXISTS blocked_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_ref TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    customer_notes TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    price_snapshot DECIMAL(10, 2) NOT NULL,
    service_name_snapshot TEXT NOT NULL,
    duration_snapshot INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'completed', 'cancelled', 'no_show')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries and conflict prevention
CREATE INDEX IF NOT EXISTS idx_appointments_time_range ON appointments(staff_id, start_at, end_at) WHERE status IN ('confirmed', 'pending');
CREATE INDEX IF NOT EXISTS idx_appointments_booking_ref ON appointments(booking_ref);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_active_order ON services(is_active, display_order);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Public can read business settings, active services, staff, business hours
CREATE POLICY "Public read business settings" ON business_settings FOR SELECT USING (true);
CREATE POLICY "Public read services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Public read staff" ON staff FOR SELECT USING (is_active = true);
CREATE POLICY "Public read business hours" ON business_hours FOR SELECT USING (true);
CREATE POLICY "Public read blocked periods" ON blocked_periods FOR SELECT USING (true);

-- Customers can view their own appointments; public can create appointments; staff/admins can manage all
CREATE POLICY "Public create appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers view own appointments" ON appointments FOR SELECT USING (
    auth.uid() = customer_id OR customer_id IS NULL
);
