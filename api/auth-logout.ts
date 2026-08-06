import { getSupabaseAdmin } from './_lib/supabaseAdmin';
import { getBearerToken } from './_lib/adminAuth';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req) || (req.body && req.body.sessionToken);
  if (!token) {
    return res.status(400).json({ error: 'Falta token de sesión' });
  }

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('user_sessions').update({ is_active: false }).eq('session_token', token);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error en auth-logout:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
