import React, { useState, useEffect } from 'react';
import {
  BusinessSettings, Service, Staff, BusinessHour, BlockedPeriod,
  Appointment, DashboardStats, UserProfile, Inquiry
} from '../types';
import { api } from '../lib/api';
import {
  X, BarChart3, Calendar, Scissors, Clock, Users,
  Settings as SettingsIcon, Plus, Check, Trash2, Edit2,
  AlertCircle, ShieldCheck, RefreshCw, Phone, MapPin, ExternalLink,
  Ban, MessageSquare, Database, Copy, CheckCheck
} from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onRefreshPublicData: () => void;
}

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onRefreshPublicData,
}) => {
  // Tabs: 'overview' | 'appointments' | 'inquiries' | 'services' | 'hours' | 'blocked' | 'staff' | 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'inquiries' | 'services' | 'hours' | 'blocked' | 'staff' | 'settings'>('overview');

  // Inquiries & Supabase state
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apptFilterStatus, setApptFilterStatus] = useState<string>('all');
  const [apptFilterDate, setApptFilterDate] = useState<string>('');
  const [apptSearch, setApptSearch] = useState<string>('');
  const [loadingAppts, setLoadingAppts] = useState<boolean>(false);

  // Manual Walk-In Form State
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [walkInServiceId, setWalkInServiceId] = useState<string>('');
  const [walkInStaffId, setWalkInStaffId] = useState<string>('any');
  const [walkInDate, setWalkInDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [walkInTime, setWalkInTime] = useState<string>('12:00');
  const [walkInCustomerName, setWalkInCustomerName] = useState<string>('');
  const [walkInCustomerPhone, setWalkInCustomerPhone] = useState<string>('');
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Services
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  // Business Hours
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [savingHours, setSavingHours] = useState<boolean>(false);

  // Blocked Periods
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [newBlockDate, setNewBlockDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newBlockStartTime, setNewBlockStartTime] = useState<string>('09:00');
  const [newBlockEndTime, setNewBlockEndTime] = useState<string>('21:00');
  const [newBlockReason, setNewBlockReason] = useState<string>('Public Holiday');

  // Staff
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);

  // Settings
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Notification banners
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Reschedule state
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    try {
      const [sData, aData, srvData, bhData, bpData, stfData, stData, inqData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getAllAppointments().catch(() => []),
        api.getServices(true).catch(() => []),
        api.getBusinessHours().catch(() => []),
        api.getBlockedPeriods().catch(() => []),
        api.getStaff().catch(() => []),
        api.getSettings().catch(() => null),
        api.getInquiries().catch(() => []),
      ]);

      if (sData) setStats(sData);
      setAppointments(aData);
      setServices(srvData);
      setBusinessHours(bhData);
      setBlockedPeriods(bpData);
      setStaffList(stfData);
      if (stData) setSettings(stData);
      setInquiries(inqData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  const handleUpdateInquiryStatus = async (id: string, status: string) => {
    try {
      await api.updateInquiryStatus(id, status);
      const updated = await api.getInquiries();
      setInquiries(updated);
      setBannerMessage(`Inquiry marked as ${status}`);
    } catch (err: any) {
      setBannerMessage('Error updating inquiry: ' + err.message);
    }
  };

  const handleUpdateApptStatus = async (id: string, status: string) => {
    try {
      await api.updateAppointmentStatus(id, status);
      setBannerMessage(`Appointment status updated to ${status}`);
      loadAppointments();
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err: any) {
      setBannerMessage('Error: ' + err.message);
    }
  };

  const loadAppointments = async () => {
    setLoadingAppts(true);
    try {
      const data = await api.getAllAppointments({
        date: apptFilterDate || undefined,
        status: apptFilterStatus !== 'all' ? apptFilterStatus : undefined,
        search: apptSearch || undefined,
      });
      setAppointments(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInError(null);
    try {
      await api.createAppointment({
        serviceId: walkInServiceId,
        staffId: walkInStaffId,
        date: walkInDate,
        time: walkInTime,
        customerName: walkInCustomerName,
        customerPhone: walkInCustomerPhone || '+91 99999 00000',
        customerNotes: 'Walk-in added manually by administrator',
      });
      setShowWalkInModal(false);
      setWalkInCustomerName('');
      setWalkInCustomerPhone('');
      setBannerMessage('Walk-in appointment recorded successfully.');
      loadAppointments();
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err: any) {
      setWalkInError(err.message || 'Failed to add walk-in appointment');
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppt || !rescheduleDate || !rescheduleTime) return;
    setRescheduleError(null);
    try {
      await api.rescheduleAppointment(reschedulingAppt.id, rescheduleDate, rescheduleTime);
      setReschedulingAppt(null);
      setBannerMessage('Appointment rescheduled successfully.');
      loadAppointments();
    } catch (err: any) {
      setRescheduleError(err.message || 'Failed to reschedule');
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      if (editingService.id) {
        await api.updateService(editingService.id, editingService);
        setBannerMessage('Service updated successfully.');
      } else {
        await api.createService(editingService);
        setBannerMessage('New service created.');
      }
      setEditingService(null);
      const updated = await api.getServices(true);
      setServices(updated);
      onRefreshPublicData();
    } catch (err: any) {
      setBannerMessage('Error saving service: ' + err.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this service? Existing historical records will remain.')) return;
    try {
      await api.deleteService(id);
      const updated = await api.getServices(true);
      setServices(updated);
      setBannerMessage('Service deactivated.');
      onRefreshPublicData();
    } catch (err: any) {
      setBannerMessage('Error: ' + err.message);
    }
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      await api.updateBusinessHours(businessHours);
      setBannerMessage('Weekly business schedule saved.');
      onRefreshPublicData();
    } catch (err: any) {
      setBannerMessage('Error: ' + err.message);
    } finally {
      setSavingHours(false);
    }
  };

  const handleAddBlockedPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBlockedPeriod({
        start_at: `${newBlockDate}T${newBlockStartTime}:00`,
        end_at: `${newBlockDate}T${newBlockEndTime}:00`,
        reason: newBlockReason,
      });
      const updated = await api.getBlockedPeriods();
      setBlockedPeriods(updated);
      setBannerMessage('Blocked period added.');
    } catch (err: any) {
      setBannerMessage('Error: ' + err.message);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await api.deleteBlockedPeriod(id);
      const updated = await api.getBlockedPeriods();
      setBlockedPeriods(updated);
      setBannerMessage('Block removed.');
    } catch (err: any) {
      setBannerMessage('Error: ' + err.message);
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      if (editingStaff.id) {
        await api.updateStaff(editingStaff.id, editingStaff);
        setBannerMessage('Staff member updated.');
      } else {
        await api.createStaff(editingStaff);
        setBannerMessage('New staff member added.');
      }
      setEditingStaff(null);
      const updated = await api.getStaff();
      setStaffList(updated);
      onRefreshPublicData();
    } catch (err: any) {
      setBannerMessage('Error: ' + err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setBannerMessage('Business settings and confirmation status saved.');
      onRefreshPublicData();
    } catch (err: any) {
      setBannerMessage('Error saving settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#101117] border border-[#262835] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#14151e] border-b border-[#222430] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#c5a880]/15 text-[#c5a880] border border-[#c5a880]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#c5a880] font-semibold block">
                Executive Administration
              </span>
              <h2 className="font-serif-luxury text-xl sm:text-2xl text-[#ede9e3] font-medium">
                {settings?.business_name || "Barber's shop"} · Management Suite
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              title="Refresh Data"
              className="p-2 rounded bg-[#1e202a] text-[#8e909a] hover:text-[#ede9e3] hover:bg-[#2b2d3b] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#8e909a] hover:text-[#ede9e3] hover:bg-[#1f202b] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner Alert if any */}
        {bannerMessage && (
          <div className="px-6 py-2.5 bg-[#1b2219] border-b border-green-800/40 text-green-300 text-xs flex items-center justify-between shrink-0">
            <span>{bannerMessage}</span>
            <button onClick={() => setBannerMessage(null)} className="text-green-400 hover:text-white font-bold ml-4">✕</button>
          </div>
        )}

        {/* Dashboard Navigation Bar */}
        <div className="flex border-b border-[#1f212a] bg-[#0c0d12] px-6 overflow-x-auto shrink-0 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview' ? 'border-[#c5a880] text-[#c5a880]' : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'appointments' ? 'border-[#c5a880] text-[#c5a880]' : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Appointments ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'inquiries' ? 'border-[#c5a880] text-[#c5a880]' : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Inquiries & Supabase ({inquiries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'services' ? 'border-[#c5a880] text-[#c5a880]' : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Menu & Services ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('hours')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'hours' ? 'border-[#c5a880] text-[#c5a880]' : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Business Hours</span>
          </button>

          <button
            onClick={() => setActiveTab('blocked')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'blocked' ? 'border-[#c5a880] text-[#c5a880]' : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Blocked Holidays ({blockedPeriods.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'staff' ? 'border-[#c5a880] text-[#c5a880]' : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Roster</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'settings' ? 'border-[#c5a880] text-[#c5a880]' : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings & Verification</span>
          </button>
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0f1015]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-8">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-lg bg-[#14151e] border border-[#232532]">
                  <span className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                    Today&apos;s Appointments
                  </span>
                  <span className="font-mono text-3xl font-bold text-[#ede9e3] tabular-nums">
                    {stats.todayCount}
                  </span>
                  <span className="text-[11px] text-[#737582] block mt-1">Confirmed & scheduled</span>
                </div>

                <div className="p-5 rounded-lg bg-[#14151e] border border-[#232532]">
                  <span className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                    Upcoming Bookings
                  </span>
                  <span className="font-mono text-3xl font-bold text-[#c5a880] tabular-nums">
                    {stats.upcomingCount}
                  </span>
                  <span className="text-[11px] text-[#737582] block mt-1">Next 30 days active</span>
                </div>

                <div className="p-5 rounded-lg bg-[#14151e] border border-[#232532]">
                  <span className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                    Completed Revenue
                  </span>
                  <span className="font-mono text-3xl font-bold text-green-400 tabular-nums">
                    ₹{stats.actualRevenue}
                  </span>
                  <span className="text-[11px] text-[#737582] block mt-1">From {stats.completedCount} completed visits</span>
                </div>

                <div className="p-5 rounded-lg bg-[#14151e] border border-[#232532]">
                  <span className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                    Booked Value (Pending)
                  </span>
                  <span className="font-mono text-3xl font-bold text-[#ede9e3] tabular-nums">
                    ₹{stats.estimatedBookingValue}
                  </span>
                  <span className="text-[11px] text-[#737582] block mt-1">Estimated chair pipeline</span>
                </div>
              </div>

              {/* 7-Day Trend Activity Table */}
              <div className="p-6 rounded-lg bg-[#14151e] border border-[#232532]">
                <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium mb-4">
                  Recent 7-Day Booking Velocity
                </h3>
                {stats.dailyTrends.length === 0 ? (
                  <p className="text-xs text-[#8e909a]">No historical appointments recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.dailyTrends.map((d) => (
                      <div key={d.day} className="flex items-center justify-between text-xs py-2 border-b border-[#1f212a]">
                        <span className="font-mono text-[#ede9e3]">{d.day}</span>
                        <div className="flex items-center gap-6">
                          <span className="text-[#8e909a]">{d.bookings} appointments</span>
                          <span className="font-mono font-bold text-[#c5a880] tabular-nums">₹{d.revenue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    if (services.length > 0) setWalkInServiceId(services[0].id);
                    setShowWalkInModal(true);
                  }}
                  className="px-5 py-2.5 rounded bg-[#c5a880] hover:bg-[#d8bc94] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Manual Walk-in</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: APPOINTMENT MANAGEMENT */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#14151e] border border-[#232532]">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    placeholder="Search name, phone, or ref..."
                    value={apptSearch}
                    onChange={(e) => setApptSearch(e.target.value)}
                    className="px-3.5 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                  />
                  <input
                    type="date"
                    value={apptFilterDate}
                    onChange={(e) => setApptFilterDate(e.target.value)}
                    className="px-3.5 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                  />
                  <select
                    value={apptFilterStatus}
                    onChange={(e) => setApptFilterStatus(e.target.value)}
                    className="px-3 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                  <button
                    onClick={loadAppointments}
                    className="px-3 py-1.5 bg-[#232533] hover:bg-[#303345] text-[#ede9e3] text-xs rounded transition-colors"
                  >
                    Apply Filter
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (services.length > 0) setWalkInServiceId(services[0].id);
                    setShowWalkInModal(true);
                  }}
                  className="px-4 py-2 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94] flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Walk-In</span>
                </button>
              </div>

              {/* Table of Appointments */}
              {loadingAppts ? (
                <div className="py-12 text-center text-xs text-[#8e909a]">Filtering appointments...</div>
              ) : appointments.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8e909a] rounded-lg bg-[#14151e] border border-[#232532]">
                  No appointments match the selected criteria.
                </div>
              ) : (
                <div className="rounded-lg border border-[#232532] overflow-hidden bg-[#13141c]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#171822] text-[#8e909a] border-b border-[#232532]">
                      <tr>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Ref</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Date & Time</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Customer</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Service</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Barber</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Price</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f212c]">
                      {appointments.map((a) => (
                        <tr key={a.id} className="hover:bg-[#181924] transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-[#c5a880]">{a.booking_ref}</td>
                          <td className="py-3 px-4 text-[#ede9e3]">
                            <div>{a.start_at.split('T')[0]}</div>
                            <div className="text-[#8e909a] font-mono">{a.start_at.split('T')[1].slice(0, 5)}</div>
                          </td>
                          <td className="py-3 px-4 text-[#ede9e3]">
                            <div className="font-medium">{a.customer_name}</div>
                            <div className="text-[#8e909a]">{a.customer_phone}</div>
                          </td>
                          <td className="py-3 px-4 text-[#ede9e3]">{a.service_name_snapshot}</td>
                          <td className="py-3 px-4 text-[#8e909a]">{a.staff_name || 'Any Barber'}</td>
                          <td className="py-3 px-4 font-mono font-bold tabular-nums text-[#ede9e3]">₹{a.price_snapshot}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              a.status === 'confirmed' ? 'bg-green-950/60 text-green-300 border border-green-800/40' :
                              a.status === 'completed' ? 'bg-[#c5a880]/15 text-[#c5a880] border border-[#c5a880]/30' :
                              a.status === 'cancelled' ? 'bg-red-950/60 text-red-300 border border-red-800/40' :
                              'bg-yellow-950/60 text-yellow-300 border border-yellow-800/40'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {a.status === 'confirmed' && (
                              <>
                                <button
                                  onClick={() => handleUpdateApptStatus(a.id, 'completed')}
                                  title="Mark Completed"
                                  className="px-2 py-1 bg-green-900/60 hover:bg-green-800 text-green-200 rounded text-[11px]"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => {
                                    setReschedulingAppt(a);
                                    setRescheduleDate(a.start_at.split('T')[0]);
                                    setRescheduleTime(a.start_at.split('T')[1].slice(0, 5));
                                  }}
                                  title="Reschedule"
                                  className="px-2 py-1 bg-[#232533] hover:bg-[#323547] text-[#ede9e3] rounded text-[11px]"
                                >
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => handleUpdateApptStatus(a.id, 'cancelled')}
                                  title="Cancel"
                                  className="px-2 py-1 bg-red-950/60 hover:bg-red-800 text-red-300 rounded text-[11px]"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: INQUIRIES & SUPABASE */}
          {activeTab === 'inquiries' && (
            <div className="space-y-6">
              {/* Supabase Status & Setup Card */}
              <div className="p-5 rounded-lg bg-[#14181f] border border-[#213042] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[#ede9e3]">Supabase Backend Integration</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                          Active · Connected
                        </span>
                      </div>
                      <p className="text-xs text-[#8e909a] mt-0.5 font-mono">
                        Project ID: <span className="text-[#c5a880]">tntnxvnytnxxwyzszikh</span> · Endpoint: <span className="text-[#ede9e3]">https://tntnxvnytnxxwyzszikh.supabase.co</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const sql = `-- 1. Inquiries Table (For Contact & Consultation Form)
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    service_name TEXT,
    preferred_date TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert to inquiries" ON public.inquiries;
CREATE POLICY "Allow public insert to inquiries" ON public.inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public select inquiries" ON public.inquiries;
CREATE POLICY "Allow public select inquiries" ON public.inquiries FOR SELECT TO anon, authenticated USING (true);

-- 2. Appointments Table (For Book Visit Reservations)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_ref TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    service_name TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    customer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert to appointments" ON public.appointments;
CREATE POLICY "Allow public insert to appointments" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public select appointments" ON public.appointments;
CREATE POLICY "Allow public select appointments" ON public.appointments FOR SELECT TO anon, authenticated USING (true);`;
                        navigator.clipboard.writeText(sql);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2500);
                      }}
                      className="px-3.5 py-2 rounded bg-[#1e2330] hover:bg-[#282f42] text-[#ede9e3] border border-[#313a52] text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      {copiedSql ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#c5a880]" />}
                      <span>{copiedSql ? 'SQL Copied!' : 'Copy Supabase SQL'}</span>
                    </button>

                    <a
                      href="https://supabase.com/dashboard/project/tntnxvnytnxxwyzszikh/sql"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open SQL Editor</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0e1017] border border-[#1b2230] text-xs text-[#8e909a] leading-relaxed">
                  💡 <strong>Tip for Supabase:</strong> If you haven&apos;t run the migration yet in your Supabase SQL editor, click <strong>&quot;Copy Supabase SQL&quot;</strong> and paste it into your Supabase Dashboard SQL Editor. All form submissions immediately sync live into your Supabase database table!
                </div>
              </div>

              {/* Inquiries List Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">Customer Inquiries</h3>
                  <p className="text-xs text-[#8e909a]">Direct messages submitted through the website consultation form.</p>
                </div>
                <button
                  onClick={async () => {
                    const data = await api.getInquiries();
                    setInquiries(data);
                    setBannerMessage('Inquiries refreshed.');
                  }}
                  className="px-3 py-1.5 bg-[#1f202b] hover:bg-[#2b2d3d] text-[#ede9e3] text-xs rounded flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Table of Inquiries */}
              {inquiries.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8e909a] rounded-lg bg-[#14151e] border border-[#232532]">
                  No customer inquiries received yet. Submit one from the website homepage to test!
                </div>
              ) : (
                <div className="rounded-lg border border-[#232532] overflow-hidden bg-[#13141c]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#171822] text-[#8e909a] border-b border-[#232532]">
                      <tr>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Date & Time</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Sender</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Service</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Message</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Supabase Sync</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 font-medium uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f212c]">
                      {inquiries.map((inq) => (
                        <tr key={inq.id} className="hover:bg-[#181924] transition-colors">
                          <td className="py-3 px-4 text-[#8e909a] whitespace-nowrap">
                            {inq.created_at}
                          </td>
                          <td className="py-3 px-4 text-[#ede9e3]">
                            <div className="font-medium">{inq.name}</div>
                            <div className="text-[#8e909a]">{inq.phone}</div>
                            {inq.email && <div className="text-[#717380] text-[11px]">{inq.email}</div>}
                          </td>
                          <td className="py-3 px-4 text-[#ede9e3]">
                            <div>{inq.service_name || 'General Consultation'}</div>
                            {inq.preferred_date && <div className="text-[#8e909a] text-[11px]">Pref: {inq.preferred_date}</div>}
                          </td>
                          <td className="py-3 px-4 text-[#a6a8b4] max-w-xs">
                            <p className="line-clamp-2">{inq.message}</p>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {inq.supabase_synced === 1 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                                Synced to Supabase
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/40">
                                Saved Locally (Table Pending)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              inq.status === 'new' ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40' :
                              inq.status === 'contacted' ? 'bg-[#c5a880]/15 text-[#c5a880] border border-[#c5a880]/30' :
                              'bg-green-950/60 text-green-300 border border-green-800/40'
                            }`}>
                              {inq.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            {inq.status === 'new' && (
                              <button
                                onClick={() => handleUpdateInquiryStatus(inq.id, 'contacted')}
                                className="px-2 py-1 bg-[#1f202b] hover:bg-[#2c2f3f] text-[#ede9e3] rounded text-[11px]"
                              >
                                Mark Contacted
                              </button>
                            )}
                            {inq.status !== 'resolved' && (
                              <button
                                onClick={() => handleUpdateInquiryStatus(inq.id, 'resolved')}
                                className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-800 text-emerald-200 rounded text-[11px]"
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICES MANAGEMENT */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">Service Menu Configuration</h3>
                  <p className="text-xs text-[#8e909a]">Configure prices, durations, buffer intervals, and imagery.</p>
                </div>
                <button
                  onClick={() => setEditingService({
                    name: '',
                    description: '',
                    price: 250,
                    duration_minutes: 30,
                    buffer_minutes: 5,
                    category: 'Haircut',
                    is_active: 1,
                    is_featured: 0,
                  })}
                  className="px-4 py-2 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94] flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Service</span>
                </button>
              </div>

              {/* Service Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((s) => (
                  <div key={s.id} className="p-5 rounded-lg bg-[#14151e] border border-[#232532] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider text-[#c5a880] font-medium">{s.category}</span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          s.is_active === 1 ? 'bg-green-950/60 text-green-300' : 'bg-red-950/60 text-red-300'
                        }`}>
                          {s.is_active === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h4 className="font-serif-luxury text-lg text-[#ede9e3] font-medium mb-1">{s.name}</h4>
                      <p className="text-xs text-[#8e909a] line-clamp-2 mb-3">{s.description}</p>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-[#ede9e3] font-bold">₹{s.price}</span>
                        <span className="text-[#8e909a]">{s.duration_minutes}m (+{s.buffer_minutes}m buffer)</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#1f212a] flex items-center justify-between">
                      <button
                        onClick={() => setEditingService(s)}
                        className="px-3 py-1.5 bg-[#1f212c] hover:bg-[#2c2f3d] text-[#ede9e3] text-xs rounded flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteService(s.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 rounded"
                        title="Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BUSINESS HOURS */}
          {activeTab === 'hours' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">Weekly Operating Schedule</h3>
                <p className="text-xs text-[#8e909a]">Opening and closing times used to dynamically generate available booking slots.</p>
              </div>

              <div className="p-6 rounded-lg bg-[#14151e] border border-[#232532] space-y-4">
                {businessHours.map((bh, idx) => (
                  <div key={bh.weekday} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center py-2.5 border-b border-[#1f212a] text-xs">
                    <div className="sm:col-span-3 font-semibold text-[#ede9e3]">
                      {WEEKDAY_NAMES[bh.weekday]}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bh.is_closed === 1}
                          onChange={(e) => {
                            const copy = [...businessHours];
                            copy[idx].is_closed = e.target.checked ? 1 : 0;
                            setBusinessHours(copy);
                          }}
                          className="rounded text-[#c5a880] focus:ring-0"
                        />
                        <span className={bh.is_closed === 1 ? 'text-red-400 font-semibold' : 'text-[#8e909a]'}>Closed</span>
                      </label>
                    </div>

                    <div className="sm:col-span-7 flex items-center gap-2">
                      <input
                        type="time"
                        disabled={bh.is_closed === 1}
                        value={bh.open_time}
                        onChange={(e) => {
                          const copy = [...businessHours];
                          copy[idx].open_time = e.target.value;
                          setBusinessHours(copy);
                        }}
                        className="px-2 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3] disabled:opacity-30"
                      />
                      <span className="text-[#777]">to</span>
                      <input
                        type="time"
                        disabled={bh.is_closed === 1}
                        value={bh.close_time}
                        onChange={(e) => {
                          const copy = [...businessHours];
                          copy[idx].close_time = e.target.value;
                          setBusinessHours(copy);
                        }}
                        className="px-2 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3] disabled:opacity-30"
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-4 text-right">
                  <button
                    onClick={handleSaveHours}
                    disabled={savingHours}
                    className="px-6 py-2.5 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94] disabled:opacity-50"
                  >
                    {savingHours ? 'Saving...' : 'Save Schedule Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BLOCKED PERIODS & HOLIDAYS */}
          {activeTab === 'blocked' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">Blocked Dates & Holidays</h3>
                <p className="text-xs text-[#8e909a]">Prevent customer reservations on specific dates, staff leave, or maintenance windows.</p>
              </div>

              {/* Form to Add Block */}
              <form onSubmit={handleAddBlockedPeriod} className="p-5 rounded-lg bg-[#14151e] border border-[#232532] space-y-4">
                <h4 className="text-sm font-semibold text-[#ede9e3]">Add New Closure Block</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-[#8e909a] block mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={newBlockDate}
                      onChange={(e) => setNewBlockDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8e909a] block mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={newBlockStartTime}
                      onChange={(e) => setNewBlockStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8e909a] block mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      value={newBlockEndTime}
                      onChange={(e) => setNewBlockEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8e909a] block mb-1">Reason</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Diwali Holiday"
                      value={newBlockReason}
                      onChange={(e) => setNewBlockReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0d0e12] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>
                </div>

                <div className="text-right pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94]"
                  >
                    Block Selected Time
                  </button>
                </div>
              </form>

              {/* List of Current Blocks */}
              <div className="p-5 rounded-lg bg-[#14151e] border border-[#232532] space-y-3">
                <h4 className="text-sm font-semibold text-[#ede9e3]">Current Blocked Periods</h4>
                {blockedPeriods.length === 0 ? (
                  <p className="text-xs text-[#8e909a]">No upcoming blocked periods configured.</p>
                ) : (
                  blockedPeriods.map((bp) => (
                    <div key={bp.id} className="flex items-center justify-between text-xs py-2 border-b border-[#1f212a]">
                      <div>
                        <span className="font-semibold text-[#ede9e3]">{bp.reason}</span>
                        <div className="text-[#8e909a]">{bp.start_at} to {bp.end_at}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(bp.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove Block
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: STAFF ROSTER */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">Barber Roster & Chairs</h3>
                  <p className="text-xs text-[#8e909a]">Manage active barbers and specialist profiles.</p>
                </div>
                <button
                  onClick={() => setEditingStaff({
                    display_name: '',
                    role_title: 'Master Barber',
                    bio: '',
                    is_active: 1,
                  })}
                  className="px-4 py-2 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94] flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Barber</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {staffList.map((st) => (
                  <div key={st.id} className="p-5 rounded-lg bg-[#14151e] border border-[#232532] flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#1e202a] border border-[#2e3140] overflow-hidden flex items-center justify-center text-[#c5a880]">
                        {st.image_url ? (
                          <img src={st.image_url} alt={st.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-[#ede9e3]">{st.display_name}</h4>
                        <span className="text-xs text-[#c5a880]">{st.role_title}</span>
                        {st.bio && <p className="text-xs text-[#8e909a] mt-1 max-w-xs">{st.bio}</p>}
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingStaff(st)}
                      className="p-1.5 text-[#8e909a] hover:text-[#ede9e3]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS & OWNER VERIFICATION */}
          {activeTab === 'settings' && settings && (
            <form onSubmit={handleSaveSettings} className="max-w-3xl space-y-6">
              <div>
                <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">Business Identity & Verification</h3>
                <p className="text-xs text-[#8e909a]">
                  Update brand assets, Google Maps URL, address, contact numbers, and owner verification badges.
                </p>
              </div>

              {/* Owner Verification Checklist Panel (Requirement 1.6 & 8.H) */}
              <div className="p-5 rounded-lg bg-[#151722] border border-[#2b2e40] space-y-3">
                <div className="flex items-center gap-2 text-[#c5a880] text-xs font-semibold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Owner Verification Status</span>
                </div>
                <p className="text-xs text-[#9598a6]">
                  As per data accuracy rules, any unverified details are marked for owner confirmation. Check below to mark as officially verified.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <label className="flex items-center gap-2.5 p-2.5 rounded bg-[#101118] border border-[#232532] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.is_name_verified === 1}
                      onChange={(e) => setSettings({ ...settings, is_name_verified: e.target.checked ? 1 : 0 })}
                      className="rounded text-[#c5a880]"
                    />
                    <span>Official Business Styling Verified</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded bg-[#101118] border border-[#232532] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.is_phone_verified === 1}
                      onChange={(e) => setSettings({ ...settings, is_phone_verified: e.target.checked ? 1 : 0 })}
                      className="rounded text-[#c5a880]"
                    />
                    <span>Phone Number Confirmed</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded bg-[#101118] border border-[#232532] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.is_hours_verified === 1}
                      onChange={(e) => setSettings({ ...settings, is_hours_verified: e.target.checked ? 1 : 0 })}
                      className="rounded text-[#c5a880]"
                    />
                    <span>Weekly Operating Hours Verified</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded bg-[#101118] border border-[#232532] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.is_services_verified === 1}
                      onChange={(e) => setSettings({ ...settings, is_services_verified: e.target.checked ? 1 : 0 })}
                      className="rounded text-[#c5a880]"
                    />
                    <span>Services & Menu Prices Verified</span>
                  </label>
                </div>
              </div>

              {/* General Business Fields */}
              <div className="p-6 rounded-lg bg-[#14151e] border border-[#232532] space-y-4 text-xs">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.business_name}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-sm text-[#ede9e3]"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                    Google Maps URL (Location & Directions link)
                  </label>
                  <input
                    type="url"
                    required
                    value={settings.maps_url}
                    onChange={(e) => setSettings({ ...settings, maps_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-xs text-[#ede9e3] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                    Physical Address (Khaira, Najafgarh, New Delhi)
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                      Currency Code
                    </label>
                    <input
                      type="text"
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                      Min Notice (Hours)
                    </label>
                    <input
                      type="number"
                      value={settings.min_notice_hours}
                      onChange={(e) => setSettings({ ...settings, min_notice_hours: parseInt(e.target.value) || 1 })}
                      className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#8e909a] font-medium block mb-1">
                    Cancellation & Rescheduling Policy
                  </label>
                  <textarea
                    rows={2}
                    value={settings.cancellation_policy}
                    onChange={(e) => setSettings({ ...settings, cancellation_policy: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0d0e13] border border-[#2c2e3c] rounded text-xs text-[#ede9e3]"
                  />
                </div>

                <div className="text-right pt-4">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94] disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal: Add Manual Walk-In */}
        {showWalkInModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <form onSubmit={handleCreateWalkIn} className="w-full max-w-md bg-[#14151e] border border-[#2b2d3d] rounded-xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#232532] pb-3">
                <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">Record Walk-in Appointment</h3>
                <button type="button" onClick={() => setShowWalkInModal(false)} className="text-[#888] hover:text-white">✕</button>
              </div>

              {walkInError && (
                <div className="p-3 rounded bg-red-950/60 border border-red-800 text-red-200">{walkInError}</div>
              )}

              <div>
                <label className="text-[#8e909a] block mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="Guest Walk-in"
                  value={walkInCustomerName}
                  onChange={(e) => setWalkInCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91..."
                  value={walkInCustomerPhone}
                  onChange={(e) => setWalkInCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Service</label>
                <select
                  value={walkInServiceId}
                  onChange={(e) => setWalkInServiceId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8e909a] block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={walkInDate}
                    onChange={(e) => setWalkInDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                  />
                </div>
                <div>
                  <label className="text-[#8e909a] block mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={walkInTime}
                    onChange={(e) => setWalkInTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#232532]">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 bg-[#1f202b] text-[#ede9e3] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a880] text-[#0d0e11] font-semibold uppercase tracking-wider rounded"
                >
                  Confirm Walk-In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Reschedule Appointment */}
        {reschedulingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <form onSubmit={handleRescheduleSubmit} className="w-full max-w-md bg-[#14151e] border border-[#2b2d3d] rounded-xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#232532] pb-3">
                <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">Reschedule Appointment</h3>
                <button type="button" onClick={() => setReschedulingAppt(null)} className="text-[#888] hover:text-white">✕</button>
              </div>

              {rescheduleError && (
                <div className="p-3 rounded bg-red-950/60 border border-red-800 text-red-200">{rescheduleError}</div>
              )}

              <p className="text-[#8e909a]">
                Rescheduling booking <strong className="text-[#c5a880] font-mono">{reschedulingAppt.booking_ref}</strong> for {reschedulingAppt.customer_name}.
              </p>

              <div>
                <label className="text-[#8e909a] block mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">New Time</label>
                <input
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#232532]">
                <button
                  type="button"
                  onClick={() => setReschedulingAppt(null)}
                  className="px-4 py-2 bg-[#1f202b] text-[#ede9e3] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a880] text-[#0d0e11] font-semibold uppercase tracking-wider rounded"
                >
                  Save Reschedule
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Service Edit/Create */}
        {editingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <form onSubmit={handleSaveService} className="w-full max-w-lg bg-[#14151e] border border-[#2b2d3d] rounded-xl p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#232532] pb-3">
                <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">
                  {editingService.id ? 'Edit Service' : 'Add New Service'}
                </h3>
                <button type="button" onClick={() => setEditingService(null)} className="text-[#888] hover:text-white">✕</button>
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={editingService.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={editingService.category || 'Haircut'}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[#8e909a] block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    value={editingService.price || 0}
                    onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                  />
                </div>

                <div>
                  <label className="text-[#8e909a] block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={editingService.duration_minutes || 30}
                    onChange={(e) => setEditingService({ ...editingService, duration_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                  />
                </div>

                <div>
                  <label className="text-[#8e909a] block mb-1">Buffer (Mins)</label>
                  <input
                    type="number"
                    value={editingService.buffer_minutes || 5}
                    onChange={(e) => setEditingService({ ...editingService, buffer_minutes: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Image URL</label>
                <input
                  type="text"
                  placeholder="/src/assets/images/..."
                  value={editingService.image_url || ''}
                  onChange={(e) => setEditingService({ ...editingService, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingService.is_active === 1}
                    onChange={(e) => setEditingService({ ...editingService, is_active: e.target.checked ? 1 : 0 })}
                  />
                  <span>Is Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingService.is_featured === 1}
                    onChange={(e) => setEditingService({ ...editingService, is_featured: e.target.checked ? 1 : 0 })}
                  />
                  <span>Featured On Homepage</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#232532]">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 bg-[#1f202b] text-[#ede9e3] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a880] text-[#0d0e11] font-semibold uppercase tracking-wider rounded"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Staff Edit/Create */}
        {editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <form onSubmit={handleSaveStaff} className="w-full max-w-md bg-[#14151e] border border-[#2b2d3d] rounded-xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#232532] pb-3">
                <h3 className="font-serif-luxury text-xl text-[#ede9e3] font-medium">
                  {editingStaff.id ? 'Edit Staff Member' : 'Add Staff Member'}
                </h3>
                <button type="button" onClick={() => setEditingStaff(null)} className="text-[#888] hover:text-white">✕</button>
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.display_name || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, display_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  value={editingStaff.role_title || 'Master Barber'}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role_title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div>
                <label className="text-[#8e909a] block mb-1">Biography / Specialties</label>
                <textarea
                  rows={2}
                  value={editingStaff.bio || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, bio: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#2a2c3b] rounded text-xs text-[#ede9e3]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#232532]">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 bg-[#1f202b] text-[#ede9e3] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a880] text-[#0d0e11] font-semibold uppercase tracking-wider rounded"
                >
                  Save Barber
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
