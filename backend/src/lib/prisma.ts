/**
 * Database client bridge - fully powered by @supabase/supabase-js with SUPABASE_SECRET_KEY.
 * Preserves the db interface for services while completely eliminating Prisma.
 */
import { db } from './supabaseDb';

export const prisma = db;
export { db };
export default db;
