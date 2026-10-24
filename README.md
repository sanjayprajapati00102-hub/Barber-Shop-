# Barber's Shop — Bespoke Men's Grooming & Booking Platform

A production-grade, full-stack website and appointment management platform crafted for **Barber's shop**, located at Khaira, Najafgarh, South West Delhi, India.

---

## 1. Verified Business Research & Identity

- **Official Name**: Barber's shop *(provisionally styled with an owner confirmation setting in Admin)*
- **Coordinates**: `28.5949406° N, 76.9689506° E`
- **Location**: Khaira, Najafgarh, South West Delhi, Delhi, 110043, India
- **Google Maps Reference**: [Google Maps Profile](https://www.google.com/maps/place/Barber's+shop/@28.5949406,76.9663757,17z/data=!3m1!4b1!4m6!3m5!1s0x390d11005d56b245:0xa03f3885eafc332!8m2!3d28.5949406!4d76.9689506!16s%2Fg%2F11njcnyk0f)
- **Timezone**: `Asia/Kolkata` (IST)
- **Currency**: `INR` (₹)
- **Review Policy**: Reviews and ratings are referenced transparently to the verified Google Maps listing without fabricating testimonials or artificial star ratings.

---

## 2. Technology Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js 22, Express.js server mounting Vite middlewares in development.
- **Database Persistence**:
  - **Embedded Persistent ACID SQL**: Built-in `node:sqlite` in Node 22 with WAL mode (`./data/barbershop.db`), transactional locking (`BEGIN IMMEDIATE`), and foreign key constraints.
  - **PostgreSQL / Supabase Migration**: Full migration file with Row Level Security (RLS) located in `supabase/migrations/20261020000000_barber_shop_schema.sql`.
- **Authentication**: HMAC-SHA256 signed tokens with bcrypt password hashing for administrators and registered customers. Guest bookings are also supported via unique 5-character booking references (`BS-XXXXX`).

---

## 3. Concurrency Control & Double-Booking Prevention

1. **Transactional Atomic Locking**:
   When reservations are submitted, the backend starts an atomic transaction (`BEGIN IMMEDIATE`). It checks whether any existing `confirmed` or `pending` appointment overlaps with the requested interval for the designated barber.
2. **Dynamic Slot Generation**:
   Slots respect business opening hours, staff working hours, scheduled lunch breaks, buffer turnover times (5–10 mins), existing bookings, same-day minimum notice limits (default: 1 hour), and administrator-blocked dates/holidays.
3. **Immutable Price Snapshots**:
   Each appointment captures `price_snapshot`, `duration_snapshot`, and `service_name_snapshot` at the time of reservation. Future price adjustments never corrupt historical client bookings.
4. **Slot Release on Cancellation**:
   When an appointment is cancelled, its time slot is immediately released and available for other clients.

---

## 4. Default Administrator Credentials

On initial database boot, a secure administrator account is initialized:

- **Email**: `admin@barbershop.local`
- **Password**: `AdminPassword123!`
- **Access Route**: Click **"Admin Portal"** in the top navigation or footer.

*Note: The password can be updated in the Admin Suite.*

---

## 5. Environment Variables (`.env.example`)

```env
# Server Port
PORT=3000

# Authentication Secret
JWT_SECRET="barbershop-luxury-craft-jwt-secret-key-production-change-me"

# Persistent SQLite Database Path
DATABASE_PATH="./data/barbershop.db"

# Connected Supabase Integration (Project: tntnxvnytnxxwyzszikh)
VITE_SUPABASE_URL="https://tntnxvnytnxxwyzszikh.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_dRvPp77NlutYREfkn63aGw_Kvi78Wqo"
SUPABASE_URL="https://tntnxvnytnxxwyzszikh.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_dRvPp77NlutYREfkn63aGw_Kvi78Wqo"
```

---

## 6. Local Development & Production Commands

- **Run Dev Server (Full-Stack Express + Vite on port 3000)**:
  ```bash
  npm run dev
  ```
- **Run Unit & Concurrency Test Suite**:
  ```bash
  npx tsx test/booking-engine.test.ts
  ```
- **Type Check & Linting**:
  ```bash
  npm run lint
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
- **Start Production Server**:
  ```bash
  npm run start
  ```

---

## 7. Business Owner Verification Checklist

To complete onboarding, the shop owner can log in to the **Admin Suite > Settings & Verification** to confirm or adjust:
- [ ] Official business name styling.
- [ ] Primary phone number for customer inquiries.
- [ ] Weekly operating hours for Sunday through Saturday.
- [ ] Service menu items, prices (in INR), and service durations.
- [ ] Block upcoming festival dates or holiday closures.
