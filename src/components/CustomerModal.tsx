import React, { useState, useEffect } from 'react';
import { Appointment, UserProfile } from '../types';
import { api } from '../lib/api';
import { X, Search, Calendar, User, LogOut, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  onOpenAdmin,
}) => {
  // Tabs: 'lookup' | 'my_account' | 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'lookup' | 'my_account' | 'login' | 'register'>(
    currentUser ? 'my_account' : 'lookup'
  );

  // Lookup state
  const [searchRef, setSearchRef] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<Appointment | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Customer appointments list
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [loadingMyAppointments, setLoadingMyAppointments] = useState<boolean>(false);

  // Auth form
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Cancellation state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setActiveTab('my_account');
      loadCustomerAppointments();
    }
  }, [currentUser]);

  const loadCustomerAppointments = async () => {
    setLoadingMyAppointments(true);
    try {
      const data = await api.getMyAppointments();
      setMyAppointments(data);
    } catch {
      // ignore
    } finally {
      setLoadingMyAppointments(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const appt = await api.lookupAppointment(searchRef.trim());
      setLookupResult(appt);
    } catch (err: any) {
      setLookupError(err.message || 'Appointment not found with this reference.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { user } = await api.login(email.trim(), password);
      onLoginSuccess(user);
      if (user.role === 'admin') {
        onClose();
        onOpenAdmin();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { user } = await api.register(email.trim(), password, fullName.trim(), phone.trim());
      onLoginSuccess(user);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Email may already be in use.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    try {
      await api.updateAppointmentStatus(apptId, 'cancelled', cancelReason || 'Customer requested cancellation');
      setActionMessage('Appointment successfully cancelled. Time slot released.');
      setCancellingId(null);
      setCancelReason('');

      // Refresh lookup or customer list
      if (lookupResult && lookupResult.id === apptId) {
        const updated = await api.lookupAppointment(lookupResult.booking_ref);
        setLookupResult(updated);
      }
      if (currentUser) {
        loadCustomerAppointments();
      }
    } catch (err: any) {
      setActionMessage('Failed to cancel: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#111218] border border-[#262835] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222430] bg-[#14151e]">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#c5a880] font-medium block">
              Guest & Client Portal
            </span>
            <h2 className="font-serif-luxury text-xl sm:text-2xl text-[#ede9e3] font-medium">
              Manage Your Reservations
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888a96] hover:text-[#ede9e3] hover:bg-[#1f202b] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-[#1f212a] bg-[#0e0f14] text-xs">
          <button
            onClick={() => setActiveTab('lookup')}
            className={`flex-1 py-3 px-4 font-medium transition-colors border-b-2 ${
              activeTab === 'lookup'
                ? 'border-[#c5a880] text-[#c5a880] bg-[#14151d]'
                : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
            }`}
          >
            Lookup by Reference
          </button>

          {currentUser ? (
            <button
              onClick={() => setActiveTab('my_account')}
              className={`flex-1 py-3 px-4 font-medium transition-colors border-b-2 ${
                activeTab === 'my_account'
                  ? 'border-[#c5a880] text-[#c5a880] bg-[#14151d]'
                  : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
              }`}
            >
              My Bookings
            </button>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-3 px-4 font-medium transition-colors border-b-2 ${
                  activeTab === 'login'
                    ? 'border-[#c5a880] text-[#c5a880] bg-[#14151d]'
                    : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-3 px-4 font-medium transition-colors border-b-2 ${
                  activeTab === 'register'
                    ? 'border-[#c5a880] text-[#c5a880] bg-[#14151d]'
                    : 'border-transparent text-[#8e909a] hover:text-[#ede9e3]'
                }`}
              >
                Register
              </button>
            </>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {actionMessage && (
            <div className="mb-4 p-3 rounded bg-[#1c221a] border border-green-800/60 text-green-300 text-xs flex items-center justify-between">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-green-400 hover:text-white">✕</button>
            </div>
          )}

          {/* TAB 1: LOOKUP BY REFERENCE */}
          {activeTab === 'lookup' && (
            <div className="space-y-6">
              <form onSubmit={handleLookup} className="space-y-3">
                <label className="text-xs uppercase tracking-wider text-[#9395a1] font-medium block">
                  Enter 5-Character Reference (e.g. BS-12345)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="BS-XXXXX"
                    value={searchRef}
                    onChange={(e) => setSearchRef(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] font-mono tracking-wider focus:outline-none focus:border-[#c5a880]"
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="px-5 py-2.5 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94] transition-colors flex items-center gap-1.5"
                  >
                    <Search className="w-4 h-4" />
                    <span>Find</span>
                  </button>
                </div>
              </form>

              {lookupError && (
                <div className="p-3.5 rounded bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
                  {lookupError}
                </div>
              )}

              {lookupResult && (
                <div className="p-5 rounded-lg bg-[#14151e] border border-[#2a2c3a] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#212330] pb-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8e909a] block">Status</span>
                      <span className={`inline-block text-xs font-semibold uppercase tracking-wider ${
                        lookupResult.status === 'confirmed' ? 'text-green-400' :
                        lookupResult.status === 'completed' ? 'text-[#c5a880]' :
                        lookupResult.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {lookupResult.status}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#8e909a]">Ref: {lookupResult.booking_ref}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#818390]">Service:</span>
                      <span className="text-[#ede9e3] font-medium">{lookupResult.service_name_snapshot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#818390]">Date & Time:</span>
                      <span className="text-[#ede9e3] font-medium">
                        {lookupResult.start_at.split('T')[0]} at {lookupResult.start_at.split('T')[1].slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#818390]">Barber:</span>
                      <span className="text-[#ede9e3] font-medium">{lookupResult.staff_name || 'Assigned Master Barber'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#818390]">Price:</span>
                      <span className="text-[#ede9e3] font-mono tabular-nums font-bold">₹{lookupResult.price_snapshot}</span>
                    </div>
                  </div>

                  {/* Cancel Button if confirmed */}
                  {lookupResult.status === 'confirmed' && (
                    <div className="pt-3 border-t border-[#212330]">
                      {cancellingId === lookupResult.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Reason for cancellation (optional)"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full px-3 py-1.5 bg-[#0e0f14] border border-[#2b2d3b] rounded text-xs text-[#ede9e3]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancelAppointment(lookupResult.id)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium"
                            >
                              Confirm Cancellation
                            </button>
                            <button
                              onClick={() => setCancellingId(null)}
                              className="px-3 py-1.5 bg-[#222430] text-[#ede9e3] text-xs rounded"
                            >
                              Keep
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCancellingId(lookupResult.id)}
                          className="text-xs text-red-400 hover:text-red-300 underline"
                        >
                          Cancel Appointment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY BOOKINGS (Logged In Customer) */}
          {activeTab === 'my_account' && currentUser && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#1f212a]">
                <div>
                  <h4 className="text-sm font-semibold text-[#ede9e3]">{currentUser.fullName}</h4>
                  <span className="text-xs text-[#8e909a]">{currentUser.email}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 text-xs text-[#8e909a] hover:text-[#ede9e3] hover:bg-[#1e202a] rounded flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              {loadingMyAppointments ? (
                <div className="py-8 text-center text-xs text-[#8e909a]">Loading your reservations...</div>
              ) : myAppointments.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8e909a]">
                  No appointments booked yet on this profile.
                </div>
              ) : (
                <div className="space-y-3">
                  {myAppointments.map((appt) => (
                    <div key={appt.id} className="p-4 rounded-lg bg-[#14151e] border border-[#232532] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-[#ede9e3]">{appt.service_name_snapshot}</span>
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                          appt.status === 'confirmed' ? 'text-green-400' :
                          appt.status === 'completed' ? 'text-[#c5a880]' : 'text-red-400'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#8e909a]">
                        <span>{appt.start_at.split('T')[0]} at {appt.start_at.split('T')[1].slice(0, 5)}</span>
                        <span className="font-mono text-[#ede9e3]">Ref: {appt.booking_ref}</span>
                      </div>
                      {appt.status === 'confirmed' && (
                        <div className="pt-2 text-right">
                          <button
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="text-[11px] text-red-400 hover:text-red-300 underline"
                          >
                            Cancel Appointment
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
                  {authError}
                </div>
              )}

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94] transition-colors"
                >
                  {authLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>

              <div className="p-3 rounded bg-[#15161f] border border-[#242636] text-[11px] text-[#8e909a]">
                <p className="font-semibold text-[#c5a880] mb-0.5">Admin or Customer Access</p>
                <p>Default administrator account: <code className="text-[#ede9e3]">admin@barbershop.local</code> / <code className="text-[#ede9e3]">AdminPassword123!</code></p>
              </div>
            </form>
          )}

          {/* TAB 4: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
                  {authError}
                </div>
              )}

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Vikram Seth"
                  className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vikram@example.com"
                  className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#c5a880] text-[#0d0e11] font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#d8bc94] transition-colors"
                >
                  {authLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
