/**
 * API para desvincular cuenta de Telegram
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('users')
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        telegram_linked_at: null,
      })
      .eq('id', user_id);

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
