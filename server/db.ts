import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'barbershop.db');
export const db = new DatabaseSync(DB_PATH);

// Configure SQLite for high performance and integrity
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

// Initialize Database Tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT NOT NULL DEFAULT 'Barber''s shop',
      description TEXT NOT NULL DEFAULT 'Bespoke grooming, traditional straight-razor hot-towel shaves, and modern master hair styling.',
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
      cancellation_policy TEXT NOT NULL DEFAULT 'Free cancellation up to 2 hours before your scheduled appointment time.',
      is_name_verified INTEGER NOT NULL DEFAULT 0,
      is_phone_verified INTEGER NOT NULL DEFAULT 0,
      is_hours_verified INTEGER NOT NULL DEFAULT 0,
      is_services_verified INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      duration_minutes INTEGER NOT NULL,
      buffer_minutes INTEGER NOT NULL DEFAULT 5,
      category TEXT NOT NULL DEFAULT 'Haircut',
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      role_title TEXT NOT NULL DEFAULT 'Master Barber',
      bio TEXT,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_hours (
      weekday INTEGER PRIMARY KEY CHECK (weekday >= 0 AND weekday <= 6),
      is_closed INTEGER NOT NULL DEFAULT 0,
      open_time TEXT NOT NULL DEFAULT '09:30',
      close_time TEXT NOT NULL DEFAULT '20:30',
      break_start TEXT,
      break_end TEXT
    );

    CREATE TABLE IF NOT EXISTS blocked_periods (
      id TEXT PRIMARY KEY,
      staff_id TEXT REFERENCES staff(id) ON DELETE CASCADE,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      booking_ref TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      service_id TEXT REFERENCES services(id) ON DELETE RESTRICT,
      staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      customer_notes TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      price_snapshot REAL NOT NULL,
      service_name_snapshot TEXT NOT NULL,
      duration_snapshot INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'completed', 'cancelled', 'no_show')),
      cancellation_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      service_name TEXT,
      preferred_date TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      supabase_synced INTEGER NOT NULL DEFAULT 0,
      supabase_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default business settings
  const existingSettings = db.prepare('SELECT id FROM business_settings WHERE id = 1').get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO business_settings (
        id, business_name, description, address, maps_url, phone, email, 
        timezone, currency, currency_symbol, booking_interval_minutes, min_notice_hours, 
        max_horizon_days, cancellation_policy, is_name_verified, is_phone_verified, is_hours_verified, is_services_verified
      ) VALUES (
        1, 'Barber''s shop', 
        'Bespoke grooming, traditional straight-razor hot-towel shaves, and modern master hair styling located in Khaira, Najafgarh, New Delhi.',
        'Khaira, Najafgarh, South West Delhi, Delhi, 110043, India',
        'https://www.google.com/maps/place/Barber''s+shop/@28.5949406,76.9663757,17z/data=!3m1!4b1!4m6!3m5!1s0x390d11005d56b245:0xa03f3885eafc332!8m2!3d28.5949406!4d76.9689506!16s%2Fg%2F11njcnyk0f',
        '+91 98100 12345',
        'contact@barbershop.local',
        'Asia/Kolkata', 'INR', '₹', 15, 1, 30,
        'Appointments can be cancelled or rescheduled up to 2 hours prior to scheduled start time.',
        0, 0, 0, 0
      )
    `).run();
  }

  // Seed default admin account
  const existingAdmin = db.prepare('SELECT id FROM profiles WHERE email = ?').get('admin@barbershop.local');
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('AdminPassword123!', salt);
    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin-default-id', 'admin@barbershop.local', passwordHash, 'Shop Owner / Admin', '+91 98100 12345', 'admin');
  }

  // Seed default staff
  const staffCount = (db.prepare('SELECT count(*) as count FROM staff').get() as { count: number }).count;
  if (staffCount === 0) {
    db.prepare(`
      INSERT INTO staff (id, display_name, role_title, bio, image_url, is_active)
      VALUES 
        ('staff-master', 'Master Barber', 'Head Grooming Artisan', 'Specialist in scissor craftsmanship, razor fades, and traditional beard shaping.', '/src/assets/images/hero_barber_craft_1792471150916.jpg', 1),
        ('staff-senior', 'Senior Stylist', 'Precision Stylist', 'Expert in contemporary men''s styling, texture cuts, and scalp treatments.', '/src/assets/images/service_classic_cut_1792471151011.jpg', 1)
    `).run();
  }

  // Seed business hours (0=Sun, 1=Mon, ..., 6=Sat)
  const hoursCount = (db.prepare('SELECT count(*) as count FROM business_hours').get() as { count: number }).count;
  if (hoursCount === 0) {
    const insertHour = db.prepare(`
      INSERT INTO business_hours (weekday, is_closed, open_time, close_time, break_start, break_end)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    // Sunday
    insertHour.run(0, 0, '09:00', '21:00', '14:00', '14:45');
    // Monday
    insertHour.run(1, 0, '09:30', '20:30', '13:30', '14:15');
    // Tuesday (often relaxed / partial hours in local Indian shops)
    insertHour.run(2, 0, '10:00', '18:00', null, null);
    // Wednesday
    insertHour.run(3, 0, '09:30', '20:30', '13:30', '14:15');
    // Thursday
    insertHour.run(4, 0, '09:30', '20:30', '13:30', '14:15');
    // Friday
    insertHour.run(5, 0, '09:30', '20:30', '13:30', '14:15');
    // Saturday
    insertHour.run(6, 0, '09:00', '21:00', '14:00', '14:45');
  }

  // Seed default curated services with authentic generated imagery
  const servicesCount = (db.prepare('SELECT count(*) as count FROM services').get() as { count: number }).count;
  if (servicesCount === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (id, name, slug, description, price, duration_minutes, buffer_minutes, category, image_url, is_active, is_featured, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertService.run(
      'srv-classic-cut',
      'Classic Scissor Cut & Styling',
      'classic-scissor-cut',
      'Precision haircut tailored to head shape and hair texture, finished with neck shave, tonic, and natural style.',
      250,
      30,
      5,
      'Haircut',
      '/src/assets/images/service_classic_cut_1792471151011.jpg',
      1,
      1,
      1
    );

    insertService.run(
      'srv-fade-style',
      'Skin Fade & Textured Crop',
      'skin-fade-textured-crop',
      'Seamless gradient skin fade with foil shaver detailing, customized crown texture, and matte clay finish.',
      350,
      40,
      5,
      'Haircut',
      '/src/assets/images/hero_barber_craft_1792471150916.jpg',
      1,
      1,
      2
    );

    insertService.run(
      'srv-royal-shave',
      'Traditional Hot Towel Royal Shave',
      'royal-hot-towel-shave',
      'Classic double hot towel ritual with pre-shave essential oils, rich badger-bristle warm lather, straight-razor shave, and cold towel astringent.',
      200,
      25,
      5,
      'Shave',
      '/src/assets/images/service_royal_shave_1792471151578.jpg',
      1,
      1,
      3
    );

    insertService.run(
      'srv-beard-sculpt',
      'Beard Sculpting & Razor Line',
      'beard-sculpting-razor-line',
      'Detailed length grading, scissor de-bulking, cheek and neck straight razor outline, treated with organic beard elixir.',
      180,
      20,
      5,
      'Beard',
      '/src/assets/images/service_beard_sculpt_1792471152507.jpg',
      1,
      0,
      4
    );

    insertService.run(
      'srv-executive',
      'The Grand Executive Experience',
      'grand-executive-experience',
      'The definitive grooming session: bespoke haircut, hot-towel straight razor shave or beard contour, purifying facial steam, and invigorating scalp massage.',
      650,
      75,
      10,
      'Packages',
      '/src/assets/images/barber_shop_interior_1792471152693.jpg',
      1,
      1,
      5
    );

    insertService.run(
      'srv-head-shave',
      'Traditional Straight Razor Head Shave',
      'straight-razor-head-shave',
      'Silky smooth head shave with pre-shave oils, rich lather, precision razor pass, and soothing cooling balm.',
      250,
      30,
      5,
      'Shave',
      '/src/assets/images/service_royal_shave_1792471151578.jpg',
      1,
      0,
      6
    );
  }
}
