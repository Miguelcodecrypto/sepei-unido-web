import { getSupabaseAdmin } from './_lib/supabaseAdmin';
import { verifyAdminToken, getBearerToken } from './_lib/adminAuth';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (!verifyAdminToken(getBearerToken(req))) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { resource } = req.query;

      if (resource === 'stats') {
        const { data, error } = await supabase.rpc('get_security_stats');
        if (error) return res.status(500).json({ error: 'Error al obtener estadísticas' });
        return res.status(200).json({ stats: data });
      }

      if (resource === 'attempts') {
        const { data, error } = await supabase
          .from('admin_login_attempts')
          .select('id, ip_address, attempt_number, success, user_agent, country, city, blocked, created_at')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) return res.status(500).json({ error: 'Error al obtener intentos' });
        return res.status(200).json({ attempts: data || [] });
      }

      if (resource === 'blocked') {
        const { data, error } = await supabase
          .from('blocked_ips')
          .select('*')
          .order('blocked_at', { ascending: false });
        if (error) return res.status(500).json({ error: 'Error al obtener IPs bloqueadas' });
        return res.status(200).json({ blocked: data || [] });
      }

      return res.status(400).json({ error: 'resource no reconocido' });
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
  } catch (error: any) {
    console.error('Error en admin-security:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
