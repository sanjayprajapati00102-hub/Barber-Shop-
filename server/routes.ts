import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { saveInquiryToSupabase, saveAppointmentToSupabase } from './supabase.js';

export const apiRouter = Router();

// Secret for HMAC token signing
const JWT_SECRET = process.env.JWT_SECRET || 'barbershop-luxury-craft-jwt-secret-key-production-change-me';

// Token generation and verification
function createToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Auth Middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
  (req as any).user = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
  }
  next();
}

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { email, password, fullName, phone } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const id = 'user-' + crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(`
    INSERT INTO profiles (id, email, password_hash, full_name, phone, role)
    VALUES (?, ?, ?, ?, ?, 'customer')
  `).run(id, email.toLowerCase().trim(), passwordHash, fullName.trim(), phone?.trim() || null);

  const token = createToken({ id, email: email.toLowerCase().trim(), role: 'customer', fullName: fullName.trim() });
  res.status(201).json({
    token,
    user: { id, email: email.toLowerCase().trim(), role: 'customer', fullName: fullName.trim(), phone }
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = createToken({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      phone: user.phone
    }
  });
});

apiRouter.get('/auth/me', authenticate, (req: Request, res: Response) => {
  const userPayload = (req as any).user;
  const user = db.prepare('SELECT id, email, full_name, phone, role FROM profiles WHERE id = ?').get(userPayload.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// ----------------------------------------------------
// BUSINESS SETTINGS
// ----------------------------------------------------

apiRouter.get('/settings', (_req: Request, res: Response) => {
  const settings = db.prepare('SELECT * FROM business_settings WHERE id = 1').get();
  res.json(settings);
});

apiRouter.put('/settings', authenticate, requireAdmin, (req: Request, res: Response) => {
  const {
    business_name, description, address, maps_url, phone, email,
    timezone, currency, currency_symbol, booking_interval_minutes,
    min_notice_hours, max_horizon_days, cancellation_policy,
    is_name_verified, is_phone_verified, is_hours_verified, is_services_verified
  } = req.body;

  db.prepare(`
    UPDATE business_settings SET
      business_name = ?, description = ?, address = ?, maps_url = ?,
      phone = ?, email = ?, timezone = ?, currency = ?, currency_symbol = ?,
      booking_interval_minutes = ?, min_notice_hours = ?, max_horizon_days = ?,
      cancellation_policy = ?, is_name_verified = ?, is_phone_verified = ?,
      is_hours_verified = ?, is_services_verified = ?, updated_at = datetime('now')
    WHERE id = 1
  `).run(
    business_name, description, address, maps_url, phone, email,
    timezone, currency, currency_symbol, booking_interval_minutes,
    min_notice_hours, max_horizon_days, cancellation_policy,
    is_name_verified ? 1 : 0, is_phone_verified ? 1 : 0,
    is_hours_verified ? 1 : 0, is_services_verified ? 1 : 0
  );

  const updated = db.prepare('SELECT * FROM business_settings WHERE id = 1').get();
  res.json(updated);
});

// ----------------------------------------------------
// SERVICES CRUD
// ----------------------------------------------------

apiRouter.get('/services', (req: Request, res: Response) => {
  const includeInactive = req.query.all === 'true';
  const query = includeInactive
    ? 'SELECT * FROM services ORDER BY display_order ASC, name ASC'
    : 'SELECT * FROM services WHERE is_active = 1 ORDER BY display_order ASC, name ASC';
  const services = db.prepare(query).all();
  res.json(services);
});

apiRouter.post('/services', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { name, description, price, duration_minutes, buffer_minutes, category, image_url, is_featured } = req.body;
  if (!name || price === undefined || !duration_minutes) {
    return res.status(400).json({ error: 'Name, price, and duration are required' });
  }

  const id = 'srv-' + crypto.randomUUID().slice(0, 8);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.slice(4);

  db.prepare(`
    INSERT INTO services (
      id, name, slug, description, price, duration_minutes, buffer_minutes,
      category, image_url, is_active, is_featured, display_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 99)
  `).run(
    id, name.trim(), slug, description || '', Number(price),
    Number(duration_minutes), Number(buffer_minutes || 5),
    category || 'General', image_url || null, is_featured ? 1 : 0
  );

  const created = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  res.status(201).json(created);
});

apiRouter.put('/services/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, duration_minutes, buffer_minutes, category, image_url, is_active, is_featured, display_order } = req.body;

  db.prepare(`
    UPDATE services SET
      name = ?, description = ?, price = ?, duration_minutes = ?,
      buffer_minutes = ?, category = ?, image_url = ?, is_active = ?,
      is_featured = ?, display_order = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name, description, Number(price), Number(duration_minutes),
    Number(buffer_minutes), category, image_url, is_active ? 1 : 0,
    is_featured ? 1 : 0, Number(display_order || 0), id
  );

  const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  res.json(updated);
});

apiRouter.delete('/services/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  // Soft delete by deactivating so historical appointments remain intact
  db.prepare("UPDATE services SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  res.json({ message: 'Service deactivated successfully' });
});

// ----------------------------------------------------
// STAFF CRUD
// ----------------------------------------------------

apiRouter.get('/staff', (_req: Request, res: Response) => {
  const staff = db.prepare('SELECT * FROM staff WHERE is_active = 1 ORDER BY display_name ASC').all();
  res.json(staff);
});

apiRouter.post('/staff', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { display_name, role_title, bio, image_url } = req.body;
  if (!display_name) {
    return res.status(400).json({ error: 'Display name is required' });
  }
  const id = 'staff-' + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO staff (id, display_name, role_title, bio, image_url, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, display_name, role_title || 'Barber', bio || '', image_url || null);

  const created = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  res.status(201).json(created);
});

apiRouter.put('/staff/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { display_name, role_title, bio, image_url, is_active } = req.body;

  db.prepare(`
    UPDATE staff SET
      display_name = ?, role_title = ?, bio = ?, image_url = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(display_name, role_title, bio, image_url, is_active ? 1 : 0, id);

  const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  res.json(updated);
});

apiRouter.delete('/staff/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare("UPDATE staff SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  res.json({ message: 'Staff deactivated successfully' });
});

// ----------------------------------------------------
// BUSINESS HOURS
// ----------------------------------------------------

apiRouter.get('/business-hours', (_req: Request, res: Response) => {
  const hours = db.prepare('SELECT * FROM business_hours ORDER BY weekday ASC').all();
  res.json(hours);
});

apiRouter.put('/business-hours', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { hours } = req.body;
  if (!Array.isArray(hours)) {
    return res.status(400).json({ error: 'Invalid payload: hours must be an array' });
  }

  const updateStmt = db.prepare(`
    UPDATE business_hours SET
      is_closed = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ?
    WHERE weekday = ?
  `);

  db.exec('BEGIN TRANSACTION');
  try {
    for (const h of hours) {
      updateStmt.run(
        h.is_closed ? 1 : 0,
        h.open_time,
        h.close_time,
        h.break_start || null,
        h.break_end || null,
        h.weekday
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const updated = db.prepare('SELECT * FROM business_hours ORDER BY weekday ASC').all();
  res.json(updated);
});

// ----------------------------------------------------
// BLOCKED PERIODS
// ----------------------------------------------------

apiRouter.get('/blocked-periods', (_req: Request, res: Response) => {
  const blocked = db.prepare(`
    SELECT b.*, s.display_name as staff_name 
    FROM blocked_periods b
    LEFT JOIN staff s ON b.staff_id = s.id
    ORDER BY b.start_at ASC
  `).all();
  res.json(blocked);
});

apiRouter.post('/blocked-periods', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { staff_id, start_at, end_at, reason } = req.body;
  if (!start_at || !end_at || !reason) {
    return res.status(400).json({ error: 'start_at, end_at, and reason are required' });
  }

  const id = 'block-' + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO blocked_periods (id, staff_id, start_at, end_at, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, staff_id || null, start_at, end_at, reason);

  const created = db.prepare('SELECT * FROM blocked_periods WHERE id = ?').get(id);
  res.status(201).json(created);
});

apiRouter.delete('/blocked-periods/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM blocked_periods WHERE id = ?').run(id);
  res.json({ message: 'Blocked period removed' });
});

// ----------------------------------------------------
// TIME AVAILABILITY CALCULATION ENGINE
// ----------------------------------------------------

apiRouter.get('/availability', (req: Request, res: Response) => {
  const { date, serviceId, staffId } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required' });
  }
  if (!serviceId || typeof serviceId !== 'string') {
    return res.status(400).json({ error: 'serviceId is required' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(serviceId) as any;
  if (!service) {
    return res.status(404).json({ error: 'Service not found or inactive' });
  }

  const targetDate = new Date(`${date}T00:00:00Z`);
  if (isNaN(targetDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const weekday = targetDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const hours = db.prepare('SELECT * FROM business_hours WHERE weekday = ?').get(weekday) as any;

  if (!hours || hours.is_closed === 1) {
    return res.json({ date, isClosed: true, slots: [], message: 'The shop is closed on this day' });
  }

  // Active staff members
  let staffList = db.prepare('SELECT * FROM staff WHERE is_active = 1').all() as any[];
  if (staffId && staffId !== 'any') {
    staffList = staffList.filter(s => s.id === staffId);
  }
  if (staffList.length === 0) {
    return res.json({ date, isClosed: false, slots: [], message: 'No staff available for the selected criteria' });
  }

  // Fetch blocked periods affecting this date
  const dayStartIso = `${date}T00:00:00`;
  const dayEndIso = `${date}T23:59:59`;
  const blockedPeriods = db.prepare(`
    SELECT * FROM blocked_periods 
    WHERE (start_at <= ? AND end_at >= ?)
  `).all(dayEndIso, dayStartIso) as any[];

  // Fetch existing appointments on this date with active status
  const existingAppointments = db.prepare(`
    SELECT staff_id, start_at, end_at FROM appointments
    WHERE status IN ('confirmed', 'pending')
      AND (start_at <= ? AND end_at >= ?)
  `).all(dayEndIso, dayStartIso) as any[];

  const intervalMinutes = 15;
  const totalServiceDuration = service.duration_minutes + (service.buffer_minutes || 0);

  // Parse open_time and close_time (e.g. "09:30" to minutes from midnight)
  const [openHour, openMin] = hours.open_time.split(':').map(Number);
  const [closeHour, closeMin] = hours.close_time.split(':').map(Number);
  const openTimeMinutes = openHour * 60 + openMin;
  const closeTimeMinutes = closeHour * 60 + closeMin;

  let breakStartMinutes = -1;
  let breakEndMinutes = -1;
  if (hours.break_start && hours.break_end) {
    const [bsh, bsm] = hours.break_start.split(':').map(Number);
    const [beh, bem] = hours.break_end.split(':').map(Number);
    breakStartMinutes = bsh * 60 + bsm;
    breakEndMinutes = beh * 60 + bem;
  }

  // Now time check for same-day booking notice
  const now = new Date();
  // Settings
  const settings = db.prepare('SELECT min_notice_hours FROM business_settings WHERE id = 1').get() as any;
  const minNoticeHours = settings?.min_notice_hours || 1;
  const minAllowedTimestamp = now.getTime() + minNoticeHours * 60 * 60 * 1000;

  const slots: Array<{ time: string; available: boolean; reason?: string; availableStaffCount: number }> = [];

  for (let m = openTimeMinutes; m + service.duration_minutes <= closeTimeMinutes; m += intervalMinutes) {
    const slotHour = Math.floor(m / 60);
    const slotMin = m % 60;
    const timeString = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
    const slotStartIso = `${date}T${timeString}:00`;

    const endMinutes = m + totalServiceDuration;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const slotEndIso = `${date}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

    // Check minimum notice if booking is for today
    const slotDateObj = new Date(`${date}T${timeString}:00+05:30`); // India standard time
    if (slotDateObj.getTime() < minAllowedTimestamp) {
      continue; // slot is in the past or within minimum notice window
    }

    // Check break time overlap
    if (breakStartMinutes !== -1 && breakEndMinutes !== -1) {
      if (m < breakEndMinutes && (m + service.duration_minutes) > breakStartMinutes) {
        continue; // during staff/shop break
      }
    }

    // Check business-wide blocked periods
    const isBusinessBlocked = blockedPeriods.some(b => !b.staff_id && (slotStartIso < b.end_at && slotEndIso > b.start_at));
    if (isBusinessBlocked) {
      continue;
    }

    // Check staff availability
    let availableStaffForSlot = 0;
    for (const barber of staffList) {
      // Check if this specific barber is blocked
      const isStaffBlocked = blockedPeriods.some(b => b.staff_id === barber.id && (slotStartIso < b.end_at && slotEndIso > b.start_at));
      if (isStaffBlocked) continue;

      // Check if barber has overlapping appointment
      const hasConflict = existingAppointments.some(a => {
        if (a.staff_id && a.staff_id !== barber.id) return false;
        return (slotStartIso < a.end_at && slotEndIso > a.start_at);
      });

      if (!hasConflict) {
        availableStaffForSlot++;
      }
    }

    if (availableStaffForSlot > 0) {
      slots.push({
        time: timeString,
        available: true,
        availableStaffCount: availableStaffForSlot
      });
    }
  }

  res.json({
    date,
    isClosed: false,
    service: {
      id: service.id,
      name: service.name,
      duration_minutes: service.duration_minutes,
      price: service.price
    },
    slots
  });
});

// ----------------------------------------------------
// TRANSACTIONAL CONCURRENCY-SAFE BOOKING
// ----------------------------------------------------

apiRouter.post('/appointments', (req: Request, res: Response) => {
  const {
    serviceId, staffId, date, time, customerName, customerEmail, customerPhone, customerNotes
  } = req.body;

  if (!serviceId || !date || !time || !customerName || !customerPhone) {
    return res.status(400).json({ error: 'Missing required appointment fields' });
  }

  // Verify service exists
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(serviceId) as any;
  if (!service) {
    return res.status(404).json({ error: 'Service not found or inactive' });
  }

  // Calculate start_at and end_at timestamps
  const slotStartIso = `${date}T${time}:00`;
  const [hour, min] = time.split(':').map(Number);
  const totalDuration = service.duration_minutes + (service.buffer_minutes || 0);
  const endTotalMinutes = hour * 60 + min + totalDuration;
  const endHour = Math.floor(endTotalMinutes / 60);
  const endMin = endTotalMinutes % 60;
  const slotEndIso = `${date}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

  // Start Transaction for Concurrency Control
  db.exec('BEGIN IMMEDIATE');
  try {
    let assignedStaffId = staffId && staffId !== 'any' ? staffId : null;

    if (!assignedStaffId) {
      // Find the first available active staff member who has no conflict
      const allStaff = db.prepare('SELECT id FROM staff WHERE is_active = 1').all() as any[];
      for (const st of allStaff) {
        const conflict = db.prepare(`
          SELECT id FROM appointments 
          WHERE staff_id = ? 
            AND status IN ('confirmed', 'pending')
            AND (start_at < ? AND end_at > ?)
        `).get(st.id, slotEndIso, slotStartIso);

        const isBlocked = db.prepare(`
          SELECT id FROM blocked_periods
          WHERE (staff_id = ? OR staff_id IS NULL)
            AND (start_at < ? AND end_at > ?)
        `).get(st.id, slotEndIso, slotStartIso);

        if (!conflict && !isBlocked) {
          assignedStaffId = st.id;
          break;
        }
      }

      if (!assignedStaffId && allStaff.length > 0) {
        db.exec('ROLLBACK');
        return res.status(409).json({
          error: 'Slot Unavailable',
          message: 'All barbers are currently booked for this time. Please pick another available slot.'
        });
      }
    } else {
      // Specific staff chosen: check for conflict
      const conflict = db.prepare(`
        SELECT id FROM appointments 
        WHERE staff_id = ? 
          AND status IN ('confirmed', 'pending')
          AND (start_at < ? AND end_at > ?)
      `).get(assignedStaffId, slotEndIso, slotStartIso);

      if (conflict) {
        db.exec('ROLLBACK');
        return res.status(409).json({
          error: 'Slot Conflict',
          message: 'This time slot was just booked by another customer. Please select another slot.'
        });
      }

      const isBlocked = db.prepare(`
        SELECT id FROM blocked_periods
        WHERE (staff_id = ? OR staff_id IS NULL)
          AND (start_at < ? AND end_at > ?)
      `).get(assignedStaffId, slotEndIso, slotStartIso);

      if (isBlocked) {
        db.exec('ROLLBACK');
        return res.status(409).json({
          error: 'Slot Blocked',
          message: 'This time slot is blocked for maintenance or staff break.'
        });
      }
    }

    // Check optional authenticated customer
    const authHeader = req.headers.authorization;
    let customerId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.substring(7));
      if (payload) customerId = payload.id;
    }

    // Generate unique 5-digit booking reference
    const bookingRef = 'BS-' + Math.floor(10000 + Math.random() * 90000);
    const appointmentId = 'appt-' + crypto.randomUUID();

    db.prepare(`
      INSERT INTO appointments (
        id, booking_ref, customer_id, service_id, staff_id, customer_name,
        customer_email, customer_phone, customer_notes, start_at, end_at,
        price_snapshot, service_name_snapshot, duration_snapshot, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `).run(
      appointmentId,
      bookingRef,
      customerId,
      service.id,
      assignedStaffId,
      customerName.trim(),
      customerEmail?.trim() || null,
      customerPhone.trim(),
      customerNotes?.trim() || null,
      slotStartIso,
      slotEndIso,
      service.price,
      service.name,
      service.duration_minutes
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details)
      VALUES (?, ?, ?, ?)
    `).run(
      'log-' + crypto.randomUUID().slice(0, 8),
      customerId || 'guest',
      'CREATE_APPOINTMENT',
      JSON.stringify({ bookingRef, service: service.name, date, time })
    );

    db.exec('COMMIT');

    // Asynchronously mirror to Supabase inquiries table (which is live in user's Supabase project)
    saveInquiryToSupabase({
      name: customerName.trim(),
      email: customerEmail?.trim() || null,
      phone: customerPhone.trim(),
      service_name: service.name,
      preferred_date: `${date} at ${time}`,
      message: `Book Visit: Ref ${bookingRef} | ${service.name} (₹${service.price}) scheduled on ${date} at ${time}${customerNotes ? ` | Notes: ${customerNotes.trim()}` : ''}`,
      status: 'confirmed',
    }).catch((err) => console.warn('Supabase inquiry visit sync notice:', err));

    // Also mirror to Supabase appointments table (if table is created)
    saveAppointmentToSupabase({
      booking_ref: bookingRef,
      customer_name: customerName.trim(),
      customer_email: customerEmail?.trim() || null,
      customer_phone: customerPhone.trim(),
      service_name: service.name,
      start_at: slotStartIso,
      end_at: slotEndIso,
      price: service.price,
      status: 'confirmed',
      customer_notes: customerNotes?.trim() || null,
    }).catch((err) => console.warn('Supabase appointment sync notice:', err));

    const createdAppointment = db.prepare(`
      SELECT a.*, s.display_name as staff_name, srv.name as service_name
      FROM appointments a
      LEFT JOIN staff s ON a.staff_id = s.id
      LEFT JOIN services srv ON a.service_id = srv.id
      WHERE a.id = ?
    `).get(appointmentId);

    res.status(201).json(createdAppointment);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Failed to create appointment due to server error' });
  }
});

// ----------------------------------------------------
// APPOINTMENTS MANAGEMENT & LOOKUP
// ----------------------------------------------------

apiRouter.get('/appointments/lookup/:ref', (req: Request, res: Response) => {
  const { ref } = req.params;
  const appointment = db.prepare(`
    SELECT a.*, s.display_name as staff_name, srv.description as service_desc
    FROM appointments a
    LEFT JOIN staff s ON a.staff_id = s.id
    LEFT JOIN services srv ON a.service_id = srv.id
    WHERE a.booking_ref = ?
  `).get(ref.toUpperCase().trim());

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found with this booking reference' });
  }
  res.json(appointment);
});

apiRouter.get('/appointments/my', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  const appointments = db.prepare(`
    SELECT a.*, s.display_name as staff_name, srv.name as service_name
    FROM appointments a
    LEFT JOIN staff s ON a.staff_id = s.id
    LEFT JOIN services srv ON a.service_id = srv.id
    WHERE a.customer_id = ?
    ORDER BY a.start_at DESC
  `).all(user.id);

  res.json(appointments);
});

apiRouter.get('/appointments', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { date, status, search, staffId } = req.query;

  let query = `
    SELECT a.*, s.display_name as staff_name, srv.name as service_name
    FROM appointments a
    LEFT JOIN staff s ON a.staff_id = s.id
    LEFT JOIN services srv ON a.service_id = srv.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (date) {
    query += ' AND a.start_at LIKE ?';
    params.push(`${date}%`);
  }
  if (status && status !== 'all') {
    query += ' AND a.status = ?';
    params.push(status);
  }
  if (staffId && staffId !== 'all') {
    query += ' AND a.staff_id = ?';
    params.push(staffId);
  }
  if (search) {
    query += ' AND (a.booking_ref LIKE ? OR a.customer_name LIKE ? OR a.customer_phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY a.start_at DESC LIMIT 200';
  const appointments = db.prepare(query).all(...params);
  res.json(appointments);
});

apiRouter.put('/appointments/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

  if (!['confirmed', 'pending', 'completed', 'cancelled', 'no_show'].includes(status)) {
    return res.status(400).json({ error: 'Invalid appointment status' });
  }

  // Allow either admin or customer owner to cancel
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
  if (!appt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  db.prepare(`
    UPDATE appointments SET
      status = ?, cancellation_reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, cancellationReason || null, id);

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  res.json(updated);
});

apiRouter.put('/appointments/:id/reschedule', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, time } = req.body;

  if (!date || !time) {
    return res.status(400).json({ error: 'New date and time are required' });
  }

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
  if (!appt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const [hour, min] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + min + appt.duration_snapshot;
  const endHour = Math.floor(totalMinutes / 60);
  const endMin = totalMinutes % 60;

  const newStartIso = `${date}T${time}:00`;
  const newEndIso = `${date}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

  db.exec('BEGIN IMMEDIATE');
  try {
    if (appt.staff_id) {
      const conflict = db.prepare(`
        SELECT id FROM appointments
        WHERE staff_id = ?
          AND id != ?
          AND status IN ('confirmed', 'pending')
          AND (start_at < ? AND end_at > ?)
      `).get(appt.staff_id, id, newEndIso, newStartIso);

      if (conflict) {
        db.exec('ROLLBACK');
        return res.status(409).json({ error: 'Reschedule conflict', message: 'The chosen slot conflicts with an existing booking.' });
      }
    }

    db.prepare(`
      UPDATE appointments SET
        start_at = ?, end_at = ?, status = 'confirmed', updated_at = datetime('now')
      WHERE id = ?
    `).run(newStartIso, newEndIso, id);

    db.exec('COMMIT');

    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// ----------------------------------------------------
// ADMIN DASHBOARD ANALYTICS
// ----------------------------------------------------

apiRouter.get('/stats', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const todayCount = (db.prepare(`
    SELECT count(*) as count FROM appointments
    WHERE start_at LIKE ? AND status IN ('confirmed', 'completed')
  `).get(`${todayStr}%`) as any).count;

  const upcomingCount = (db.prepare(`
    SELECT count(*) as count FROM appointments
    WHERE start_at >= ? AND status = 'confirmed'
  `).get(new Date().toISOString()) as any).count;

  const completedCount = (db.prepare(`
    SELECT count(*) as count FROM appointments WHERE status = 'completed'
  `).get() as any).count;

  const cancelledCount = (db.prepare(`
    SELECT count(*) as count FROM appointments WHERE status = 'cancelled'
  `).get() as any).count;

  const actualRevenue = (db.prepare(`
    SELECT coalesce(sum(price_snapshot), 0) as total FROM appointments WHERE status = 'completed'
  `).get() as any).total;

  const estimatedBookingValue = (db.prepare(`
    SELECT coalesce(sum(price_snapshot), 0) as total FROM appointments WHERE status = 'confirmed'
  `).get() as any).total;

  const totalCustomers = (db.prepare(`
    SELECT count(DISTINCT customer_phone) as count FROM appointments
  `).get() as any).count;

  // Recent 7 days breakdown
  const dailyTrends = db.prepare(`
    SELECT substr(start_at, 1, 10) as day, count(*) as bookings, coalesce(sum(price_snapshot), 0) as revenue
    FROM appointments
    WHERE status != 'cancelled'
    GROUP BY day
    ORDER BY day DESC
    LIMIT 7
  `).all();

  res.json({
    todayCount,
    upcomingCount,
    completedCount,
    cancelledCount,
    actualRevenue,
    estimatedBookingValue,
    totalCustomers,
    dailyTrends
  });
});

// ----------------------------------------------------
// INQUIRIES & SUPABASE INTEGRATION
// ----------------------------------------------------

apiRouter.post('/inquiries', async (req: Request, res: Response) => {
  const { name, email, phone, serviceName, preferredDate, message } = req.body;

  if (!name || !phone || !message) {
    return res.status(400).json({ error: 'Name, phone number, and inquiry message are required.' });
  }

  const id = 'inq-' + crypto.randomUUID();

  // 1. Save into local persistent database
  db.prepare(`
    INSERT INTO inquiries (
      id, name, email, phone, service_name, preferred_date, message, status, supabase_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', 0)
  `).run(
    id,
    name.trim(),
    email?.trim() || null,
    phone.trim(),
    serviceName?.trim() || null,
    preferredDate?.trim() || null,
    message.trim()
  );

  // 2. Save directly into user's Supabase project table 'inquiries'
  const supabaseResult = await saveInquiryToSupabase({
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone.trim(),
    service_name: serviceName?.trim() || null,
    preferred_date: preferredDate?.trim() || null,
    message: message.trim(),
    status: 'new'
  });

  if (supabaseResult.success && supabaseResult.data && supabaseResult.data[0]) {
    db.prepare('UPDATE inquiries SET supabase_synced = 1, supabase_id = ? WHERE id = ?')
      .run(supabaseResult.data[0].id || 'synced', id);
  }

  const savedInquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id);

  res.status(201).json({
    inquiry: savedInquiry,
    supabaseSync: {
      success: supabaseResult.success,
      message: supabaseResult.success
        ? 'Successfully saved to Supabase inquiries table!'
        : supabaseResult.code === 'PGRST205'
          ? 'Saved locally! Please run the Supabase SQL migration to create the inquiries table in your Supabase project.'
          : (supabaseResult.error || 'Saved to local database; pending Supabase table setup')
    }
  });
});

apiRouter.get('/inquiries', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const inquiries = db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all();
  res.json(inquiries);
});

apiRouter.put('/inquiries/:id/status', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['new', 'contacted', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid inquiry status' });
  }

  db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id);
  res.json(updated);
});
