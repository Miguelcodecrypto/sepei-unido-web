/**
 * Envío de correo para el panel de administración (avisos de anuncios, votaciones y
 * resultados a las listas de destinatarios).
 *
 * Exige token de admin SIEMPRE. Antes solo se pedía cuando la petición traía
 * `attachments`, así que un envío simple no requería nada: cualquiera podía POSTear
 * aquí y escribir a cualquier dirección desde noreply@sepeiunido.org — suplantando al
 * movimiento ante sus propios compañeros y quemando la reputación del dominio en
 * Resend. Los correos que nacen de un flujo público (confirmación de una propuesta,
 * aviso de alta de un usuario) ya no pasan por aquí: los manda el servidor desde
 * `api/suggestions.ts` y `api/auth.ts`, que son quienes conocen al destinatario.
 */
import { sendEmailViaResend, type EmailAttachment } from './_lib/resend.js';
import { verifyAdminToken, getBearerToken } from './_lib/adminAuth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyAdminToken(getBearerToken(req))) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { to, subject, html, text, attachments } = req.body || {};
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let validatedAttachments: EmailAttachment[] | undefined;
  if (attachments != null) {
    if (!Array.isArray(attachments) || attachments.some((a: any) => typeof a?.path !== 'string' || typeof a?.filename !== 'string')) {
      return res.status(400).json({ error: 'Formato de adjuntos inválido' });
    }
    validatedAttachments = attachments;
  }

  const sent = await sendEmailViaResend({ to, subject, html, text, attachments: validatedAttachments });

  if (!sent) {
    return res.status(500).json({ error: 'Failed to send email' });
  }

  return res.status(200).json({ success: true });
}
