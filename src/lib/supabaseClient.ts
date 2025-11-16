import { createClient } from '@supabase/supabase-js';

// Function to get Supabase URL (lazy evaluation)
const getSupabaseUrl = (): string => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL not available');
    }
    return url;
};

// Function to get Supabase Anon Key (lazy evaluation)
const getSupabaseAnonKey = (): string => {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY not available');
    }
    return key;
};

// Function to get Supabase Service Key (lazy evaluation)
const getSupabaseServiceKey = (): string | null => {
    return process.env.SUPABASE_SERVICE_KEY || null;
};

// Export lazy-initialized clients
export const getSupabaseClient = (): ReturnType<typeof createClient> => {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey());
};

export const getSupabaseAdminClient = (): ReturnType<typeof createClient> | null => {
    const serviceKey = getSupabaseServiceKey();
    const url = getSupabaseUrl();

    console.log('Initializing supabaseAdmin - SUPABASE_SERVICE_KEY available:', !!serviceKey, 'URL available:', !!url);

    if (!serviceKey) {
        console.error('supabaseAdmin initialization failed: SUPABASE_SERVICE_KEY not available');
        return null;
    }

    try {
        const client = createClient(url, serviceKey, {
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
};

// For backward compatibility, create functions that return the clients
export const supabase = getSupabaseClient;
export const supabaseAdmin = getSupabaseAdminClient;
