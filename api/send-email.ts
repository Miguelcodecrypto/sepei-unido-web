import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, text } = req.body;

    // Validar datos
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enviar email
    const data = await resend.emails.send({
      from: 'SEPEI UNIDO <noreply@sepeiunido.org>', // Cambiar a tu dominio verificado
      to: [to],
      subject: subject,
      html: html,
      text: text,
    });

    console.log('✅ Email enviado:', data);
    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
