/**
 * API para verificar estado de vinculación de Telegram
 */

import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { getSessionUser } from './_lib/session.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_username, telegram_linked_at')
      .eq('id', sessionUser.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ linked: false });
    }

    return res.status(200).json({
      linked: !!data.telegram_chat_id,
      telegram_username: data.telegram_username,
      linked_at: data.telegram_linked_at,
    });

  } catch (error: any) {
    console.error('Error en telegram-status:', error);
    return res.status(500).json({ error: error.message });
  }
};
