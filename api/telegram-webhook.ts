/**
 * Webhook de Telegram para recibir mensajes del bot
 * Este endpoint recibe actualizaciones cuando usuarios interactúan con el bot
 * 
 * CONFIGURACIÓN:
 * 1. Después de desplegar, configurar el webhook ejecutando:
 *    curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://tu-dominio.com/api/telegram-webhook"
 */

// Importar cliente de Supabase directamente para usar en serverless
const { createClient } = require('@supabase/supabase-js');

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
}

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  // Telegram envía POST para webhooks
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Webhook active' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!botToken || !supabaseUrl || !supabaseKey) {
      console.error('❌ Configuración incompleta');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const update: TelegramUpdate = req.body;

    console.log('📱 Webhook recibido:', JSON.stringify(update, null, 2));

    if (!update.message?.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const username = update.message.from.username || update.message.from.first_name;

    // Comando /start - Bienvenida
    if (text === '/start') {
      await sendTelegramMessage(botToken, chatId, 
        `¡Hola ${update.message.from.first_name}! 👋\n\n` +
        `Soy el bot oficial de <b>Movimiento SEPEI Unido</b> 🔴\n\n` +
        `Para recibir notificaciones, necesitas vincular tu cuenta:\n\n` +
        `1️⃣ Ve a tu perfil en sepeiunido.org\n` +
        `2️⃣ Busca la sección "Notificaciones Telegram"\n` +
        `3️⃣ Copia el código de 6 letras\n` +
        `4️⃣ Envíame el código aquí\n\n` +
        `📌 Escribe /ayuda para ver todos los comandos.`
      );
      return res.status(200).json({ ok: true });
    }

    // Comando /ayuda
    if (text === '/ayuda' || text === '/help') {
      await sendTelegramMessage(botToken, chatId,
        `📚 <b>Comandos disponibles:</b>\n\n` +
        `/start - Iniciar el bot\n` +
        `/estado - Ver estado de vinculación\n` +
        `/desvincular - Desvincular cuenta\n` +
        `/ayuda - Ver esta ayuda\n\n` +
        `💡 Para vincular tu cuenta, simplemente envía el código de 6 letras que aparece en tu perfil.`
      );
      return res.status(200).json({ ok: true });
    }

    // Comando /estado
    if (text === '/estado') {
      const { data: user } = await supabase
        .from('usuarios')
        .select('nombre, apellidos')
        .eq('telegram_chat_id', String(chatId))
        .single();

      if (user) {
        await sendTelegramMessage(botToken, chatId,
          `✅ <b>Cuenta vinculada</b>\n\n` +
          `Usuario: ${user.nombre} ${user.apellidos || ''}\n` +
          `Recibirás notificaciones de:\n` +
          `• 📢 Nuevos anuncios\n` +
          `• 🗳️ Nuevas votaciones\n` +
          `• 📊 Resultados de votaciones`
        );
      } else {
        await sendTelegramMessage(botToken, chatId,
          `❌ <b>Cuenta no vinculada</b>\n\n` +
          `No tienes ninguna cuenta vinculada.\n` +
          `Envía el código de 6 letras desde tu perfil para vincular.`
        );
      }
      return res.status(200).json({ ok: true });
    }

    // Comando /desvincular
    if (text === '/desvincular') {
      const { data: user, error } = await supabase
        .from('usuarios')
        .update({ 
          telegram_chat_id: null,
          telegram_username: null,
          telegram_linked_at: null
        })
        .eq('telegram_chat_id', String(chatId))
        .select('nombre')
        .single();

      if (user) {
        await sendTelegramMessage(botToken, chatId,
          `✅ Cuenta desvinculada correctamente.\n\n` +
          `Ya no recibirás notificaciones. Si cambias de opinión, puedes volver a vincular desde tu perfil.`
        );
      } else {
        await sendTelegramMessage(botToken, chatId,
          `⚠️ No hay ninguna cuenta vinculada a este chat.`
        );
      }
      return res.status(200).json({ ok: true });
    }

    // Verificar si es un código de vinculación (6 caracteres alfanuméricos)
    const codePattern = /^[A-Z0-9]{6}$/;
    if (codePattern.test(text.toUpperCase())) {
      const code = text.toUpperCase();
      
      // Buscar el código en la tabla de códigos temporales
      const { data: linkData, error: linkError } = await supabase
        .from('telegram_link_codes')
        .select('user_id, created_at')
        .eq('code', code)
        .single();

      if (!linkData) {
        await sendTelegramMessage(botToken, chatId,
          `❌ <b>Código no válido</b>\n\n` +
          `El código "${code}" no existe o ha expirado.\n` +
          `Por favor, genera un nuevo código desde tu perfil.`
        );
        return res.status(200).json({ ok: true });
      }

      // Verificar que el código no haya expirado (15 minutos)
      const codeDate = new Date(linkData.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - codeDate.getTime()) / (1000 * 60);
      
      if (diffMinutes > 15) {
        // Eliminar código expirado
        await supabase.from('telegram_link_codes').delete().eq('code', code);
        
        await sendTelegramMessage(botToken, chatId,
          `⏰ <b>Código expirado</b>\n\n` +
          `Este código ha expirado (válido por 15 minutos).\n` +
          `Por favor, genera un nuevo código desde tu perfil.`
        );
        return res.status(200).json({ ok: true });
      }

      // Vincular la cuenta
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          telegram_chat_id: String(chatId),
          telegram_username: username,
          telegram_linked_at: new Date().toISOString(),
        })
        .eq('id', linkData.user_id);

      if (updateError) {
        console.error('❌ Error vinculando cuenta:', updateError);
        await sendTelegramMessage(botToken, chatId,
          `❌ Error al vincular la cuenta. Por favor, inténtalo de nuevo.`
        );
        return res.status(200).json({ ok: true });
      }

      // Eliminar el código usado
      await supabase.from('telegram_link_codes').delete().eq('code', code);

      // Obtener nombre del usuario
      const { data: userData } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', linkData.user_id)
        .single();

      await sendTelegramMessage(botToken, chatId,
        `🎉 <b>¡Cuenta vinculada correctamente!</b>\n\n` +
        `Hola ${userData?.nombre || 'compañero/a'}, tu cuenta de Telegram ha sido vinculada.\n\n` +
        `A partir de ahora recibirás:\n` +
        `• 📢 Notificaciones de nuevos anuncios\n` +
        `• 🗳️ Avisos de nuevas votaciones\n` +
        `• 📊 Resultados de votaciones\n\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `🔴 <i>Movimiento SEPEI Unido</i>`
      );
      
      return res.status(200).json({ ok: true });
    }

    // Mensaje no reconocido
    await sendTelegramMessage(botToken, chatId,
      `🤔 No entiendo ese mensaje.\n\n` +
      `Si quieres vincular tu cuenta, envía el código de 6 letras desde tu perfil.\n` +
      `Escribe /ayuda para ver los comandos disponibles.`
    );

    return res.status(200).json({ ok: true });

  } catch (error: any) {
    console.error('❌ Error en telegram-webhook:', error);
    // Siempre responder 200 a Telegram para evitar reintentos
    return res.status(200).json({ ok: true, error: error.message });
  }
};

/**
 * Función auxiliar para enviar mensajes de Telegram
 */
async function sendTelegramMessage(
  botToken: string, 
  chatId: number, 
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    return false;
  }
}
