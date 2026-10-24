import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const StorySection: React.FC = () => {
  return (
    <section id="craft" className="py-20 md:py-28 border-b border-[#23252e]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Asymmetric 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-20">
          {/* Left Column: Photographic Anchor */}
          <div className="lg:col-span-6 relative">
            <div className="relative aspect-[16/10] sm:aspect-[4/3] rounded-lg overflow-hidden border border-[#23252e] bg-[#14151b] shadow-xl">
              <img
                src="/src/assets/images/barber_shop_interior_1792471152693.jpg"
                alt="Interior environment at Barber's Shop"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10]/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-xs text-[#d8d6ce]">
                <p className="font-serif-luxury text-lg text-[#f5f2eb] mb-1">
                  A Sanctuary of Calm in Najafgarh
                </p>
                <p className="text-[#999ba4]">Tufted leather comfort, heritage warm lighting, and focused artisanal time.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Philosophy */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-3 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#c5a880]" />
              <span>Grooming Philosophy</span>
            </div>

            <h2 className="font-serif-luxury text-3xl sm:text-4xl text-[#f9f7f2] font-normal leading-tight mb-6">
              Precision Scissor Work, Not Hurried Assembly Lines
            </h2>

            <p className="text-sm sm:text-base text-[#a0a2ab] leading-relaxed mb-6">
              In a world of rushed 10-minute buzz cuts, Barber&apos;s shop preserves the dignity of traditional barbering. We analyze head structure, growth cowlicks, and personal routines before making a single cut.
            </p>

            <p className="text-sm sm:text-base text-[#a0a2ab] leading-relaxed mb-8">
              Whether you are preparing for an important family occasion, a critical business interview, or maintaining your weekly signature fade, every appointment is respected with unhurried care.
            </p>

            {/* Editorial Numbered Pillars */}
            <div className="space-y-4 pt-4 border-t border-[#1f212a]">
              <div className="flex items-start gap-4">
                <span className="font-serif-luxury text-xl text-[#c5a880] font-semibold">01</span>
                <div>
                  <h4 className="text-sm font-semibold text-[#ede9e3] mb-1">Sanitized & Single-Use Instruments</h4>
                  <p className="text-xs text-[#858792]">Every straight razor blade is single-use, opened fresh in front of you. Metal combs and clippers undergo medical-grade UV and barbicidal sterilization.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="font-serif-luxury text-xl text-[#c5a880] font-semibold">02</span>
                <div>
                  <h4 className="text-sm font-semibold text-[#ede9e3] mb-1">Therapeutic Hot Towel Lather</h4>
                  <p className="text-xs text-[#858792]">Steamed eucalyptus towels relax facial pores and soften follicles, followed by thick botanical lather for frictionless shaving comfort.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="font-serif-luxury text-xl text-[#c5a880] font-semibold">03</span>
                <div>
                  <h4 className="text-sm font-semibold text-[#ede9e3] mb-1">Guaranteed Scheduled Time</h4>
                  <p className="text-xs text-[#858792]">Booking through our platform locks your chair and barber. You skip physical shop lines and step right into the chair at your designated minute.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Highlight Banner with Shave Photo */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-8 rounded-lg bg-[#13141a] border border-[#23252e] items-center">
          <div className="md:col-span-8">
            <span className="text-xs uppercase tracking-widest text-[#c5a880] font-medium mb-2 block">
              The Gentleman Experience
            </span>
            <h3 className="font-serif-luxury text-2xl sm:text-3xl text-[#f5f2eb] mb-3">
              Need a full reset? Experience The Grand Executive.
            </h3>
            <p className="text-xs sm:text-sm text-[#91939e] max-w-xl mb-4">
              A comprehensive 75-minute private grooming session combining bespoke haircutting, traditional hot towel shave, facial steam, and relaxing neck massage.
            </p>
            <div className="flex items-center gap-6 text-xs text-[#c5a880] font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> 75 Minutes Dedicated</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> ₹650 All Inclusive</span>
            </div>
          </div>

          <div className="md:col-span-4 aspect-[4/3] rounded overflow-hidden border border-[#2a2c38]">
            <img
              src="/src/assets/images/service_royal_shave_1792471151578.jpg"
              alt="The Grand Executive experience"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
