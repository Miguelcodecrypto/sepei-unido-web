/**
 * API para desvincular cuenta de Telegram
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
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('users')
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        telegram_linked_at: null,
      })
      .eq('id', sessionUser.id);

    if (error) {
      console.error('Error desvinculando Telegram:', error);
      return res.status(500).json({ error: 'Failed to unlink' });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Error en telegram-unlink:', error);
    return res.status(500).json({ error: error.message });
  }
};
