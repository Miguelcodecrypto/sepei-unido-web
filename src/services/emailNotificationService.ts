/**
 * Servicio de notificaciones por email para anuncios y votaciones
 * Permite enviar emails masivos a usuarios seleccionados
 */

export interface EmailRecipient {
  id: string;
  email: string;
  nombre: string;
  apellidos?: string;
}

export interface AnnouncementNotificationData {
  titulo: string;
  descripcion: string;
  categoria: string;
  url: string;
}

export interface VotingNotificationData {
  titulo: string;
  descripcion: string;
  fecha_fin: string;
  url: string;
}

/**
 * Enviar notificación de nuevo anuncio
 */
export async function sendAnnouncementNotification(
  recipients: EmailRecipient[],
  announcement: AnnouncementNotificationData
): Promise<{ success: number; failed: number }> {
  console.log(`📧 [NOTIFICACIONES] Enviando anuncio a ${recipients.length} usuarios`);
  
  let success = 0;
  let failed = 0;

  // Enviar en lotes de 10 para no saturar
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const promises = batch.map(async (recipient) => {
      try {
        const html = generateAnnouncementEmailHTML(recipient, announcement);
        const text = generateAnnouncementEmailText(recipient, announcement);

        // En desarrollo, simular envío
        if (import.meta.env?.DEV) {
          console.log(`📧 [DEV] Email simulado para: ${recipient.email}`);
          return true;
        }

        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipient.email,
            subject: `📢 Nuevo anuncio: ${announcement.titulo}`,
            html,
            text,
          }),
        });

        return response.ok;
      } catch (error) {
        console.error(`❌ Error enviando a ${recipient.email}:`, error);
        return false;
      }
    });

    const results = await Promise.all(promises);
    success += results.filter(r => r).length;
    failed += results.filter(r => !r).length;

    // Pausa entre lotes
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Envío completado: ${success} éxitos, ${failed} fallos`);
  return { success, failed };
}

/**
 * Enviar notificación de nueva votación
 */
export async function sendVotingNotification(
  recipients: EmailRecipient[],
  voting: VotingNotificationData
): Promise<{ success: number; failed: number }> {
  console.log(`📧 [NOTIFICACIONES] Enviando votación a ${recipients.length} usuarios`);
  
  let success = 0;
  let failed = 0;

  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const promises = batch.map(async (recipient) => {
      try {
        const html = generateVotingEmailHTML(recipient, voting);
        const text = generateVotingEmailText(recipient, voting);

        if (import.meta.env?.DEV) {
          console.log(`📧 [DEV] Email simulado para: ${recipient.email}`);
          return true;
        }

        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipient.email,
            subject: `🗳️ Nueva votación: ${voting.titulo}`,
            html,
            text,
          }),
        });

        return response.ok;
      } catch (error) {
        console.error(`❌ Error enviando a ${recipient.email}:`, error);
        return false;
      }
    });

    const results = await Promise.all(promises);
    success += results.filter(r => r).length;
    failed += results.filter(r => !r).length;

    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Envío completado: ${success} éxitos, ${failed} fallos`);
  return { success, failed };
}

/**
 * HTML para notificación de anuncio
 */
function generateAnnouncementEmailHTML(
  recipient: EmailRecipient,
  announcement: AnnouncementNotificationData
): string {
  const categoryColors: Record<string, { bg: string; text: string }> = {
    importante: { bg: '#dc2626', text: '#ffffff' },
    informacion: { bg: '#3b82f6', text: '#ffffff' },
    evento: { bg: '#16a34a', text: '#ffffff' },
    urgente: { bg: '#f59e0b', text: '#ffffff' },
  };

  const color = categoryColors[announcement.categoria] || categoryColors.informacion;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📢 SEPEI UNIDO</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Nuevo Anuncio</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
                Hola <strong>${recipient.nombre}</strong>,
              </p>

              <!-- Categoría Badge -->
              <div style="display: inline-block; background-color: ${color.bg}; color: ${color.text}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 20px 0;">
                ${announcement.categoria}
              </div>

              <!-- Anuncio Box -->
              <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">${announcement.titulo}</h2>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-line;">${announcement.descripcion}</p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${announcement.url}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Ver en el tablón
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">
                Has recibido este email porque estás registrado en SEPEI UNIDO
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} SEPEI UNIDO
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Texto plano para anuncio
 */
function generateAnnouncementEmailText(
  recipient: EmailRecipient,
  announcement: AnnouncementNotificationData
): string {
  return `
SEPEI UNIDO - Nuevo Anuncio

Hola ${recipient.nombre},

[${announcement.categoria.toUpperCase()}]

${announcement.titulo}
${'='.repeat(announcement.titulo.length)}

${announcement.descripcion}

Ver completo: ${announcement.url}

---
© ${new Date().getFullYear()} SEPEI UNIDO
  `;
}

/**
 * HTML para notificación de votación
 */
function generateVotingEmailHTML(
  recipient: EmailRecipient,
  voting: VotingNotificationData
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0;">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🗳️ SEPEI UNIDO</h1>
              <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">Nueva Votación</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
                Hola <strong>${recipient.nombre}</strong>,
              </p>

              <p style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 15px 0;">
                Se ha abierto una nueva votación en SEPEI UNIDO
              </p>

              <!-- Votación Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px;">${voting.titulo}</h2>
                <p style="color: #78350f; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0; white-space: pre-line;">${voting.descripcion}</p>
                <p style="color: #dc2626; font-size: 14px; margin: 0; font-weight: bold;">
                  ⏰ Cierra: ${new Date(voting.fecha_fin).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${voting.url}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Votar ahora
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0 0 0; border-radius: 4px;">
                <p style="color: #1e40af; margin: 0; font-size: 14px;">
                  💡 <strong>Recuerda:</strong> Tu voto es importante. Asegúrate de votar antes de que cierre la votación.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">
                Has recibido este email porque estás registrado en SEPEI UNIDO
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} SEPEI UNIDO
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Texto plano para votación
 */
function generateVotingEmailText(
  recipient: EmailRecipient,
  voting: VotingNotificationData
): string {
  return `
SEPEI UNIDO - Nueva Votación

Hola ${recipient.nombre},

Se ha abierto una nueva votación en SEPEI UNIDO

${voting.titulo}
${'='.repeat(voting.titulo.length)}

${voting.descripcion}

⏰ Cierra: ${new Date(voting.fecha_fin).toLocaleDateString('es-ES', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Vota aquí: ${voting.url}

💡 Tu voto es importante. Asegúrate de votar antes de que cierre.

---
© ${new Date().getFullYear()} SEPEI UNIDO
  `;
}
