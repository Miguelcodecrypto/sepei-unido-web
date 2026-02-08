/**
 * API para verificar estado de vinculación de Telegram
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('usuarios')
      .select('telegram_chat_id, telegram_username, telegram_linked_at')
      .eq('id', user_id)
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
