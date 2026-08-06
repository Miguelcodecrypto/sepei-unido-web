/**
 * Cliente Supabase con la service_role key.
 * Solo debe importarse desde funciones serverless (api/*.ts), nunca desde código de cliente:
 * bypasa RLS por completo, así que cada endpoint que lo use es responsable de comprobar
 * autorización antes de leer o escribir datos.
 */
import { createClient } from '@supabase/supabase-js';

let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cached) return cached;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor');
  }

  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cached;
}
