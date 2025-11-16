import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Admin Supabase (bypasses RLS)
// NEVER import this in client components
export const supabaseAdmin = (() => {
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    console.log('Initializing supabaseAdmin - SUPABASE_SERVICE_KEY available:', !!serviceKey, 'URL available:', !!supabaseUrl);

    if (!serviceKey || !supabaseUrl) {
        console.error('supabaseAdmin initialization failed: SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_URL not available');
        return null;
    }

    try {
        const client = createClient(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        console.log('supabaseAdmin initialized successfully');
        return client;
    } catch (error) {
        console.error('Error creating supabaseAdmin client:', error);
        return null;
    }
})();
