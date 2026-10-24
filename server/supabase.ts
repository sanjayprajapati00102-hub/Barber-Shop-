import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tntnxvnytnxxwyzszikh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_dRvPp77NlutYREfkn63aGw_Kvi78Wqo';

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function saveInquiryToSupabase(inquiry: {
  name: string;
  email?: string | null;
  phone: string;
  service_name?: string | null;
  preferred_date?: string | null;
  message: string;
  status?: string;
}) {
  try {
    const { data, error } = await supabaseServer
      .from('inquiries')
      .insert([
        {
          name: inquiry.name,
          email: inquiry.email || null,
          phone: inquiry.phone,
          service_name: inquiry.service_name || null,
          preferred_date: inquiry.preferred_date || null,
          message: inquiry.message,
          status: inquiry.status || 'new',
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveAppointmentToSupabase(appointment: {
  booking_ref: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  service_name: string;
  start_at: string;
  end_at: string;
  price: number;
  status: string;
  customer_notes?: string | null;
}) {
  try {
    const { data, error } = await supabaseServer
      .from('appointments')
      .insert([
        {
          booking_ref: appointment.booking_ref,
          customer_name: appointment.customer_name,
          customer_email: appointment.customer_email || null,
          customer_phone: appointment.customer_phone,
          service_name: appointment.service_name,
          start_at: appointment.start_at,
          end_at: appointment.end_at,
          price: appointment.price,
          status: appointment.status,
          customer_notes: appointment.customer_notes || null,
        },
      ])
      .select();

    if (error) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
