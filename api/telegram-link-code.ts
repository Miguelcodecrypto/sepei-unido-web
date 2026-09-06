/**
 * API para gestionar códigos de vinculación de Telegram
 */

import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { getSessionUser } from './_lib/session.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    const supabase = getSupabaseAdmin();

    // Eliminar códigos anteriores del usuario
    await supabase
      .from('telegram_link_codes')
      .delete()
      .eq('user_id', sessionUser.id);

    // Insertar nuevo código
    const { error } = await supabase
      .from('telegram_link_codes')
      .insert({
        user_id: sessionUser.id,
        code,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creando código:', error);
      return res.status(500).json({ error: 'Failed to create link code' });
    }

    return res.status(200).json({ success: true, code });

  } catch (error: any) {
    console.error('Error en telegram-link-code POST:', error);
    return res.status(500).json({ error: error.message });
  }
}
