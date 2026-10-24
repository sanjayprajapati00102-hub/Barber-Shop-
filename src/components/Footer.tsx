import React from 'react';
import { BusinessSettings, UserProfile } from '../types';
import { ShieldCheck, MapPin, Phone, ExternalLink } from 'lucide-react';

interface FooterProps {
  settings: BusinessSettings | null;
  currentUser: UserProfile | null;
  onOpenAdmin: () => void;
  onOpenCustomer: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  currentUser,
  onOpenAdmin,
  onOpenCustomer,
}) => {
  const mapsUrl = settings?.maps_url || "https://www.google.com/maps/place/Barber's+shop/@28.5949406,76.9663757,17z/data=!3m1!4b1!4m6!3m5!1s0x390d11005d56b245:0xa03f3885eafc332!8m2!3d28.5949406!4d76.9689506!16s%2Fg%2F11njcnyk0f";
  const address = settings?.address || 'Khaira, Najafgarh, South West Delhi, Delhi, 110043, India';
  const phone = settings?.phone || '+91 98100 12345';
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#090a0d] border-t border-[#1a1b22] text-xs text-[#80828e] py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#181920]">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-3">
            <span className="font-serif-luxury text-2xl text-[#ede9e3] font-medium block">
              {settings?.business_name || "Barber's shop"}
            </span>
            <p className="text-xs text-[#8e909a] max-w-sm leading-relaxed">
              Bespoke men&apos;s haircuts, beard sculpting, and traditional straight razor hot towel shaves in Khaira, Najafgarh. Dedicated to craftsmanship and hygienic excellence.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-[#c5a880]">
              <MapPin className="w-3.5 h-3.5" />
              <span>Najafgarh, South West Delhi 110043</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-2.5">
            <span className="text-[11px] uppercase tracking-wider text-[#ede9e3] font-semibold block mb-2">
              Navigation
            </span>
            <div><a href="#services" className="hover:text-[#ede9e3] transition-colors">Services & Pricing</a></div>
            <div><a href="#craft" className="hover:text-[#ede9e3] transition-colors">The Craft & Hygiene</a></div>
            <div><a href="#location" className="hover:text-[#ede9e3] transition-colors">Hours & Directions</a></div>
            <div>
              <button onClick={onOpenCustomer} className="hover:text-[#ede9e3] transition-colors text-left">
                Lookup Booking by Reference
              </button>
            </div>
          </div>

          {/* Location & Policies */}
          <div className="md:col-span-4 space-y-2.5">
            <span className="text-[11px] uppercase tracking-wider text-[#ede9e3] font-semibold block mb-2">
              Verified Location
            </span>
            <p className="text-xs text-[#8e909a] leading-relaxed">
              {address}
            </p>
            <div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[#c5a880] hover:underline"
              >
                <span>Official Google Maps Business Profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="pt-2 text-[11px] text-[#6c6e7a]">
              Appointments may be rescheduled or cancelled up to 2 hours prior to scheduled start.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#6c6e7a]">
          <div>
            © {year} {settings?.business_name || "Barber's shop"}. All rights reserved. Built with precision full-stack persistence.
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenAdmin}
              className="text-[#8e909a] hover:text-[#c5a880] flex items-center gap-1 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{currentUser?.role === 'admin' ? 'Open Admin Suite' : 'Staff / Admin Portal'}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
