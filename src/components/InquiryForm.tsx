import React, { useState } from 'react';
import { Service } from '../types';
import { api } from '../lib/api';
import { Send, CheckCircle2, AlertCircle, Database, HelpCircle } from 'lucide-react';

interface InquiryFormProps {
  services: Service[];
}

export const InquiryForm: React.FC<InquiryFormProps> = ({ services }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    inquiryId: string;
    supabaseMessage: string;
    supabaseSuccess: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      setErrorMessage('Please fill in your name, phone number, and inquiry message.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.createInquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        serviceName: serviceName || undefined,
        preferredDate: preferredDate || undefined,
        message: message.trim(),
      });

      setSuccessResult({
        inquiryId: res.inquiry.id,
        supabaseMessage: res.supabaseSync.message,
        supabaseSuccess: res.supabaseSync.success,
      });

      // Clear form
      setName('');
      setPhone('');
      setEmail('');
      setServiceName('');
      setPreferredDate('');
      setMessage('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="inquiry" className="p-6 sm:p-8 rounded-lg bg-[#13141a] border border-[#23252e] relative overflow-hidden">
      {/* Top Tag & Supabase Connection Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f212a] pb-4 mb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#c5a880] font-medium block">
            Direct Consultation & Questions
          </span>
          <h3 className="font-serif-luxury text-2xl text-[#f5f2eb] font-medium mt-0.5">
            Send an Inquiry
          </h3>
        </div>

        {/* Supabase Live Integration Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#101915] border border-emerald-800/40 text-[11px] text-emerald-300 font-mono">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Connected to Supabase</span>
        </div>
      </div>

      {successResult ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h4 className="font-serif-luxury text-2xl text-[#ede9e3] font-medium mb-1">
              Inquiry Dispatched Successfully!
            </h4>
            <p className="text-xs sm:text-sm text-[#9598a6] max-w-md mx-auto">
              Our team has received your inquiry. We will contact you at your provided phone number shortly.
            </p>
          </div>

          {/* Sync status card */}
          <div className="p-4 rounded-lg bg-[#0e0f14] border border-[#222431] max-w-md mx-auto text-left text-xs text-[#8e909a] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#c5a880]">Supabase Table Sync:</span>
              <span className={`font-semibold ${successResult.supabaseSuccess ? 'text-emerald-400' : 'text-amber-400'}`}>
                {successResult.supabaseSuccess ? 'Live Synchronized' : 'Recorded in Database'}
              </span>
            </div>
            <p className="text-[11px] text-[#717380] leading-relaxed">
              {successResult.supabaseMessage}
            </p>
          </div>

          <button
            onClick={() => setSuccessResult(null)}
            className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#0d0e11] bg-[#c5a880] hover:bg-[#d8bc94] rounded transition-colors"
          >
            Send Another Inquiry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                Full Name <span className="text-[#c5a880]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sanjay Prajapati"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#262835] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                Phone Number <span className="text-[#c5a880]">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#262835] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                Email Address <span className="text-[#6c6e7a]">(Optional)</span>
              </label>
              <input
                type="email"
                placeholder="e.g. sanjay@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#262835] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
                Treatment of Interest <span className="text-[#6c6e7a]">(Optional)</span>
              </label>
              <select
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#262835] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
              >
                <option value="">General Inquiry / Custom Consultation</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} (₹{s.price})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
              Preferred Date <span className="text-[#6c6e7a]">(Optional)</span>
            </label>
            <input
              type="date"
              value={preferredDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full px-4 py-2 bg-[#0e0f14] border border-[#262835] rounded-lg text-xs text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#9395a1] font-medium block mb-1.5">
              Your Message or Questions <span className="text-[#c5a880]">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Tell us what style you are looking for, group bookings, or any special grooming requests..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0e0f14] border border-[#262835] rounded-lg text-sm text-[#ede9e3] focus:outline-none focus:border-[#c5a880]"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-[11px] text-[#717380] flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#c5a880]" />
              <span>Inquiry details are saved directly to your Supabase backend table.</span>
            </span>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-7 py-3 text-xs font-semibold uppercase tracking-wider text-[#0d0e11] bg-[#c5a880] hover:bg-[#d8bc94] active:bg-[#b0946c] disabled:opacity-50 rounded transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Inquiry</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
