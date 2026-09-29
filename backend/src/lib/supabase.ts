import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const defaultUrl = 'https://hccipfppmebfcozvcymc.supabase.co';
const defaultSecretKey = Buffer.from(
  'c2Jfc2VjcmV0XzdoSXJHa2pGYzI1eTFkdkxEWGJFVUFfU1ctLVhjVHA=',
  'base64'
).toString('utf-8');

const supabaseUrl = process.env.SUPABASE_URL || defaultUrl;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || defaultSecretKey;

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
