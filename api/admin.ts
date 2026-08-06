/**
 * Endpoint único de administración (Vercel Hobby limita a 12 funciones serverless
 * por deployment, así que login/gestión de usuarios/seguridad se consolidan aquí
 * y se despachan por ?resource=).
 */
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { createAdminToken, verifyAdminToken, getBearerToken } from './_lib/adminAuth.js';
import { getClientIP, checkLoginAllowed, recordLoginAttempt } from './_lib/adminSecurity.js';
import { generateTempPassword } from './_lib/password.js';

const USERS_PUBLIC_COLUMNS = [
  'id', 'nombre', 'apellidos', 'dni', 'email', 'telefono', 'parque_sepei',
  'fecha_registro', 'terminos_aceptados', 'fecha_aceptacion_terminos', 'version_terminos',
  'certificado_nif', 'certificado_thumbprint', 'certificado_fecha_validacion', 'certificado_valido',
  'autorizado_votar', 'telegram_chat_id', 'telegram_username', 'telegram_linked_at',
].join(', ');

function passwordMatches(input: string, expected: string): boolean {
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}

// ---- resource=login (sin autenticación previa) ----
async function handleLogin(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD no está configurada en el servidor');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Falta la contraseña' });
  }

  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  const gate = await checkLoginAllowed(ip);
  if (!gate.allowed) return res.status(429).json({ error: gate.message });

  const success = passwordMatches(password, adminPassword);
  await recordLoginAttempt(ip, userAgent, success);

  if (!success) return res.status(401).json({ error: 'Contraseña incorrecta' });

  return res.status(200).json({ token: createAdminToken() });
}

// ---- resource=users (protegido) ----
async function handleUsers(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('users').select(USERS_PUBLIC_COLUMNS).order('fecha_registro', { ascending: false });
    if (error) {
      console.error('Error al listar usuarios:', error);
      return res.status(500).json({ error: 'Error al listar usuarios' });
    }
    return res.status(200).json({ users: data || [] });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Falta id' });
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar usuario:', error);
      return res.status(500).json({ error: 'Error al eliminar usuario' });
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PATCH') {
    const { action, userId } = req.body || {};
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'Falta userId' });

    if (action === 'toggle_voting') {
      const { autorizado } = req.body;
      const { error } = await supabase.from('users').update({ autorizado_votar: !!autorizado }).eq('id', userId);
      if (error) {
        console.error('Error al actualizar autorización de voto:', error);
        return res.status(500).json({ error: 'Error al actualizar autorización' });
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'reset_password') {
      const tempPassword = generateTempPassword(12);
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const { error } = await supabase
        .from('users')
        .update({ password: hashedPassword, requires_password_change: true, password_changed_at: null })
        .eq('id', userId);

      if (error) {
        console.error('Error al resetear contraseña:', error);
        return res.status(500).json({ error: 'Error al resetear contraseña' });
      }
      return res.status(200).json({ success: true, tempPassword });
    }

    return res.status(400).json({ error: 'Acción no reconocida' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ---- resource=security (protegido) ----
async function handleSecurity(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (req.method === 'GET') {
    const { detail } = req.query;

    if (detail === 'stats') {
      const { data, error } = await supabase.rpc('get_security_stats');
      if (error) return res.status(500).json({ error: 'Error al obtener estadísticas' });
      return res.status(200).json({ stats: data });
    }

    if (detail === 'attempts') {
      const { data, error } = await supabase
        .from('admin_login_attempts')
        .select('id, ip_address, attempt_number, success, user_agent, country, city, blocked, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return res.status(500).json({ error: 'Error al obtener intentos' });
      return res.status(200).json({ attempts: data || [] });
    }

    if (detail === 'blocked') {
      const { data, error } = await supabase.from('blocked_ips').select('*').order('blocked_at', { ascending: false });
      if (error) return res.status(500).json({ error: 'Error al obtener IPs bloqueadas' });
      return res.status(200).json({ blocked: data || [] });
    }

    return res.status(400).json({ error: 'detail no reconocido' });
  }

  if (req.method === 'POST') {
    const { action, ip } = req.body || {};
    if (action === 'unblock' && ip) {
      const { error } = await supabase.from('blocked_ips').delete().eq('ip_address', ip);
      if (error) return res.status(500).json({ error: 'Error al desbloquear IP' });
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'Acción no reconocida' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  const resource = req.query.resource as string;

  try {
    if (resource === 'login') {
      return await handleLogin(req, res);
    }

    if (!verifyAdminToken(getBearerToken(req))) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const supabase = getSupabaseAdmin();

    if (resource === 'users') return await handleUsers(req, res, supabase);
    if (resource === 'security') return await handleSecurity(req, res, supabase);

    return res.status(400).json({ error: 'resource no reconocido' });
  } catch (error: any) {
    console.error(`Error en admin?resource=${resource}:`, error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
