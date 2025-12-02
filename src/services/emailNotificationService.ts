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

export interface VotingResultsNotificationData {
  titulo: string;
  descripcion: string;
  tipo: string;
  total_votos: number;
  resultados: Array<{
    opcion: string;
    votos: number;
    porcentaje: number;
  }>;
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

  // Enviar secuencialmente con delay para respetar rate limit de Resend (2 emails/segundo)
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    try {
      const html = generateAnnouncementEmailHTML(recipient, announcement);
      const text = generateAnnouncementEmailText(recipient, announcement);

      // En desarrollo, simular envío
      if (import.meta.env?.DEV) {
        console.log(`📧 [DEV] Email simulado para: ${recipient.email}`);
        success++;
        continue;
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error al enviar email a ${recipient.nombre} (${recipient.email}):`, response.status, errorText);
        failed++;
      } else {
        console.log(`✅ Email enviado exitosamente a ${recipient.nombre} (${recipient.email})`);
        success++;
      }
    } catch (error) {
      console.error(`❌ Excepción enviando a ${recipient.nombre} (${recipient.email}):`, error);
      failed++;
    }

    // Delay de 500ms entre cada email (2 emails/segundo = rate limit de Resend)
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
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

  // Enviar secuencialmente con delay para respetar rate limit de Resend (2 emails/segundo)
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    try {
      const html = generateVotingEmailHTML(recipient, voting);
      const text = generateVotingEmailText(recipient, voting);

      if (import.meta.env?.DEV) {
        console.log(`📧 [DEV] Email simulado para: ${recipient.email}`);
        success++;
        continue;
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error al enviar email a ${recipient.nombre} (${recipient.email}):`, response.status, errorText);
        failed++;
      } else {
        console.log(`✅ Email enviado exitosamente a ${recipient.nombre} (${recipient.email})`);
        success++;
      }
    } catch (error) {
      console.error(`❌ Excepción enviando a ${recipient.nombre} (${recipient.email}):`, error);
      failed++;
    }

    // Delay de 500ms entre cada email (2 emails/segundo = rate limit de Resend)
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
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

/**
 * Enviar notificación de resultados de votación
 */
export async function sendVotingResultsNotification(
  recipients: EmailRecipient[],
  results: VotingResultsNotificationData
): Promise<{ success: number; failed: number }> {
  console.log(`📊 [NOTIFICACIONES] Enviando resultados de votación a ${recipients.length} usuarios`);
  
  let success = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    try {
      const html = generateVotingResultsEmailHTML(recipient, results);
      const text = generateVotingResultsEmailText(recipient, results);

      if (import.meta.env?.DEV) {
        console.log(`📊 [DEV] Email de resultados simulado para: ${recipient.email}`);
        success++;
        continue;
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient.email,
          subject: `📊 Resultados: ${results.titulo}`,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error al enviar resultados a ${recipient.nombre} (${recipient.email}):`, response.status, errorText);
        failed++;
      } else {
        console.log(`✅ Resultados enviados exitosamente a ${recipient.nombre} (${recipient.email})`);
        success++;
      }
    } catch (error) {
      console.error(`❌ Excepción enviando resultados a ${recipient.nombre} (${recipient.email}):`, error);
      failed++;
    }

    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`✅ Envío de resultados completado: ${success} éxitos, ${failed} fallos`);
  return { success, failed };
}

/**
 * HTML para notificación de resultados
 */
function generateVotingResultsEmailHTML(
  recipient: EmailRecipient,
  results: VotingResultsNotificationData
): string {
  const ganador = results.resultados[0];
  
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
          
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📊 SEPEI UNIDO</h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Resultados de ${results.tipo}</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
                ${results.titulo}
              </h2>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Hola ${recipient.nombre},
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                La votación ha finalizado. Aquí están los resultados oficiales:
              </p>

              ${results.descripcion ? `
              <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 15px; margin: 0 0 30px 0; border-radius: 4px;">
                <p style="color: #374151; margin: 0; font-size: 14px;">
                  ${results.descripcion}
                </p>
              </div>
              ` : ''}

              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 0 0 20px 0; border-radius: 4px;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">
                  🏆 Opción ganadora
                </h3>
                <p style="color: #15803d; font-size: 20px; font-weight: bold; margin: 0;">
                  ${ganador.opcion}
                </p>
                <p style="color: #16a34a; font-size: 16px; margin: 10px 0 0 0;">
                  ${ganador.votos} votos (${ganador.porcentaje.toFixed(1)}%)
                </p>
              </div>

              <div style="margin: 0 0 30px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
                  📊 Todos los resultados
                </h3>
                ${results.resultados.map((resultado, index) => `
                  <div style="margin: 0 0 15px 0; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                    <div style="padding: 15px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="color: #1f2937; font-weight: bold; font-size: 16px;">${index + 1}. ${resultado.opcion}</span>
                        <span style="color: #3b82f6; font-weight: bold; font-size: 16px;">${resultado.porcentaje.toFixed(1)}%</span>
                      </div>
                      <div style="background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%); height: 100%; width: ${resultado.porcentaje}%; transition: width 0.3s;"></div>
                      </div>
                      <span style="color: #6b7280; font-size: 14px;">${resultado.votos} votos</span>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 0 0 20px 0; border-radius: 4px;">
                <p style="color: #1e40af; margin: 0; font-size: 14px;">
                  📈 Total de participantes: <strong>${results.total_votos}</strong>
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 0 0;">
                <tr>
                  <td align="center">
                    <a href="${results.url}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Ver detalles completos
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">
                Gracias por tu participación en SEPEI UNIDO
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} SEPEI UNIDO. Todos los derechos reservados.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                <a href="https://www.sepeiunido.org" style="color: #3b82f6; text-decoration: none;">www.sepeiunido.org</a>
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
 * Texto plano para notificación de resultados
 */
function generateVotingResultsEmailText(
  recipient: EmailRecipient,
  results: VotingResultsNotificationData
): string {
  return `
SEPEI UNIDO - Resultados de ${results.tipo}

${results.titulo}
${'='.repeat(results.titulo.length)}

Hola ${recipient.nombre},

La votación ha finalizado. Aquí están los resultados oficiales:

${results.descripcion ? results.descripcion + '\n\n' : ''}

🏆 OPCIÓN GANADORA:
${results.resultados[0].opcion} - ${results.resultados[0].votos} votos (${results.resultados[0].porcentaje.toFixed(1)}%)

📊 TODOS LOS RESULTADOS:
${results.resultados.map((r, i) => 
  `${i + 1}. ${r.opcion}: ${r.votos} votos (${r.porcentaje.toFixed(1)}%)`
).join('\n')}

📈 Total de participantes: ${results.total_votos}

Ver detalles completos: ${results.url}

---
© ${new Date().getFullYear()} SEPEI UNIDO
www.sepeiunido.org
  `;
}
