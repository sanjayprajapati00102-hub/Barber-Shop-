import React, { useState, useEffect } from 'react';
import { Service, Staff, BusinessSettings, TimeSlot, Appointment } from '../types';
import { api } from '../lib/api';
import confetti from 'canvas-confetti';
import {
  X, Calendar as CalendarIcon, Clock, User, Check,
  ChevronLeft, AlertCircle, Copy, CheckCheck,
  CalendarPlus, ShieldCheck, Scissors
} from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  staffList: Staff[];
  settings: BusinessSettings | null;
  initialService?: Service | null;
  onBookingSuccess?: (appointment: Appointment) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  services,
  staffList,
  settings,
  initialService,
  onBookingSuccess,
}) => {
  // Steps: 1: Service, 2: Staff, 3: Date, 4: Slot, 5: Customer Info, 6: Review, 7: Confirmed
  const [step, setStep] = useState<number>(1);

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Customer info
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Availability state
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isDayClosed, setIsDayClosed] = useState<boolean>(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // Initialize service if provided
  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
      setStep(2);
    } else if (services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
    }
  }, [initialService, services]);

  // Set default date to today or tomorrow
  useEffect(() => {
    if (!selectedDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [selectedDate]);

  // Query availability whenever date, service, or staff changes
  useEffect(() => {
    if (!isOpen || !selectedService || !selectedDate) return;

    let isMounted = true;
    setLoadingSlots(true);
    setBookingError(null);

    api.getAvailability(selectedDate, selectedService.id, selectedStaffId)
      .then((data) => {
        if (!isMounted) return;
        setIsDayClosed(data.isClosed);
        setAvailableSlots(data.slots || []);
        setAvailabilityMessage(data.message || '');
        // Clear selected time if it's no longer available
        if (selectedTime && !data.slots.some(s => s.time === selectedTime && s.available)) {
          setSelectedTime('');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setBookingError(err.message || 'Failed to load available time slots');
        setAvailableSlots([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDate, selectedService, selectedStaffId]);

  if (!isOpen) return null;

  const currencySymbol = settings?.currency_symbol || '₹';

  // Handle Confirmed Appointment Submission with Transactional Locking
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone) {
      setBookingError('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const appointment = await api.createAppointment({
        serviceId: selectedService.id,
        staffId: selectedStaffId,
        date: selectedDate,
        time: selectedTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerNotes: customerNotes.trim() || undefined,
      });

      setConfirmedBooking(appointment);
      setStep(7);
      if (onBookingSuccess) onBookingSuccess(appointment);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#c5a880', '#ede9e3', '#ffffff', '#8a7353'],
        });
      } catch {
        // ignore if canvas not supported
      }
    } catch (err: any) {
      setBookingError(err.message || 'An error occurred while confirming your reservation.');
      // If conflict error (409), send back to slot selection
      if (err.message && err.message.toLowerCase().includes('conflict')) {
        setStep(4);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Calendar URL Generator
  const getGoogleCalendarUrl = () => {
    if (!confirmedBooking) return '#';
    const title = encodeURIComponent(`${confirmedBooking.service_name_snapshot} at Barber's Shop`);
    const details = encodeURIComponent(
      `Appointment Ref: ${confirmedBooking.booking_ref}\nService: ${confirmedBooking.service_name_snapshot}\nPrice: ₹${confirmedBooking.price_snapshot}\nLocation: ${settings?.address || 'Khaira, Najafgarh, New Delhi'}`
    );
    const location = encodeURIComponent(settings?.address || 'Khaira, Najafgarh, South West Delhi, Delhi, 110043, India');

    // format start & end into YYYYMMDDTHHmmssZ
    const startIso = confirmedBooking.start_at.replace(/[-:]/g, '').replace('.000', '') + 'Z';
    const endIso = confirmedBooking.end_at.replace(/[-:]/g, '').replace('.000', '') + 'Z';

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  const copyRefToClipboard = () => {
    if (confirmedBooking) {
      navigator.clipboard.writeText(confirmedBooking.booking_ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#111218] border border-[#262835] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222430] bg-[#14151e]">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#c5a880] font-medium block">
              Direct Reservation Engine
            </span>
            <h2 className="font-serif-luxury text-xl sm:text-2xl text-[#ede9e3] font-medium">
              {step === 7 ? 'Booking Confirmed' : 'Book Your Grooming Chair'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888a96] hover:text-[#ede9e3] hover:bg-[#1f202b] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator (Steps 1 to 6) */}
        {step < 7 && (
          <div className="px-6 py-2.5 bg-[#0e0f14] border-b border-[#1d1f2a] flex items-center justify-between text-xs text-[#7d808d]">
            <div className="flex items-center gap-2">
              <span className="text-[#c5a880] font-semibold">Step {step} of 6:</span>
              <span className="text-[#ede9e3]">
                {step === 1 && 'Select Service'}
                {step === 2 && 'Choose Barber'}
                {step === 3 && 'Pick Date'}
                {step === 4 && 'Choose Time Slot'}
                {step === 5 && 'Your Information'}
                {step === 6 && 'Review & Confirm'}
              </span>
            </div>
            {selectedService && (
              <span className="font-mono text-[#c5a880] tabular-nums font-semibold">
                {currencySymbol}{selectedService.price} · {selectedService.duration_minutes}m
              </span>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {bookingError && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Reservation Notice</p>
                <p className="text-red-300/90 leading-relaxed">{bookingError}</p>
              </div>
            </div>
          )}

          {/* STEP 1: SELECT SERVICE */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#ede9e3] mb-2">Select Your Desired Treatment</h3>
              <div className="space-y-3">
                {services.map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedService(srv)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-[#c5a880] bg-[#1a1b24]'
                          : 'border-[#232532] bg-[#13141b] hover:border-[#383a4a]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#c5a880] text-[#0d0e11]' : 'bg-[#1e202a] text-[#8e909a]'
                        }`}>
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-[#ede9e3]">{srv.name}</h4>
                            <span className="text-[11px] text-[#7d808d]">({srv.category})</span>
                          </div>
                          <p className="text-xs text-[#8e909a] mt-0.5 line-clamp-1">{srv.description}</p>
                          <span className="text-[11px] text-[#7d808d] mt-1 inline-block">
                            Duration: {srv.duration_minutes} mins
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-base font-bold text-[#ede9e3] tabular-nums block">
                          {currencySymbol}{srv.price}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-[#c5a880] uppercase tracking-wider font-semibold">Selected</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE BARBER */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#ede9e3] mb-2">Select Preferred Barber</h3>
              <div className="space-y-3">
                {/* Any Available Barber Option */}
                <div
                  onClick={() => setSelectedStaffId('any')}
                  className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    selectedStaffId === 'any'
                      ? 'border-[#c5a880] bg-[#1a1b24]'
                      : 'border-[#232532] bg-[#13141b] hover:border-[#383a4a]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#1e202a] border border-[#2b2d3c] flex items-center justify-center text-[#c5a880]">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-[#ede9e3]">Any Available Master Barber</h4>
                      <p className="text-xs text-[#8e909a]">Maximum scheduling flexibility with the first open chair</p>
                    </div>
                  </div>
                  {selectedStaffId === 'any' && (
                    <Check className="w-4 h-4 text-[#c5a880]" />
                  )}
                </div>

                {/* Specific Staff Members */}
                {staffList.map((st) => {
                  const isSelected = selectedStaffId === st.id;
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStaffId(st.id)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#c5a880] bg-[#1a1b24]'
                          : 'border-[#232532] bg-[#13141b] hover:border-[#383a4a]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#1e202a] border border-[#2b2d3c] overflow-hidden flex items-center justify-center text-[#c5a880]">
                          {st.image_url ? (
                            <img src={st.image_url} alt={st.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-[#ede9e3]">{st.display_name}</h4>
                          <p className="text-xs text-[#8e909a]">{st.role_title}</p>
                          {st.bio && <p className="text-[11px] text-[#717380] line-clamp-1 mt-0.5">{st.bio}</p>}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#c5a880]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: PICK DATE */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[#ede9e3] mb-1">Select Appointment Date</h3>
                <p className="text-xs text-[#858792]">Book up to 30 days in advance. Advance booking guarantees no waiting time.</p>
              </div>

              <div className="p-4 rounded-lg bg-[#14151d] border border-[#232532]">
                <label className="text-xs uppercase tracking-wider text-[#9395a1] font-medium block mb-2">
                  Choose Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0d0e13] border border-[#2e303e] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                />
              </div>

              {/* Quick Preset Buttons for Tomorrow, Day After */}
              <div className="flex flex-wrap gap-2 pt-2">
                {[0, 1, 2, 3].map((offset) => {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  const dateStr = d.toISOString().split('T')[0];
                  const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                        isSelected
                          ? 'border-[#c5a880] bg-[#c5a880] text-[#0d0e11] font-semibold'
                          : 'border-[#262835] bg-[#14151d] text-[#8e909a] hover:text-[#ede9e3]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: CHOOSE TIME SLOT */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[#ede9e3] mb-1">Select Available Time Slot</h3>
                <p className="text-xs text-[#858792]">
                  Date: <span className="text-[#ede9e3] font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
              </div>

              {loadingSlots ? (
                <div className="py-12 flex flex-col items-center justify-center text-xs text-[#8e909a]">
                  <div className="w-6 h-6 border-2 border-[#c5a880] border-t-transparent rounded-full animate-spin mb-3" />
                  <span>Checking real-time chair availability...</span>
                </div>
              ) : isDayClosed ? (
                <div className="py-10 px-6 rounded-lg bg-[#14151d] border border-[#232532] text-center text-xs text-[#a0a2af]">
                  <Clock className="w-8 h-8 text-[#e26b6b] mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-sm text-[#ede9e3] mb-1">Shop Closed on this Date</p>
                  <p className="max-w-xs mx-auto text-[#858792]">Please choose another date from our weekly calendar.</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-10 px-6 rounded-lg bg-[#14151d] border border-[#232532] text-center text-xs text-[#a0a2af]">
                  <Clock className="w-8 h-8 text-[#c5a880] mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-sm text-[#ede9e3] mb-1">No Available Slots for this Date</p>
                  <p className="max-w-xs mx-auto text-[#858792]">
                    {availabilityMessage || 'All chairs are fully booked or minimum notice window has closed. Please pick an alternative date.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-3 px-2 rounded-lg text-xs font-mono tabular-nums font-semibold transition-all border ${
                            isSelected
                              ? 'bg-[#c5a880] text-[#0d0e11] border-[#c5a880] shadow-md'
                              : 'bg-[#14151d] text-[#ede9e3] border-[#252735] hover:border-[#c5a880]/50'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#737582] text-center pt-2">
                    Slots reflect real-time chair reservations and 5-min sanitized tool turnover.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: CUSTOMER INFORMATION */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#ede9e3] mb-1">Your Booking Details</h3>
                <p className="text-xs text-[#858792]">We use your phone number to look up your chair reservation upon arrival.</p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                    Full Name <span className="text-[#c5a880]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                    Phone Number (for SMS & Chair lookup) <span className="text-[#c5a880]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                    Email Address <span className="text-[#717380]">(Optional, for calendar confirmation)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                    Grooming Notes or Requests <span className="text-[#717380]">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Low taper fade, sensitive skin on neck"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#2b2d3b] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & CONFIRM */}
          {step === 6 && selectedService && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-[#ede9e3] mb-1">Review Appointment Summary</h3>
                <p className="text-xs text-[#858792]">Please verify your booking details before reserving.</p>
              </div>

              <div className="p-5 rounded-lg bg-[#14151e] border border-[#262835] space-y-4">
                <div className="flex items-start justify-between border-b border-[#212330] pb-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#8e909a] block">Service</span>
                    <h4 className="font-serif-luxury text-xl text-[#f5f2eb] font-medium">{selectedService.name}</h4>
                    <span className="text-xs text-[#8e909a]">Allocated Time: {selectedService.duration_minutes} Minutes</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-[#ede9e3] tabular-nums">
                    {currencySymbol}{selectedService.price}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#7d808d] block text-[11px] uppercase tracking-wider mb-0.5">Date & Time</span>
                    <span className="text-[#ede9e3] font-medium">{selectedDate} at {selectedTime}</span>
                  </div>
                  <div>
                    <span className="text-[#7d808d] block text-[11px] uppercase tracking-wider mb-0.5">Barber</span>
                    <span className="text-[#ede9e3] font-medium">
                      {selectedStaffId === 'any' ? 'Any Available Master Barber' : staffList.find(s => s.id === selectedStaffId)?.display_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7d808d] block text-[11px] uppercase tracking-wider mb-0.5">Guest Name</span>
                    <span className="text-[#ede9e3] font-medium">{customerName}</span>
                  </div>
                  <div>
                    <span className="text-[#7d808d] block text-[11px] uppercase tracking-wider mb-0.5">Contact</span>
                    <span className="text-[#ede9e3] font-medium">{customerPhone}</span>
                  </div>
                </div>

                {customerNotes && (
                  <div className="text-xs pt-2 border-t border-[#1f212a]">
                    <span className="text-[#7d808d] block text-[11px] uppercase tracking-wider mb-0.5">Notes:</span>
                    <p className="text-[#a6a8b4] italic">{customerNotes}</p>
                  </div>
                )}
              </div>

              {/* Cancellation Policy note */}
              <div className="p-3.5 rounded bg-[#101117] border border-[#222431] text-[11px] text-[#8e909a] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
                <span>
                  {settings?.cancellation_policy || 'Free cancellation up to 2 hours prior to scheduled appointment.'} Pay at the shop upon service completion.
                </span>
              </div>
            </div>
          )}

          {/* STEP 7: CONFIRMATION STATE */}
          {step === 7 && confirmedBooking && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#c5a880]/15 border border-[#c5a880]/40 flex items-center justify-center mx-auto text-[#c5a880]">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-serif-luxury text-2xl sm:text-3xl text-[#f5f2eb] font-medium mb-1">
                  Your Chair Is Reserved
                </h3>
                <p className="text-xs sm:text-sm text-[#8e909a] max-w-md mx-auto">
                  We look forward to serving you at Barber&apos;s shop in Khaira, Najafgarh.
                </p>
              </div>

              {/* Booking Reference Card */}
              <div className="p-5 rounded-lg bg-[#14151e] border border-[#2b2d3d] max-w-md mx-auto text-left space-y-3">
                <div className="flex items-center justify-between border-b border-[#222432] pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8e909a] block">Booking Reference</span>
                    <span className="font-mono text-2xl font-bold text-[#c5a880] tracking-wider">
                      {confirmedBooking.booking_ref}
                    </span>
                  </div>
                  <button
                    onClick={copyRefToClipboard}
                    className="p-2 rounded bg-[#1f212c] hover:bg-[#2b2d3b] text-[#ede9e3] text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedRef ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRef ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#818390]">Service:</span>
                    <span className="text-[#ede9e3] font-medium">{confirmedBooking.service_name_snapshot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#818390]">Appointment Date & Time:</span>
                    <span className="text-[#ede9e3] font-medium">
                      {confirmedBooking.start_at.split('T')[0]} at {confirmedBooking.start_at.split('T')[1].slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#818390]">Total Investment:</span>
                    <span className="text-[#ede9e3] font-mono font-bold tabular-nums">
                      {currencySymbol}{confirmedBooking.price_snapshot}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#818390]">Guest Name:</span>
                    <span className="text-[#ede9e3] font-medium">{confirmedBooking.customer_name}</span>
                  </div>
                </div>
              </div>

              {/* Actions: Add to Google Calendar & Done */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-4 py-2.5 rounded text-xs font-semibold uppercase tracking-wider text-[#ede9e3] border border-[#2e3140] hover:border-[#c5a880] hover:bg-[#181a24] transition-all flex items-center gap-2"
                >
                  <CalendarPlus className="w-4 h-4 text-[#c5a880]" />
                  <span>Add to Google Calendar</span>
                </a>

                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider text-[#0d0e11] bg-[#c5a880] hover:bg-[#d8bc94] transition-colors"
                >
                  Finished
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation (Step Back & Next buttons) */}
        {step < 7 && (
          <div className="px-6 py-4 border-t border-[#222430] bg-[#14151e] flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-xs font-medium text-[#8e909a] hover:text-[#ede9e3] hover:bg-[#1c1e28] rounded flex items-center gap-1.5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                onClick={() => {
                  if (step === 1 && !selectedService) return;
                  if (step === 3 && !selectedDate) return;
                  if (step === 4 && !selectedTime) return;
                  if (step === 5 && (!customerName || !customerPhone)) {
                    setBookingError('Please enter your full name and phone number.');
                    return;
                  }
                  setBookingError(null);
                  setStep(step + 1);
                }}
                disabled={
                  (step === 1 && !selectedService) ||
                  (step === 3 && !selectedDate) ||
                  (step === 4 && !selectedTime) ||
                  (step === 5 && (!customerName || !customerPhone))
                }
                className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#0d0e11] bg-[#c5a880] hover:bg-[#d8bc94] active:bg-[#b0946c] disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#0d0e11] bg-[#c5a880] hover:bg-[#d8bc94] active:bg-[#b0946c] disabled:opacity-50 rounded transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Reserving Chair...</span>
                  </>
                ) : (
                  <span>Confirm Reservation</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
