import React, { useState } from 'react';
import { Service, BusinessSettings } from '../types';
import { Clock, Scissors, ArrowUpRight } from 'lucide-react';

interface ServicesSectionProps {
  services: Service[];
  settings: BusinessSettings | null;
  onSelectService: (service: Service) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  settings,
  onSelectService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category === selectedCategory);

  const currencySymbol = settings?.currency_symbol || '₹';

  return (
    <section id="services" className="py-20 md:py-28 border-b border-[#23252e]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-3 font-medium">
              <Scissors className="w-3.5 h-3.5 text-[#c5a880]" />
              <span>Tailored Grooming Menu</span>
            </div>
            <h2 className="font-serif-luxury text-3xl sm:text-4xl lg:text-5xl text-[#f9f7f2] font-normal tracking-tight">
              Crafted Services & Transparent Pricing
            </h2>
          </div>
          <p className="text-sm text-[#8e909a] max-w-md">
            Every appointment is allocated generous time for consultation, precision cutting, and soothing hot-towel treatment.
          </p>
        </div>

        {/* Filter Tabs (Interactive functional buttons) */}
        <div className="flex items-center gap-2 p-1.5 bg-[#14151b] border border-[#23252e] rounded-lg mb-10 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#c5a880] text-[#0d0e11] font-semibold shadow-sm'
                  : 'text-[#9e9fa6] hover:text-[#ede9e3] hover:bg-[#1f2029]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map(service => (
            <div
              key={service.id}
              className="group flex flex-col justify-between bg-[#13141a] border border-[#23252e] hover:border-[#c5a880]/40 rounded-lg overflow-hidden transition-all duration-200"
            >
              {/* Image Container with 4:3 Aspect Ratio */}
              <div className="relative aspect-[4/3] bg-[#1a1b22] overflow-hidden">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 filter brightness-95"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#181920] text-[#555]">
                    <Scissors className="w-8 h-8 text-[#444]" />
                  </div>
                )}
                {service.is_featured === 1 && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#0d0e11] bg-[#c5a880] rounded">
                    Featured Craft
                  </div>
                )}
              </div>

              {/* Service Info */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  {/* Clean unboxed metadata with separators */}
                  <div className="flex items-center gap-2 text-xs text-[#82848f] mb-2 font-medium">
                    <span>{service.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#c5a880]" />
                      <span>{service.duration_minutes} mins</span>
                    </span>
                  </div>

                  <h3 className="font-serif-luxury text-xl sm:text-2xl text-[#f5f2eb] font-medium mb-2.5 group-hover:text-[#c5a880] transition-colors">
                    {service.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#9496a0] leading-relaxed mb-6">
                    {service.description}
                  </p>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-4 border-t border-[#1f212a] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] uppercase tracking-wider text-[#737580]">Investment</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-[#ede9e3]">
                      {currencySymbol}{service.price}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectService(service)}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#d8d6ce] border border-[#2c2e39] group-hover:border-[#c5a880] group-hover:text-[#0c0d10] group-hover:bg-[#c5a880] rounded transition-all flex items-center gap-1.5"
                  >
                    <span>Book Service</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transparent Note */}
        <div className="mt-12 p-4 rounded bg-[#13141a]/60 border border-[#23252e] text-xs text-[#858792] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span>
            Menu pricing is subject to owner confirmation and customized hair lengths. Complimentary consultation included with every visit.
          </span>
          <span className="text-[#c5a880] font-medium whitespace-nowrap shrink-0">
            Payment accepted: Cash, UPI, Cards
          </span>
        </div>
      </div>
    </section>
  );
};
