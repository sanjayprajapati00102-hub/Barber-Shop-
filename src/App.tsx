import React, { useState, useEffect } from 'react';
import {
  BusinessSettings, Service, Staff, BusinessHour, UserProfile, Appointment
} from './types';
import { api } from './lib/api';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ServicesSection } from './components/ServicesSection';
import { StorySection } from './components/StorySection';
import { LocationSection } from './components/LocationSection';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { CustomerModal } from './components/CustomerModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null);
  const [isCustomerOpen, setIsCustomerOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Load initial data
  const loadData = async () => {
    try {
      const [sData, srvData, stfData, bhData] = await Promise.all([
        api.getSettings().catch(() => null),
        api.getServices().catch(() => []),
        api.getStaff().catch(() => []),
        api.getBusinessHours().catch(() => []),
      ]);

      if (sData) setSettings(sData);
      setServices(srvData);
      setStaffList(stfData);
      setBusinessHours(bhData);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check existing auth token
    api.getMe()
      .then((res) => setCurrentUser(res.user))
      .catch(() => setCurrentUser(null));
  }, []);

  const handleOpenBookingWithService = (service: Service) => {
    setSelectedServiceForBooking(service);
    setIsBookingOpen(true);
  };

  const handleOpenGenericBooking = () => {
    setSelectedServiceForBooking(services.length > 0 ? services[0] : null);
    setIsBookingOpen(true);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setIsAdminOpen(false);
  };

  const hasUnconfirmedDetails = settings && (
    settings.is_name_verified === 0 ||
    settings.is_phone_verified === 0 ||
    settings.is_hours_verified === 0 ||
    settings.is_services_verified === 0
  );

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#ede9e3] flex flex-col selection:bg-[#c5a880] selection:text-black">
      {/* Optional Owner Verification Notice Banner (Requirement 1.6 & 8.H) */}
      {hasUnconfirmedDetails && (
        <div className="bg-[#151720] border-b border-[#252838] px-4 py-2 text-xs text-[#a5a7b6] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#c5a880] shrink-0" />
            <span>
              <strong>Owner Setup Mode:</strong> Some business details use provisional estimates based on the Google Maps listing. The owner can verify them in the admin dashboard.
            </span>
          </div>
          <button
            onClick={() => {
              if (currentUser?.role === 'admin') {
                setIsAdminOpen(true);
              } else {
                setIsCustomerOpen(true);
              }
            }}
            className="text-[#c5a880] hover:underline font-semibold flex items-center gap-1 text-[11px]"
          >
            <span>{currentUser?.role === 'admin' ? 'Verify in Admin Suite' : 'Sign in as Admin to confirm'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        businessName={settings?.business_name || "Barber's shop"}
        onOpenBooking={handleOpenGenericBooking}
        onOpenCustomer={() => setIsCustomerOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        currentUser={currentUser}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <Hero
          settings={settings}
          onOpenBooking={handleOpenGenericBooking}
        />

        {/* Services & Pricing Menu */}
        <ServicesSection
          services={services}
          settings={settings}
          onSelectService={handleOpenBookingWithService}
        />

        {/* Brand & Craft Story */}
        <StorySection />

        {/* Location, Schedule, Directions & Supabase Inquiry Form */}
        <LocationSection
          settings={settings}
          businessHours={businessHours}
          services={services}
        />
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        currentUser={currentUser}
        onOpenAdmin={() => {
          if (currentUser?.role === 'admin') {
            setIsAdminOpen(true);
          } else {
            setIsCustomerOpen(true);
          }
        }}
        onOpenCustomer={() => setIsCustomerOpen(true)}
      />

      {/* Booking Wizard Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setSelectedServiceForBooking(null);
        }}
        services={services}
        staffList={staffList}
        settings={settings}
        initialService={selectedServiceForBooking}
      />

      {/* Customer Lookup & Auth Modal */}
      <CustomerModal
        isOpen={isCustomerOpen}
        onClose={() => setIsCustomerOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Admin Suite Modal */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onRefreshPublicData={loadData}
      />
    </div>
  );
}
