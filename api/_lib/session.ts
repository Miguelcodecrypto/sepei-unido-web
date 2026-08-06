/**
 * Validación de sesión de usuario compartida por endpoints que necesitan saber
 * quién es el usuario real detrás de una petición (nunca confiar en un DNI/email
 * que mande el cliente en el body — ver api/voting.ts).
 *
 * Misma tabla y lógica que api/auth.ts (handleSession), extraída aquí para
 * reutilizarla sin duplicar el criterio de expiración/estado de la sesión.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { getBearerToken } from './adminAuth.js';

export interface SessionUser {
  id: string;
  dni: string;
  nombre: string;
  apellidos: string;
  email: string;
  verified: boolean;
  autorizado_votar: boolean;
}

export async function getSessionUser(req: any): Promise<SessionUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const supabase = getSupabaseAdmin();

  const { data: session, error: sessionError } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (sessionError || !session) return null;

  if (new Date((session as any).expires_at) < new Date()) {
    await (supabase.from('user_sessions') as any).update({ is_active: false }).eq('session_token', token);
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, dni, nombre, apellidos, email, verified, autorizado_votar')
    .eq('id', (session as any).user_id)
    .maybeSingle();

  if (userError || !user) return null;

  return user as any as SessionUser;
}
