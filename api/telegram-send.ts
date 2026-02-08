/**
 * API Endpoint para enviar mensajes de Telegram
 * Vercel Serverless Function
 */

interface TelegramSendRequest {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN no está configurado');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'TELEGRAM_BOT_TOKEN is not configured'
      });
    }

    const { chat_id, text, parse_mode = 'HTML' }: TelegramSendRequest = req.body;

    if (!chat_id || !text) {
      return res.status(400).json({ error: 'Missing required fields: chat_id and text' });
    }

    console.log(`📱 Enviando mensaje de Telegram a chat_id: ${chat_id}`);

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode,
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Error de Telegram API:', data);
      return res.status(500).json({ 
        error: 'Telegram API error',
        details: data.description || 'Unknown error'
      });
    }

    console.log('✅ Mensaje de Telegram enviado correctamente');
    return res.status(200).json({ success: true, message_id: data.result.message_id });

  } catch (error: any) {
    console.error('❌ Error en telegram-send:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
