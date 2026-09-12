/**
 * Servicio de notificaciones por email para anuncios y votaciones
 * Permite enviar emails masivos a usuarios seleccionados
 */
import { documento, boton, tarjeta, enlaceDeRespaldo, COLOR, FUENTE } from '../../api/_lib/emailTheme';
import DOMPurify from 'dompurify';
import { getAdminToken } from './authService';

/**
 * Cabeceras de los envíos del panel. `/api/send-email` exige token de admin en todas
 * las peticiones (antes solo lo pedía cuando había adjuntos), así que sin sesión de
 * admin estas llamadas devuelven 401 en vez de enviarse.
 */
function cabecerasEnvio(): Record<string, string> {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface EmailRecipient {
  id: string;
  email: string;
  nombre: string;
  apellidos?: string;
}

export interface AnnouncementAttachmentFile {
  url: string;      // URL directa de Supabase Storage (no la del proxy view-file)
  filename: string;
}

export interface AnnouncementNotificationData {
  titulo: string;
  descripcion: string;
  esHtml?: boolean; // si true, `descripcion` es HTML (se sanitiza antes de insertarlo en el email)
  categoria: string;
  url: string;
  attachments?: AnnouncementAttachmentFile[]; // adjuntos reales del email, no solo enlaces
}

/** Texto plano a partir de HTML, para la versión text/plain del email y como fallback. */
function htmlToPlainText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/** HTML seguro para insertar en el cuerpo del email (permite solo formato básico). */
function sanitizeForEmail(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'blockquote', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/** Escapa texto plano (título, nombre, categoría...) antes de insertarlo en HTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
        headers: cabecerasEnvio(),
        body: JSON.stringify({
          to: recipient.email,
          subject: `📢 Nuevo anuncio: ${announcement.titulo}`,
          html,
          text,
          attachments: announcement.attachments?.map((a) => ({ path: a.url, filename: a.filename })),
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

    // Delay entre cada email para no chocar con el rate limit de Resend
    // (10 req/s por equipo; 150ms de margen es de sobra y hace el envío ~3x más rápido que antes)
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 150));
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
        headers: cabecerasEnvio(),
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
export function generateAnnouncementEmailHTML(
  recipient: EmailRecipient,
  announcement: AnnouncementNotificationData
): string {
  // El color de la píldora lo marca la categoría del anuncio, igual que en la web.
  const colorCategoria: Record<string, string> = {
    importante: COLOR.rojo,
    urgente: COLOR.naranja,
    evento: COLOR.verde,
    informacion: COLOR.azul,
  };
  const acento = colorCategoria[announcement.categoria] || COLOR.azul;

  const contenidoHtml = announcement.esHtml
    ? sanitizeForEmail(announcement.descripcion)
    : `<p style="margin: 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.65; color: ${COLOR.tintaSuave}; white-space: pre-line;">${escapeHtml(announcement.descripcion)}</p>`;

  const adjuntos = (announcement.attachments || [])
    .map(
      (a) => `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 10px 0;">
                <tr>
                  <td bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid ${COLOR.borde}; border-radius: 8px;">
                    <a href="${escapeHtml(a.url)}" style="display: inline-block; padding: 12px 20px; font-family: ${FUENTE}; font-size: 14px; font-weight: bold; color: ${COLOR.azul}; text-decoration: none;">
                      Descargar ${escapeHtml(a.filename)}
                    </a>
                  </td>
                </tr>
              </table>`
    )
    .join('');

  const contenido = `
              <p style="margin: 0 0 8px 0; font-family: ${FUENTE}; font-size: 22px; font-weight: bold; line-height: 1.3; color: ${COLOR.tinta};">
                ${escapeHtml(announcement.titulo)}
              </p>
              <p style="margin: 0 0 26px 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.6; color: ${COLOR.tintaSuave};">
                Hola <strong style="color: ${COLOR.tinta};">${escapeHtml(recipient.nombre)}</strong>, hay novedades en el tablón.
              </p>

              ${tarjeta(contenidoHtml, acento)}

              ${adjuntos ? `
              <p style="margin: 0 0 12px 0; font-family: ${FUENTE}; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLOR.tintaTenue};">Documentos adjuntos</p>
              ${adjuntos}
              <div style="height: 16px; line-height: 16px; font-size: 0;">&nbsp;</div>` : ''}

              ${boton(escapeHtml(announcement.url), 'Ver en la web', acento)}
              ${enlaceDeRespaldo(announcement.url)}`;

  return documento({
    preheader: `${announcement.titulo}`,
    etiqueta: announcement.categoria || 'Anuncio',
    tono: 'anuncio',
    contenido,
    motivo: 'Recibes este correo porque estás registrado en SEPEI UNIDO.',
  });
}

/**
 * Texto plano para anuncio
 */
function generateAnnouncementEmailText(
  recipient: EmailRecipient,
  announcement: AnnouncementNotificationData
): string {
  const contenidoTexto = announcement.esHtml ? htmlToPlainText(announcement.descripcion) : announcement.descripcion;
  const attachmentsTexto = (announcement.attachments || [])
    .map((a) => `📄 ${a.filename}: ${a.url}`)
    .join('\n');

  return `
SEPEI UNIDO - Nuevo Anuncio

Hola ${recipient.nombre},

[${announcement.categoria.toUpperCase()}]

${announcement.titulo}
${'='.repeat(announcement.titulo.length)}

${contenidoTexto}
${attachmentsTexto ? `\n${attachmentsTexto}\n` : ''}
📖 Ver en la web: ${announcement.url}

---
© ${new Date().getFullYear()} SEPEI UNIDO
  `;
}

/**
 * HTML para notificación de votación
 */
export function generateVotingEmailHTML(
  recipient: EmailRecipient,
  voting: VotingNotificationData
): string {
  const cierre = new Date(voting.fecha_fin).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const contenido = `
              <p style="margin: 0 0 8px 0; font-family: ${FUENTE}; font-size: 22px; font-weight: bold; line-height: 1.3; color: ${COLOR.tinta};">
                Se ha abierto una votación
              </p>
              <p style="margin: 0 0 26px 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.6; color: ${COLOR.tintaSuave};">
                Hola <strong style="color: ${COLOR.tinta};">${escapeHtml(recipient.nombre)}</strong>, tu voto cuenta en esta decisión del movimiento.
              </p>

              ${tarjeta(`
                    <p style="margin: 0 0 10px 0; font-family: ${FUENTE}; font-size: 18px; font-weight: bold; line-height: 1.35; color: ${COLOR.tinta};">${escapeHtml(voting.titulo)}</p>
                    <p style="margin: 0 0 16px 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.65; color: ${COLOR.tintaSuave}; white-space: pre-line;">${escapeHtml(voting.descripcion || '')}</p>
                    <p style="margin: 0; font-family: ${FUENTE}; font-size: 13px; font-weight: bold; color: ${COLOR.rojo};">
                      Cierra el ${cierre}
                    </p>`)}

              ${boton(voting.url, 'Votar ahora', COLOR.rojo)}
              ${enlaceDeRespaldo(voting.url)}

              <p style="margin: 26px 0 0 0; font-family: ${FUENTE}; font-size: 13px; line-height: 1.6; color: ${COLOR.tintaTenue}; text-align: center;">
                El voto es secreto: se guarda quién ha participado, pero no qué ha votado.
              </p>`;

  return documento({
    preheader: `${voting.titulo} · vota antes del ${cierre}`,
    etiqueta: 'Nueva votación',
    tono: 'votacion',
    contenido,
    motivo: 'Recibes este correo porque estás registrado en SEPEI UNIDO.',
  });
}

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
        headers: cabecerasEnvio(),
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
export function generateVotingResultsEmailHTML(
  recipient: EmailRecipient,
  results: VotingResultsNotificationData
): string {
  const ganador = results.resultados[0];

  // Las barras van en tablas, no en divs con flex ni gradientes: Outlook ignora
  // `display: flex` y no pinta `linear-gradient`, así que con divs las barras
  // llegaban desmontadas o directamente invisibles.
  const barras = results.resultados
    .map((resultado, index) => {
      const pct = Math.round(resultado.porcentaje * 10) / 10;
      const relleno = Math.max(0, Math.min(100, pct));
      const color = index === 0 ? COLOR.verde : COLOR.azul;

      return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 18px 0;">
                <tr>
                  <td style="font-family: ${FUENTE}; font-size: 15px; font-weight: bold; color: ${COLOR.tinta}; padding: 0 0 6px 0;">
                    ${index + 1}. ${escapeHtml(resultado.opcion)}
                  </td>
                  <td align="right" style="font-family: ${FUENTE}; font-size: 15px; font-weight: bold; color: ${color}; padding: 0 0 6px 0; white-space: nowrap;">
                    ${pct.toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#e2e8f0" style="background-color: #e2e8f0; border-radius: 5px;">
                      <tr>
                        ${relleno > 0 ? `<td bgcolor="${color}" width="${relleno}%" style="background-color: ${color}; border-radius: 5px; font-size: 0; line-height: 0; height: 10px;">&nbsp;</td>` : ''}
                        ${relleno < 100 ? `<td width="${100 - relleno}%" style="font-size: 0; line-height: 0; height: 10px;">&nbsp;</td>` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="font-family: ${FUENTE}; font-size: 13px; color: ${COLOR.tintaTenue}; padding: 5px 0 0 0;">
                    ${resultado.votos} ${resultado.votos === 1 ? 'voto' : 'votos'}
                  </td>
                </tr>
              </table>`;
    })
    .join('');

  const contenido = `
              <p style="margin: 0 0 8px 0; font-family: ${FUENTE}; font-size: 22px; font-weight: bold; line-height: 1.3; color: ${COLOR.tinta};">
                ${escapeHtml(results.titulo)}
              </p>
              <p style="margin: 0 0 26px 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.6; color: ${COLOR.tintaSuave};">
                Hola <strong style="color: ${COLOR.tinta};">${escapeHtml(recipient.nombre)}</strong>, la votación ha terminado. Estos son los resultados, con
                <strong style="color: ${COLOR.tinta};">${results.total_votos} ${results.total_votos === 1 ? 'participante' : 'participantes'}</strong>.
              </p>

              ${ganador ? tarjeta(`
                    <p style="margin: 0 0 6px 0; font-family: ${FUENTE}; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: ${COLOR.verde};">Opción más votada</p>
                    <p style="margin: 0 0 4px 0; font-family: ${FUENTE}; font-size: 19px; font-weight: bold; color: ${COLOR.tinta};">${escapeHtml(ganador.opcion)}</p>
                    <p style="margin: 0; font-family: ${FUENTE}; font-size: 14px; color: ${COLOR.tintaSuave};">${ganador.votos} ${ganador.votos === 1 ? 'voto' : 'votos'} · ${ganador.porcentaje.toFixed(1)}%</p>`, COLOR.verde) : ''}

              <p style="margin: 0 0 16px 0; font-family: ${FUENTE}; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLOR.tintaTenue};">
                Todos los resultados
              </p>
              ${barras}

              <div style="height: 10px; line-height: 10px; font-size: 0;">&nbsp;</div>
              ${boton(results.url, 'Ver en la web', COLOR.verde)}
              ${enlaceDeRespaldo(results.url)}`;

  return documento({
    preheader: `Resultados de ${results.titulo} · ${results.total_votos} ${results.total_votos === 1 ? 'participante' : 'participantes'}`,
    etiqueta: `Resultados`,
    tono: 'resultados',
    contenido,
    motivo: 'Recibes este correo porque estás registrado en SEPEI UNIDO.',
  });
}

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
