import React from 'react';
import { MapPin, ArrowRight, ExternalLink, Clock } from 'lucide-react';
import { BusinessSettings } from '../types';

interface HeroProps {
  settings: BusinessSettings | null;
  onOpenBooking: () => void;
}

export const Hero: React.FC<HeroProps> = ({ settings, onOpenBooking }) => {
  const mapsUrl = settings?.maps_url || "https://www.google.com/maps/place/Barber's+shop/@28.5949406,76.9663757,17z/data=!3m1!4b1!4m6!3m5!1s0x390d11005d56b245:0xa03f3885eafc332!8m2!3d28.5949406!4d76.9689506!16s%2Fg%2F11njcnyk0f";
  const address = settings?.address || 'Khaira, Najafgarh, South West Delhi, Delhi, 110043, India';

  return (
    <section id="top" className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-[#23252e]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Editorial Value Proposition */}
          <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-8">
            {/* Location & Heritage Marker */}
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#c5a880]" />
              <span>Khaira · Najafgarh · New Delhi</span>
            </div>

            {/* Marquee Headline with font-serif and balanced wrap */}
            <h1 className="font-serif-luxury text-4xl sm:text-5xl lg:text-6xl text-[#f9f7f2] font-normal leading-[1.12] tracking-tight mb-6" style={{ textWrap: 'balance' }}>
              The Master Standard in Bespoke Men&apos;s Grooming
            </h1>

            {/* Refined Description */}
            <p className="text-base sm:text-lg text-[#a6a7af] leading-relaxed max-w-xl mb-8">
              Bespoke scissor craftsmanship, tailored skin fades, and authentic straight-razor hot towel shaves. Dedicated to traditional gentleman grooming rituals with unhurried precision.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <button
                onClick={onOpenBooking}
                className="w-full sm:w-auto px-7 py-3.5 text-xs font-semibold tracking-wider uppercase text-[#0d0e11] bg-[#c5a880] hover:bg-[#d8bc94] active:bg-[#b0946c] rounded transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Reserve Appointment</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full sm:w-auto px-6 py-3.5 text-xs font-semibold tracking-wider uppercase text-[#d5d4d9] border border-[#2e313d] hover:border-[#c5a880]/50 hover:bg-[#15171e] rounded transition-all flex items-center justify-center gap-2"
              >
                <span>View Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#9e9fa6]" />
              </a>
            </div>

            {/* Micro Trust Metadata (Zero-Pill, unboxed text) */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#82848f] mt-8 pt-6 border-t border-[#1f212a] w-full">
              <span>Open 7 Days</span>
              <span aria-hidden="true">·</span>
              <span>Coordinates 28.59° N, 76.97° E</span>
              <span aria-hidden="true">·</span>
              <span>Verified Google Profile</span>
            </div>
          </div>

          {/* Right Column: Hero Cinematic Photography */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/3] lg:aspect-[3/4] rounded-lg overflow-hidden border border-[#23252e] bg-[#14151b] shadow-2xl">
              <img
                src="/src/assets/images/hero_barber_craft_1792471150916.jpg"
                alt="Master Barber precision craftsmanship at Barber's Shop"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-[0.95] contrast-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded bg-[#0d0e11]/85 backdrop-blur-sm border border-[#23252e] text-xs">
                <p className="font-serif-luxury text-base text-[#f5f2eb] italic mb-0.5">
                  &ldquo;A haircut is not an errand; it is an enduring standard of self-respect.&rdquo;
                </p>
                <p className="text-[#8e909a] text-[11px]">Hand-sharpened Japanese shears & single-use sanitized blades</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Proof & Detail Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16 pt-12 border-t border-[#23252e]">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-[#c5a880] font-medium mb-1">01. Location</span>
            <span className="text-sm font-semibold text-[#ede9e3]">{address.split(',')[0]}, Najafgarh</span>
            <span className="text-xs text-[#82848f] mt-0.5">South West Delhi 110043</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-[#c5a880] font-medium mb-1">02. Working Hours</span>
            <span className="text-sm font-semibold text-[#ede9e3]">09:30 AM – 08:30 PM</span>
            <span className="text-xs text-[#82848f] mt-0.5">All Days · Slot-based scheduling</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-[#c5a880] font-medium mb-1">03. Hygiene Standard</span>
            <span className="text-sm font-semibold text-[#ede9e3]">Single-Use Blades</span>
            <span className="text-xs text-[#82848f] mt-0.5">Hospital-grade sanitization</span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-[#c5a880] font-medium mb-1">04. Real-Time Booking</span>
            <span className="text-sm font-semibold text-[#ede9e3]">Zero Waiting In Queue</span>
            <span className="text-xs text-[#82848f] mt-0.5">Instant booking reference</span>
          </div>
        </div>
      </div>
    </section>
  );
};
