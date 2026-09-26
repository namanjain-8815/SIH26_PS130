import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';

if (!supabaseUrl) {
  console.warn('⚠️ Warning: SUPABASE_URL is not set in environment.');
}

if (!supabaseSecretKey || supabaseSecretKey.includes('••••')) {
  console.warn(
    '⚠️ Warning: SUPABASE_SECRET_KEY is missing or contains masked bullet characters (••••). Please paste your full unmasked secret key into backend/.env.'
  );
}

// Client initialized with SUPABASE_SECRET_KEY for full database admin operations
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
