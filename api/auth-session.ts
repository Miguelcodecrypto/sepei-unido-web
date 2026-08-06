import { getSupabaseAdmin } from './_lib/supabaseAdmin';
import { getBearerToken } from './_lib/adminAuth';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Falta token de sesión' });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Sesión no encontrada o inactiva' });
    }

    if (new Date((session as any).expires_at) < new Date()) {
      await supabase.from('user_sessions').update({ is_active: false }).eq('session_token', token);
      return res.status(401).json({ error: 'Sesión expirada' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, dni, nombre, apellidos, email, verified, autorizado_votar, requires_password_change')
      .eq('id', (session as any).user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', token);

    return res.status(200).json({ user });
  } catch (error: any) {
    console.error('Error en auth-session:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
