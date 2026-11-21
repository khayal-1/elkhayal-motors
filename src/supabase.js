import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const key = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ekm-auth-session'
      },
      global: { headers: { 'X-Client-Info': 'elkhayal-motors-web' } }
    })
  : null;

export async function getCurrentProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, user_roles(role)')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  const roles = (data?.user_roles || []).map((entry) => entry.role);
  const role = roles.includes('admin') || roles.includes('owner') || roles.includes('manager')
    ? 'admin'
    : roles.includes('employee') ? 'staff' : 'customer';
  return data ? { id: data.id, name: data.full_name || '', phone: data.phone || '', role } : null;
}
