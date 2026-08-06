import { getSupabaseAdmin } from './_lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dni, currentPassword, newPassword } = req.body || {};
  if (!dni || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, password')
      .eq('dni', String(dni).toUpperCase().trim())
      .maybeSingle();

    if (findError || !user || !(user as any).password) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, (user as any).password);
    if (!isValid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedNewPassword,
        requires_password_change: false,
        password_changed_at: new Date().toISOString(),
      })
      .eq('id', (user as any).id);

    if (updateError) {
      console.error('Error al actualizar contraseña:', updateError);
      return res.status(500).json({ error: 'Error al actualizar la contraseña' });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error en auth-change-password:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
