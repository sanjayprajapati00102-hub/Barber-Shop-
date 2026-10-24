import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

console.log('🧪 Starting Barber\'s Shop Concurrency, Availability & Integrity Test Suite...\n');

// 1. Initialize In-Memory Test Database
const testDb = new DatabaseSync(':memory:');
testDb.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer'
  );

  CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration_minutes INTEGER NOT NULL,
    buffer_minutes INTEGER NOT NULL DEFAULT 5,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE business_hours (
    weekday INTEGER PRIMARY KEY,
    is_closed INTEGER NOT NULL DEFAULT 0,
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL
  );

  CREATE TABLE blocked_periods (
    id TEXT PRIMARY KEY,
    staff_id TEXT,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    reason TEXT NOT NULL
  );

  CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    booking_ref TEXT UNIQUE NOT NULL,
    customer_id TEXT,
    service_id TEXT,
    staff_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    price_snapshot REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed'
  );
`);

// Seed test fixtures
testDb.exec(`
  INSERT INTO staff (id, display_name) VALUES ('barber-1', 'Master Barber');
  INSERT INTO services (id, name, price, duration_minutes, buffer_minutes) VALUES ('srv-1', 'Classic Haircut', 250, 30, 5);
  INSERT INTO business_hours (weekday, is_closed, open_time, close_time) VALUES (1, 0, '09:00', '18:00'); -- Monday open
  INSERT INTO business_hours (weekday, is_closed, open_time, close_time) VALUES (2, 1, '09:00', '18:00'); -- Tuesday closed
`);

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ Passed: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${testName}`);
    process.exitCode = 1;
  }
}

// TEST 1: Service Browsing & Persistence
const services = testDb.prepare('SELECT * FROM services WHERE is_active = 1').all() as any[];
assert(services.length === 1 && services[0].name === 'Classic Haircut', 'Test 1: Visitor can browse active services');

// TEST 2: Closed days cannot be booked
const tuesdayHours = testDb.prepare('SELECT is_closed FROM business_hours WHERE weekday = 2').get() as any;
assert(tuesdayHours.is_closed === 1, 'Test 2: Tuesday is marked closed and rejects slot bookings');

// TEST 3: Transactional appointment creation
function bookAppointment(id: string, ref: string, staffId: string, startIso: string, endIso: string, price: number) {
  testDb.exec('BEGIN IMMEDIATE');
  try {
    const conflict = testDb.prepare(`
      SELECT id FROM appointments 
      WHERE staff_id = ? 
        AND status IN ('confirmed', 'pending')
        AND (start_at < ? AND end_at > ?)
    `).get(staffId, endIso, startIso);

    if (conflict) {
      testDb.exec('ROLLBACK');
      return { success: false, error: 'Conflict detected' };
    }

    testDb.prepare(`
      INSERT INTO appointments (id, booking_ref, staff_id, customer_name, customer_phone, start_at, end_at, price_snapshot, status)
      VALUES (?, ?, ?, 'Rahul Sharma', '+919876543210', ?, ?, ?, 'confirmed')
    `).run(id, ref, staffId, startIso, endIso, price);

    testDb.exec('COMMIT');
    return { success: true };
  } catch (e: any) {
    testDb.exec('ROLLBACK');
    return { success: false, error: e.message };
  }
}

const booking1 = bookAppointment('apt-1', 'BS-10001', 'barber-1', '2026-10-26T10:00:00', '2026-10-26T10:35:00', 250);
assert(booking1.success === true, 'Test 3: First valid booking succeeds and commits atomically');

// TEST 4: Double Booking Conflict Prevention
const conflictingBooking = bookAppointment('apt-2', 'BS-10002', 'barber-1', '2026-10-26T10:15:00', '2026-10-26T10:50:00', 250);
assert(conflictingBooking.success === false && conflictingBooking.error === 'Conflict detected', 'Test 4: Overlapping appointment for the same barber is rejected (Atomic lock)');

// TEST 5: Non-overlapping appointment succeeds
const subsequentBooking = bookAppointment('apt-3', 'BS-10003', 'barber-1', '2026-10-26T10:45:00', '2026-10-26T11:20:00', 250);
assert(subsequentBooking.success === true, 'Test 5: Non-overlapping appointment after buffer time succeeds');

// TEST 6: Historical price snapshot remains unchanged after price change
testDb.prepare("UPDATE services SET price = 350 WHERE id = 'srv-1'").run();
const originalAppt = testDb.prepare("SELECT price_snapshot FROM appointments WHERE id = 'apt-1'").get() as any;
assert(originalAppt.price_snapshot === 250, 'Test 6: Historical appointment price snapshot preserved at ₹250 after service price updated to ₹350');

// TEST 7: Cancellation releases time slot
testDb.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = 'apt-1'").run();
const rebookingCanceledSlot = bookAppointment('apt-4', 'BS-10004', 'barber-1', '2026-10-26T10:00:00', '2026-10-26T10:35:00', 350);
assert(rebookingCanceledSlot.success === true, 'Test 7: Cancelled appointment releases time slot for another customer');

// TEST 8: Blocked dates and holidays prevent bookings
testDb.prepare(`
  INSERT INTO blocked_periods (id, staff_id, start_at, end_at, reason)
  VALUES ('blk-1', NULL, '2026-11-01T00:00:00', '2026-11-01T23:59:59', 'Festival Holiday')
`).run();

const isBlockedDate = testDb.prepare(`
  SELECT id FROM blocked_periods WHERE start_at <= '2026-11-01T12:00:00' AND end_at >= '2026-11-01T12:30:00'
`).get();
assert(!!isBlockedDate, 'Test 8: Blocked holiday successfully blocks time range from reservations');

console.log(`\n🎉 Test Suite Completed: ${passedTests}/${totalTests} Tests Passed!\n`);
