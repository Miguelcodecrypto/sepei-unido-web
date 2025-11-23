import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar que la API key esté configurada
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY no está configurada');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'RESEND_API_KEY is not configured'
      });
    }

    const resend = new Resend(apiKey);
    const { to, subject, html, text } = req.body;

    // Validar datos
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('📧 Intentando enviar email a:', to);

    // Enviar email
    const response = await resend.emails.send({
      from: 'SEPEI UNIDO <noreply@sepeiunido.org>',
      to: [to],
      subject: subject,
      html: html,
      text: text,
    });

    // Verificar si hay error en la respuesta
    if (response.error) {
      console.error('❌ Error de Resend API:', response.error);
      return res.status(500).json({ 
        error: 'Failed to send email',
        message: response.error.message || 'Resend API error',
        details: JSON.stringify(response.error)
      });
    }

    console.log('✅ Email enviado:', response.data);
    return res.status(200).json({ success: true, id: response.data?.id });

  } catch (error) {
    console.error('❌ Error completo:', JSON.stringify(error, null, 2));
    console.error('❌ Error al enviar email:', error);
    
    let errorMessage = 'Unknown error';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    console.error('❌ Mensaje de error:', errorMessage);
    console.error('❌ Detalles:', errorDetails);
    
    return res.status(500).json({ 
      error: 'Failed to send email',
      message: errorMessage,
      details: errorDetails
    });
  }
}
