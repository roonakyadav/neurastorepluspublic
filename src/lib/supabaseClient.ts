import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Admin Supabase (bypasses RLS)
// NEVER import this in client components
export const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
    ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;
