import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Public-role database client for server routes. RLS policies still apply. */
export function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to connect Supabase.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
