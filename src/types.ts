export interface BusinessSettings {
  id: number;
  business_name: string;
  description: string;
  address: string;
  maps_url: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  currency_symbol: string;
  booking_interval_minutes: number;
  min_notice_hours: number;
  max_horizon_days: number;
  cancellation_policy: string;
  is_name_verified: number;
  is_phone_verified: number;
  is_hours_verified: number;
  is_services_verified: number;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  duration_minutes: number;
  buffer_minutes: number;
  category: string;
  image_url?: string | null;
  is_active: number;
  is_featured: number;
  display_order: number;
}

export interface Staff {
  id: string;
  display_name: string;
  role_title: string;
  bio?: string | null;
  image_url?: string | null;
  is_active: number;
}

export interface BusinessHour {
  weekday: number;
  is_closed: number;
  open_time: string;
  close_time: string;
  break_start?: string | null;
  break_end?: string | null;
}

export interface BlockedPeriod {
  id: string;
  staff_id?: string | null;
  staff_name?: string | null;
  start_at: string;
  end_at: string;
  reason: string;
}

export interface Appointment {
  id: string;
  booking_ref: string;
  customer_id?: string | null;
  service_id: string;
  staff_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  customer_notes?: string | null;
  start_at: string;
  end_at: string;
  price_snapshot: number;
  service_name_snapshot: string;
  duration_snapshot: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';
  cancellation_reason?: string | null;
  staff_name?: string | null;
  service_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
  fullName: string;
  phone?: string | null;
}

export interface DashboardStats {
  todayCount: number;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
  actualRevenue: number;
  estimatedBookingValue: number;
  totalCustomers: number;
  dailyTrends: Array<{ day: string; bookings: number; revenue: number }>;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
  availableStaffCount: number;
}

export interface Inquiry {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  service_name?: string | null;
  preferred_date?: string | null;
  message: string;
  status: 'new' | 'contacted' | 'resolved';
  supabase_synced: number;
  supabase_id?: string | null;
  created_at: string;
}
