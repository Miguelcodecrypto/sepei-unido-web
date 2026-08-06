import { randomBytes } from 'crypto';
import { getSupabaseAdmin } from './_lib/supabaseAdmin';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

const PUBLIC_USER_FIELDS = {
  id: true, dni: true, nombre: true, apellidos: true, email: true,
  verified: true, autorizado_votar: true, requires_password_change: true,
};

function toPublicUser(user: any) {
  const out: any = {};
  for (const key of Object.keys(PUBLIC_USER_FIELDS)) out[key] = user[key];
  return out;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dni, password } = req.body || {};
  if (!dni || !password || typeof dni !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Faltan DNI o contraseña' });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('dni', dni.toUpperCase().trim())
      .maybeSingle();

    if (userError) {
      console.error('Error al buscar usuario:', userError);
      return res.status(500).json({ error: 'Error interno' });
    }

    if (!user || !(user as any).password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(password, (user as any).password);
    if (!isValid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    if (!(user as any).verified) {
      return res.status(403).json({ error: 'Tu cuenta aún no está verificada. Revisa tu email.' });
    }

    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const { error: sessionError } = await supabase.from('user_sessions').insert({
      user_id: (user as any).id,
      session_token: sessionToken,
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: userAgent,
      is_active: true,
    });

    if (sessionError) {
      console.error('Error al crear sesión:', sessionError);
      return res.status(500).json({ error: 'Error al crear sesión' });
    }

    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', (user as any).id);

    return res.status(200).json({ sessionToken, user: toPublicUser(user) });
  } catch (error: any) {
    console.error('Error en auth-login:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
