/**
 * API para gestionar códigos de vinculación de Telegram
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // POST - Crear nuevo código de vinculación
  if (req.method === 'POST') {
    try {
      const { user_id, code } = req.body;

      if (!user_id || !code) {
        return res.status(400).json({ error: 'Missing user_id or code' });
      }

      // Eliminar códigos anteriores del usuario
      await supabase
        .from('telegram_link_codes')
        .delete()
        .eq('user_id', user_id);

      // Insertar nuevo código
      const { error } = await supabase
        .from('telegram_link_codes')
        .insert({
          user_id,
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

  // GET - Verificar código
  if (req.method === 'GET') {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Missing code parameter' });
      }

      const { data, error } = await supabase
        .from('telegram_link_codes')
        .select('user_id, created_at')
        .eq('code', code)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Code not found' });
      }

      return res.status(200).json({ valid: true, user_id: data.user_id });

    } catch (error: any) {
      console.error('Error en telegram-link-code GET:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
