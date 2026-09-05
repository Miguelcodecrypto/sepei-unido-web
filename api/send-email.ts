import { sendEmailViaResend, type EmailAttachment } from './_lib/resend.js';
import { verifyAdminToken, getBearerToken } from './_lib/adminAuth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, text, attachments } = req.body || {};
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let validatedAttachments: EmailAttachment[] | undefined;
  if (attachments != null) {
    // Los adjuntos solo pueden pedirlos el panel admin: sin esto, cualquiera
    // podría hacer que nuestra cuenta de Resend descargue y reenvíe un archivo
    // arbitrario (path) a cualquier destinatario, suplantando noreply@sepeiunido.org.
    if (!verifyAdminToken(getBearerToken(req))) {
      return res.status(401).json({ error: 'No autorizado para enviar adjuntos' });
    }
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
