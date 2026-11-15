import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — Supabase disabled, using in-memory fallback.');
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const isSupabaseEnabled = !!supabase;

// ─── Type-safe table names ───────────────────────────────────────────────────
export type SupabaseTable =
  | 'shelters'
  | 'user_profiles'
  | 'admin_audit_logs'
  | 'discovered_facilities';

// ─── Helper: safe upsert (no-op if Supabase disabled) ───────────────────────
export async function supabaseUpsert<T extends object>(
  table: SupabaseTable,
  data: T,
  onConflict = 'id'
): Promise<{ data: T | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, { onConflict })
    .select()
    .single();
  if (error) {
    console.error(`[Supabase] upsert ${table} error:`, error.message);
    return { data: null, error: error.message };
  }
  return { data: result as T, error: null };
}

// ─── Helper: safe insert ─────────────────────────────────────────────────────
export async function supabaseInsert<T extends object>(
  table: SupabaseTable,
  data: T
): Promise<{ data: T | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error(`[Supabase] insert ${table} error:`, error.message);
    return { data: null, error: error.message };
  }
  return { data: result as T, error: null };
}

// ─── Helper: safe select all ─────────────────────────────────────────────────
export async function supabaseSelectAll<T>(
  table: SupabaseTable,
  orderBy?: string
): Promise<T[]> {
  if (!supabase) return [];
  let query = supabase.from(table).select('*');
  if (orderBy) query = query.order(orderBy, { ascending: false });
  const { data, error } = await query;
  if (error) {
    console.error(`[Supabase] select ${table} error:`, error.message);
    return [];
  }
  return (data || []) as T[];
}

// ─── Helper: Fetch and map shelters from Supabase ───────────────────────────
export async function fetchSupabaseShelters(): Promise<any[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('shelters').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    console.error('[Supabase] Failed to fetch shelters:', error);
    return [];
  }
  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    coordinates: {
      lat: Number(row.lat) || 12.9716,
      lng: Number(row.lng) || 77.5946
    },
    capacity: Number(row.capacity) || 100,
    currentOccupancy: Number(row.current_occupancy) || 0,
    status: row.status || 'available',
    verificationStatus: row.verification_status || 'verified',
    medicalAvailable: Boolean(row.medical_available),
    contactPhone: row.contact_phone || '',
    facilities: Array.isArray(row.facilities) ? row.facilities : [],
    description: row.description || '',
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.updated_at) || Date.now()
  }));
}

// ─── Helper: safe delete ─────────────────────────────────────────────────────
export async function supabaseDelete(
  table: SupabaseTable,
  id: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`[Supabase] delete ${table} error:`, error.message);
    return false;
  }
  return true;
}
