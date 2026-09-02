import { createClient } from '@supabase/supabase-js';

// Admin client — uses the service role key, which bypasses Row Level Security.
// NEVER import this in any client component or expose it to the browser.
// Only used inside server-side API routes (app/api/**/route.js).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}