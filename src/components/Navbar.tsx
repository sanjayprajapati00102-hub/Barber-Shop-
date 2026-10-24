import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, User, Calendar } from 'lucide-react';

interface NavbarProps {
  businessName: string;
  onOpenBooking: () => void;
  onOpenCustomer: () => void;
  onOpenAdmin: () => void;
  currentUser: UserProfile | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  businessName,
  onOpenBooking,
  onOpenCustomer,
  onOpenAdmin,
  currentUser,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0c0d10]/95 backdrop-blur-md border-b border-[#23252e]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <a
          href="#top"
          className="font-serif-luxury text-2xl font-semibold tracking-tight text-[#f5f2eb] hover:text-[#c5a880] transition-colors whitespace-nowrap shrink-0"
        >
          {businessName || "Barber's shop"}
        </a>

        {/* Zone 2: 4-5 Clean Nav Links (whitespace-nowrap shrink-0) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9e9fa6]">
          <a
            href="#services"
            className="hover:text-[#ede9e3] transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Services & Pricing
          </a>
          <a
            href="#craft"
            className="hover:text-[#ede9e3] transition-colors whitespace-nowrap shrink-0 py-1"
          >
            The Craft
          </a>
          <a
            href="#location"
            className="hover:text-[#ede9e3] transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Hours & Location
          </a>
          <button
            onClick={onOpenCustomer}
            className="hover:text-[#ede9e3] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 text-left"
          >
            <Calendar className="w-3.5 h-3.5 text-[#c5a880]" />
            <span>My Bookings</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (+ quiet admin trigger) */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser?.role === 'admin' ? (
            <button
              onClick={onOpenAdmin}
              className="px-3 py-2 text-xs font-medium text-[#c5a880] border border-[#c5a880]/30 rounded hover:bg-[#c5a880]/10 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          ) : (
            <button
              onClick={onOpenCustomer}
              title="Customer Login / Check Status"
              className="p-2 text-[#9e9fa6] hover:text-[#ede9e3] hover:bg-[#1a1b22] rounded transition-colors shrink-0 md:hidden"
            >
              <User className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenBooking}
            className="px-5 py-2 text-xs font-semibold tracking-wide uppercase text-[#0d0e11] bg-[#c5a880] hover:bg-[#d8bc94] active:bg-[#b0946c] rounded transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </header>
  );
};
