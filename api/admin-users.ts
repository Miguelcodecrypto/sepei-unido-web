import { getSupabaseAdmin } from './_lib/supabaseAdmin';
import { verifyAdminToken, getBearerToken } from './_lib/adminAuth';
import { generateTempPassword } from './_lib/password';

const PUBLIC_COLUMNS = [
  'id', 'nombre', 'apellidos', 'dni', 'email', 'telefono', 'parque_sepei',
  'fecha_registro', 'terminos_aceptados', 'fecha_aceptacion_terminos', 'version_terminos',
  'certificado_nif', 'certificado_thumbprint', 'certificado_fecha_validacion', 'certificado_valido',
  'autorizado_votar', 'telegram_chat_id', 'telegram_username', 'telegram_linked_at',
].join(', ');

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (!verifyAdminToken(getBearerToken(req))) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('users')
        .select(PUBLIC_COLUMNS)
        .order('fecha_registro', { ascending: false });

      if (error) {
        console.error('Error al listar usuarios:', error);
        return res.status(500).json({ error: 'Error al listar usuarios' });
      }
      return res.status(200).json({ users: data || [] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Falta id' });
      }
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        console.error('Error al eliminar usuario:', error);
        return res.status(500).json({ error: 'Error al eliminar usuario' });
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'PATCH') {
      const { action, userId } = req.body || {};
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'Falta userId' });
      }

      if (action === 'toggle_voting') {
        const { autorizado } = req.body;
        const { error } = await supabase
          .from('users')
          .update({ autorizado_votar: !!autorizado })
          .eq('id', userId);
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
          .update({
            password: hashedPassword,
            requires_password_change: true,
            password_changed_at: null,
          })
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
  } catch (error: any) {
    console.error('Error en admin-users:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
