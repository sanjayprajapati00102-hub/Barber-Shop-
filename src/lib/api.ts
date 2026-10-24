import {
  BusinessSettings,
  Service,
  Staff,
  BusinessHour,
  BlockedPeriod,
  Appointment,
  UserProfile,
  DashboardStats,
  TimeSlot,
  Inquiry,
} from '../types';

const TOKEN_KEY = 'barbershop_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Settings
  async getSettings(): Promise<BusinessSettings> {
    return fetchJson<BusinessSettings>('/api/settings');
  },
  async updateSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
    return fetchJson<BusinessSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Services
  async getServices(all = false): Promise<Service[]> {
    return fetchJson<Service[]>(`/api/services${all ? '?all=true' : ''}`);
  },
  async createService(data: Partial<Service>): Promise<Service> {
    return fetchJson<Service>('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    return fetchJson<Service>(`/api/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async deleteService(id: string): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/services/${id}`, {
      method: 'DELETE',
    });
  },

  // Staff
  async getStaff(): Promise<Staff[]> {
    return fetchJson<Staff[]>('/api/staff');
  },
  async createStaff(data: Partial<Staff>): Promise<Staff> {
    return fetchJson<Staff>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
    return fetchJson<Staff>(`/api/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async deleteStaff(id: string): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/staff/${id}`, {
      method: 'DELETE',
    });
  },

  // Business Hours
  async getBusinessHours(): Promise<BusinessHour[]> {
    return fetchJson<BusinessHour[]>('/api/business-hours');
  },
  async updateBusinessHours(hours: BusinessHour[]): Promise<BusinessHour[]> {
    return fetchJson<BusinessHour[]>('/api/business-hours', {
      method: 'PUT',
      body: JSON.stringify({ hours }),
    });
  },

  // Blocked Periods
  async getBlockedPeriods(): Promise<BlockedPeriod[]> {
    return fetchJson<BlockedPeriod[]>('/api/blocked-periods');
  },
  async createBlockedPeriod(data: { staff_id?: string | null; start_at: string; end_at: string; reason: string }): Promise<BlockedPeriod> {
    return fetchJson<BlockedPeriod>('/api/blocked-periods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteBlockedPeriod(id: string): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/blocked-periods/${id}`, {
      method: 'DELETE',
    });
  },

  // Availability
  async getAvailability(date: string, serviceId: string, staffId = 'any'): Promise<{
    date: string;
    isClosed: boolean;
    slots: TimeSlot[];
    message?: string;
  }> {
    return fetchJson(`/api/availability?date=${date}&serviceId=${serviceId}&staffId=${staffId}`);
  },

  // Booking
  async createAppointment(data: {
    serviceId: string;
    staffId?: string;
    date: string;
    time: string;
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    customerNotes?: string;
  }): Promise<Appointment> {
    return fetchJson<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async lookupAppointment(reference: string): Promise<Appointment> {
    return fetchJson<Appointment>(`/api/appointments/lookup/${encodeURIComponent(reference)}`);
  },

  async getMyAppointments(): Promise<Appointment[]> {
    return fetchJson<Appointment[]>('/api/appointments/my');
  },

  async getAllAppointments(params?: { date?: string; status?: string; staffId?: string; search?: string }): Promise<Appointment[]> {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson<Appointment[]>(`/api/appointments${query ? `?${query}` : ''}`);
  },

  async updateAppointmentStatus(id: string, status: string, cancellationReason?: string): Promise<Appointment> {
    return fetchJson<Appointment>(`/api/appointments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, cancellationReason }),
    });
  },

  async rescheduleAppointment(id: string, date: string, time: string): Promise<Appointment> {
    return fetchJson<Appointment>(`/api/appointments/${id}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ date, time }),
    });
  },

  // Stats
  async getStats(): Promise<DashboardStats> {
    return fetchJson<DashboardStats>('/api/stats');
  },

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const data = await fetchJson<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async register(email: string, password: string, fullName: string, phone?: string): Promise<{ token: string; user: UserProfile }> {
    const data = await fetchJson<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, phone }),
    });
    setAuthToken(data.token);
    return data;
  },

  // Inquiries & Supabase Sync
  async createInquiry(data: {
    name: string;
    email?: string;
    phone: string;
    serviceName?: string;
    preferredDate?: string;
    message: string;
  }): Promise<{ inquiry: Inquiry; supabaseSync: { success: boolean; message: string } }> {
    return fetchJson<{ inquiry: Inquiry; supabaseSync: { success: boolean; message: string } }>('/api/inquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getInquiries(): Promise<Inquiry[]> {
    return fetchJson<Inquiry[]>('/api/inquiries');
  },

  async updateInquiryStatus(id: string, status: string): Promise<Inquiry> {
    return fetchJson<Inquiry>(`/api/inquiries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async getMe(): Promise<{ user: UserProfile }> {
    return fetchJson<{ user: UserProfile }>('/api/auth/me');
  },

  logout() {
    setAuthToken(null);
  },
};
