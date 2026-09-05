export interface EmailAttachment {
  /** URL pública del archivo (p.ej. Supabase Storage) — Resend lo descarga él mismo, no hace falta base64. */
  path: string;
  filename: string;
}

/**
 * Envío de email vía Resend, llamado directamente desde código server-side
 * (nunca por HTTP interno basado en el header Host, que es controlable por el cliente).
 */
export async function sendEmailViaResend(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY no está configurada');
    return false;
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: 'SEPEI UNIDO <noreply@sepeiunido.org>',
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments,
    });

    if (result.error) {
      console.error('Error de Resend:', result.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error en sendEmailViaResend:', error);
    return false;
  }
}
