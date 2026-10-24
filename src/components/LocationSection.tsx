import React from 'react';
import { BusinessSettings, BusinessHour, Service } from '../types';
import { MapPin, Phone, Mail, Clock, ExternalLink, Navigation, Info } from 'lucide-react';
import { InquiryForm } from './InquiryForm';

interface LocationSectionProps {
  settings: BusinessSettings | null;
  businessHours: BusinessHour[];
  services: Service[];
}

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const LocationSection: React.FC<LocationSectionProps> = ({
  settings,
  businessHours,
  services,
}) => {
  const mapsUrl = settings?.maps_url || "https://www.google.com/maps/place/Barber's+shop/@28.5949406,76.9663757,17z/data=!3m1!4b1!4m6!3m5!1s0x390d11005d56b245:0xa03f3885eafc332!8m2!3d28.5949406!4d76.9689506!16s%2Fg%2F11njcnyk0f";
  const address = settings?.address || 'Khaira, Najafgarh, South West Delhi, Delhi, 110043, India';
  const phone = settings?.phone || '+91 98100 12345';
  const email = settings?.email || 'contact@barbershop.local';

  const todayWeekday = new Date().getDay();

  return (
    <section id="location" className="py-20 md:py-28 border-b border-[#23252e]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Heading */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-3 font-medium">
            <MapPin className="w-3.5 h-3.5 text-[#c5a880]" />
            <span>Find Our Atelier</span>
          </div>
          <h2 className="font-serif-luxury text-3xl sm:text-4xl lg:text-5xl text-[#f9f7f2] font-normal tracking-tight">
            Location, Hours & Directions
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Contact & Operating Schedule */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            <div className="p-6 rounded-lg bg-[#13141a] border border-[#23252e] space-y-6">
              <h3 className="font-serif-luxury text-xl text-[#f5f2eb] font-medium border-b border-[#1f212a] pb-3">
                Business Contact Details
              </h3>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start gap-3.5">
                  <MapPin className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#858792] block text-[11px] uppercase tracking-wider mb-0.5">Address</span>
                    <span className="text-[#ede9e3] font-medium leading-relaxed">{address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Phone className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#858792] block text-[11px] uppercase tracking-wider mb-0.5">Phone (Inquiries & Walk-ins)</span>
                    <a
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="text-[#ede9e3] font-mono hover:text-[#c5a880] transition-colors"
                    >
                      {phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Mail className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#858792] block text-[11px] uppercase tracking-wider mb-0.5">Email Support</span>
                    <a
                      href={`mailto:${email}`}
                      className="text-[#ede9e3] hover:text-[#c5a880] transition-colors"
                    >
                      {email}
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="w-full py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#0d0e11] bg-[#c5a880] hover:bg-[#d8bc94] rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                </a>
              </div>
            </div>

            {/* Weekly Schedule Table */}
            <div className="p-6 rounded-lg bg-[#13141a] border border-[#23252e]">
              <div className="flex items-center justify-between border-b border-[#1f212a] pb-3 mb-4">
                <h3 className="font-serif-luxury text-xl text-[#f5f2eb] font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#c5a880]" />
                  <span>Weekly Schedule</span>
                </h3>
                <span className="text-[11px] text-[#8e909a]">Asia/Kolkata (IST)</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {businessHours.map((bh) => {
                  const isToday = bh.weekday === todayWeekday;
                  return (
                    <div
                      key={bh.weekday}
                      className={`flex items-center justify-between py-1.5 px-2.5 rounded transition-colors ${
                        isToday ? 'bg-[#1e202a] text-[#f5f2eb] font-semibold border-l-2 border-[#c5a880]' : 'text-[#a3a5af]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{WEEKDAY_NAMES[bh.weekday]}</span>
                        {isToday && (
                          <span className="text-[10px] text-[#c5a880] uppercase tracking-wider font-semibold">
                            (Today)
                          </span>
                        )}
                      </div>
                      <span className="font-mono tabular-nums">
                        {bh.is_closed === 1 ? (
                          <span className="text-[#e26b6b]">Closed</span>
                        ) : (
                          `${bh.open_time} - ${bh.close_time}`
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Map Frame & Policy Guarantee */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/11] rounded-lg overflow-hidden border border-[#23252e] bg-[#14151b] shadow-xl">
              {/* Embed OpenStreetMap centered on Khaira Najafgarh 28.5949406, 76.9689506 */}
              <iframe
                title="Barber's Shop Location Map"
                className="w-full h-full filter invert-[0.9] hue-rotate-[180deg] contrast-[1.1] opacity-85"
                src="https://www.openstreetmap.org/export/embed.html?bbox=76.9589506%2C28.5849406%2C76.9789506%2C28.6049406&amp;layer=mapnik&amp;marker=28.5949406%2C76.9689506"
              />
              <div className="absolute top-4 left-4 p-3 bg-[#0c0d10]/90 backdrop-blur-md border border-[#23252e] rounded shadow-lg text-xs max-w-xs">
                <span className="font-serif-luxury text-sm text-[#f5f2eb] font-semibold block mb-0.5">
                  Barber&apos;s shop
                </span>
                <span className="text-[#8e909a] block">Khaira Road, Najafgarh, Delhi</span>
                <span className="text-[11px] text-[#c5a880] font-mono block mt-1">28.5949406° N, 76.9689506° E</span>
              </div>
            </div>

            {/* Google Maps Review Transparency Policy Banner */}
            <div className="p-6 rounded-lg bg-[#14151b]/80 border border-[#23252e] text-xs text-[#9597a1] space-y-2">
              <div className="flex items-center gap-2 text-[#c5a880] font-semibold uppercase tracking-wider text-[11px]">
                <Info className="w-4 h-4 text-[#c5a880]" />
                <span>Verified Google Profile & Review Policy</span>
              </div>
              <p className="leading-relaxed">
                In strict accordance with business integrity principles, we never fabricate fake star ratings or invent fictitious testimonials. Real guest reviews and photo shares are located directly on our official Google Maps listing.
              </p>
              <div className="pt-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-[#c5a880] hover:underline font-medium"
                >
                  <span>Read or write a review on Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded Supabase-connected Inquiry Form */}
        <div className="mt-14">
          <InquiryForm services={services} />
        </div>
      </div>
    </section>
  );
};
