/**
 * Rate limiting y bloqueo de IPs por intentos fallidos de login (admin y usuario comparten
 * la misma tabla/bloqueo por IP; es una limitación aceptada, no un descuido: separar ambos
 * requeriría una columna de contexto nueva en admin_login_attempts).
 * Traído server-side desde src/services/adminSecurityService.ts.
 * A diferencia del original, NUNCA se guarda la contraseña intentada en texto plano.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js';
export { getClientIP } from './clientIp.js';

const MAX_ATTEMPTS_BEFORE_BLOCK = 3;
const BLOCK_DURATION_HOURS = 24;
const RATE_LIMIT_WINDOW_MINUTES = 5;
const MAX_ATTEMPTS_IN_WINDOW = 5;

export async function isIPBlocked(ip: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('blocked_ips')
    .select('id')
    .eq('ip_address', ip)
    .or('blocked_until.is.null,blocked_until.gt.now()')
    .limit(1);
  return !!(data && data.length > 0);
}

async function countFailedAttempts(ip: string, hours: number): Promise<number> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('admin_login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('success', false)
    .gte('created_at', since);
  return count || 0;
}

async function countRecentAttempts(ip: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('admin_login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', since);
  return count || 0;
}

async function blockIP(ip: string, reason: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const blockedUntil = new Date(Date.now() + BLOCK_DURATION_HOURS * 60 * 60 * 1000).toISOString();
  await supabase.from('blocked_ips').upsert(
    { ip_address: ip, reason, blocked_until: blockedUntil, blocked_at: new Date().toISOString() },
    { onConflict: 'ip_address' }
  );
}

export interface LoginGate {
  allowed: boolean;
  message?: string;
}

/**
 * Comprueba si se permite intentar el login desde esta IP (bloqueo + rate limit).
 * Llamar ANTES de verificar la contraseña.
 */
export async function checkLoginAllowed(ip: string): Promise<LoginGate> {
  if (await isIPBlocked(ip)) {
    return { allowed: false, message: 'Tu IP ha sido bloqueada temporalmente por múltiples intentos fallidos. Inténtalo más tarde.' };
  }

  const recentAttempts = await countRecentAttempts(ip);
  if (recentAttempts >= MAX_ATTEMPTS_IN_WINDOW) {
    return { allowed: false, message: `Demasiados intentos. Espera ${RATE_LIMIT_WINDOW_MINUTES} minutos antes de volver a intentarlo.` };
  }

  return { allowed: true };
}

/**
 * Registra el resultado de un intento de login (sin guardar la contraseña) y bloquea la IP si corresponde.
 * Llamar DESPUÉS de verificar la contraseña.
 */
export async function recordLoginAttempt(ip: string, userAgent: string, success: boolean): Promise<void> {
  const supabase = getSupabaseAdmin();
  const failedAttempts = await countFailedAttempts(ip, 24);

  await supabase.from('admin_login_attempts').insert({
    ip_address: ip,
    attempted_password: null,
    attempt_number: failedAttempts + 1,
    success,
    user_agent: userAgent,
    blocked: false,
  });

  if (!success && failedAttempts + 1 >= MAX_ATTEMPTS_BEFORE_BLOCK) {
    await blockIP(ip, `Más de ${MAX_ATTEMPTS_BEFORE_BLOCK} intentos fallidos de login al panel admin`);
  }
}
