/**
 * Servicio de notificaciones por Telegram para SEPEI Unido
 * Permite enviar mensajes a usuarios que han vinculado su cuenta de Telegram
 * 
 * CONFIGURACIÓN NECESARIA:
 * 1. Crear un bot en Telegram hablando con @BotFather
 * 2. Guardar el token del bot en variables de entorno: TELEGRAM_BOT_TOKEN
 * 3. Configurar el webhook en Vercel: /api/telegram-webhook
 */

export interface TelegramRecipient {
  id: string;
  telegram_chat_id: string;
  nombre: string;
  apellidos?: string;
}

export interface TelegramNotificationData {
  type: 'announcement' | 'voting' | 'voting_results' | 'general';
  titulo: string;
  descripcion: string;
  url?: string;
  extra?: Record<string, any>;
}

// Emojis para cada tipo de notificación
const TYPE_EMOJIS = {
  announcement: '📢',
  voting: '🗳️',
  voting_results: '📊',
  general: '📌',
};

/**
 * Enviar mensaje a un usuario de Telegram
 */
export async function sendTelegramMessage(
  chatId: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/telegram-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error enviando mensaje de Telegram:', errorData);
      return { success: false, error: errorData.error || 'Error desconocido' };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Excepción enviando mensaje de Telegram:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Formatear mensaje para Telegram según el tipo
 */
function formatTelegramMessage(data: TelegramNotificationData, recipientName: string): string {
  const emoji = TYPE_EMOJIS[data.type];
  const greeting = `¡Hola ${recipientName}! 👋`;
  
  let message = `${greeting}\n\n`;
  message += `${emoji} <b>${escapeHtml(data.titulo)}</b>\n\n`;
  
  // Truncar descripción a 300 caracteres para anuncios
  let descripcion = data.descripcion;
  if (data.type === 'announcement' && descripcion.length > 300) {
    descripcion = descripcion.substring(0, 300) + '...';
  }
  message += `${escapeHtml(descripcion)}\n`;
  
  // Añadir información extra según el tipo
  if (data.type === 'voting' && data.extra?.fecha_fin) {
    message += `\n⏰ <i>Fecha límite: ${data.extra.fecha_fin}</i>\n`;
  }
  
  if (data.type === 'voting_results' && data.extra?.resultados) {
    message += '\n📊 <b>Resultados:</b>\n';
    for (const resultado of data.extra.resultados) {
      const bar = generateProgressBar(resultado.porcentaje);
      message += `• ${escapeHtml(resultado.opcion)}: ${resultado.votos} votos (${resultado.porcentaje.toFixed(1)}%)\n`;
      message += `  ${bar}\n`;
    }
    if (data.extra.total_votos) {
      message += `\n📈 Total de votos: ${data.extra.total_votos}`;
    }
  }
  
  if (data.url) {
    if (data.type === 'announcement') {
      message += `\n\n📖 <a href="${data.url}">Leer noticia completa</a>`;
    } else {
      message += `\n\n🔗 <a href="${data.url}">Ver más detalles</a>`;
    }
  }
  
  message += '\n\n━━━━━━━━━━━━━━━━━\n';
  message += '🔴 <i>Movimiento SEPEI Unido</i>';
  
  return message;
}

/**
 * Generar barra de progreso visual
 */
function generateProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Escapar caracteres HTML para Telegram
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Enviar notificación a múltiples usuarios de Telegram
 */
export async function sendTelegramNotification(
  recipients: TelegramRecipient[],
  data: TelegramNotificationData
): Promise<{ success: number; failed: number }> {
  console.log(`📱 [TELEGRAM] Enviando "${data.type}" a ${recipients.length} usuarios`);
  
  let success = 0;
  let failed = 0;

  // Enviar secuencialmente con delay para respetar rate limits de Telegram (30 msg/segundo)
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    if (!recipient.telegram_chat_id) {
      console.log(`⚠️ Usuario ${recipient.nombre} no tiene Telegram vinculado`);
      continue;
    }
    
    try {
      const message = formatTelegramMessage(data, recipient.nombre);

      // En desarrollo, simular envío
      if (import.meta.env?.DEV) {
        console.log(`📱 [DEV] Telegram simulado para: ${recipient.nombre} (chat_id: ${recipient.telegram_chat_id})`);
        console.log(`📱 [DEV] Mensaje:`, message.substring(0, 200) + '...');
        success++;
        continue;
      }

      const result = await sendTelegramMessage(recipient.telegram_chat_id, message);

      if (result.success) {
        console.log(`✅ Telegram enviado a ${recipient.nombre}`);
        success++;
      } else {
        console.error(`❌ Error Telegram para ${recipient.nombre}:`, result.error);
        failed++;
      }
    } catch (error) {
      console.error(`❌ Excepción Telegram para ${recipient.nombre}:`, error);
      failed++;
    }

    // Delay de 50ms entre cada mensaje (20 msg/segundo, más conservador)
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log(`✅ Envío Telegram completado: ${success} éxitos, ${failed} fallos`);
  return { success, failed };
}

/**
 * Enviar notificación de nuevo anuncio por Telegram
 */
export async function sendAnnouncementTelegram(
  recipients: TelegramRecipient[],
  announcement: {
    titulo: string;
    descripcion: string;
    categoria: string;
    url: string;
  }
): Promise<{ success: number; failed: number }> {
  return sendTelegramNotification(recipients, {
    type: 'announcement',
    titulo: announcement.titulo,
    descripcion: announcement.descripcion,
    url: announcement.url,
    extra: { categoria: announcement.categoria },
  });
}

/**
 * Enviar notificación de nueva votación por Telegram
 */
export async function sendVotingTelegram(
  recipients: TelegramRecipient[],
  voting: {
    titulo: string;
    descripcion: string;
    fecha_fin: string;
    url: string;
  }
): Promise<{ success: number; failed: number }> {
  return sendTelegramNotification(recipients, {
    type: 'voting',
    titulo: voting.titulo,
    descripcion: voting.descripcion,
    url: voting.url,
    extra: { fecha_fin: voting.fecha_fin },
  });
}

/**
 * Enviar resultados de votación por Telegram
 */
export async function sendVotingResultsTelegram(
  recipients: TelegramRecipient[],
  results: {
    titulo: string;
    descripcion: string;
    total_votos: number;
    resultados: Array<{
      opcion: string;
      votos: number;
      porcentaje: number;
    }>;
    url: string;
  }
): Promise<{ success: number; failed: number }> {
  return sendTelegramNotification(recipients, {
    type: 'voting_results',
    titulo: results.titulo,
    descripcion: results.descripcion,
    url: results.url,
    extra: {
      total_votos: results.total_votos,
      resultados: results.resultados,
    },
  });
}

/**
 * Generar código único para vincular Telegram
 */
export function generateLinkCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Guardar código de vinculación temporal
 */
export async function saveLinkCode(userId: string, code: string): Promise<boolean> {
  try {
    const response = await fetch('/api/telegram-link-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error guardando código de vinculación:', error);
    return false;
  }
}

/**
 * Verificar estado de vinculación de Telegram
 */
export async function checkTelegramLink(userId: string): Promise<{
  linked: boolean;
  telegram_username?: string;
}> {
  try {
    const response = await fetch(`/api/telegram-status?user_id=${userId}`);
    if (!response.ok) {
      return { linked: false };
    }
    return await response.json();
  } catch (error) {
    console.error('Error verificando vinculación de Telegram:', error);
    return { linked: false };
  }
}

/**
 * Desvincular cuenta de Telegram
 */
export async function unlinkTelegram(userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/telegram-unlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error desvinculando Telegram:', error);
    return false;
  }
}
