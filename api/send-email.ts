import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  console.log('🔷 === INICIO DEL HANDLER ===');
  console.log('🔷 Method:', req.method);
  console.log('🔷 Headers:', JSON.stringify(req.headers, null, 2));
  
  // Solo permitir POST
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔷 Body recibido:', JSON.stringify(req.body, null, 2));
    
    // Verificar que la API key esté configurada
    const apiKey = process.env.RESEND_API_KEY;
    console.log('🔷 API Key presente:', !!apiKey);
    console.log('🔷 API Key longitud:', apiKey?.length || 0);
    console.log('🔷 API Key primeros 10 caracteres:', apiKey?.substring(0, 10));
    
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY no está configurada');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'RESEND_API_KEY is not configured'
      });
    }

    console.log('🔷 Inicializando Resend...');
    const resend = new Resend(apiKey);
    console.log('🔷 Resend inicializado correctamente');
    
    const { to, subject, html, text } = req.body;
    console.log('🔷 Datos extraídos del body:');
    console.log('  - to:', to);
    console.log('  - subject:', subject);
    console.log('  - html length:', html?.length || 0);
    console.log('  - text length:', text?.length || 0);

    console.log('🔷 Datos extraídos del body:');
    console.log('  - to:', to);
    console.log('  - subject:', subject);
    console.log('  - html length:', html?.length || 0);
    console.log('  - text length:', text?.length || 0);

    // Validar datos
    if (!to || !subject || (!html && !text)) {
      console.log('❌ Faltan campos requeridos:', { to: !!to, subject: !!subject, html: !!html, text: !!text });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('📧 Intentando enviar email a:', to);
    console.log('🔷 Preparando objeto para resend.emails.send...');
    
    const emailPayload = {
      from: 'SEPEI UNIDO <noreply@sepeiunido.org>',
      to: [to],
      subject: subject,
      html: html,
      text: text,
    };
    console.log('🔷 Email payload:', JSON.stringify({
      ...emailPayload,
      html: html?.substring(0, 100) + '...',
      text: text?.substring(0, 100) + '...'
    }, null, 2));

    console.log('🔷 Llamando a resend.emails.send()...');
    const response = await resend.emails.send(emailPayload);
    console.log('🔷 Respuesta de Resend recibida:', JSON.stringify(response, null, 2));

    console.log('🔷 Llamando a resend.emails.send()...');
    const response = await resend.emails.send(emailPayload);
    console.log('🔷 Respuesta de Resend recibida:', JSON.stringify(response, null, 2));

    // Verificar si hay error en la respuesta
    if (response.error) {
      console.error('❌ Error de Resend API:', JSON.stringify(response.error, null, 2));
      console.error('❌ Error name:', response.error.name);
      console.error('❌ Error message:', response.error.message);
      return res.status(500).json({ 
        error: 'Failed to send email',
        message: response.error.message || 'Resend API error',
        details: JSON.stringify(response.error),
        errorName: response.error.name
      });
    }

    console.log('✅ Email enviado exitosamente');
    console.log('✅ ID del email:', response.data?.id);
    return res.status(200).json({ success: true, id: response.data?.id });

  } catch (error) {
    console.error('💥 === EXCEPCIÓN CAPTURADA ===');
    console.error('💥 Tipo de error:', typeof error);
    console.error('💥 Error es instancia de Error:', error instanceof Error);
    console.error('💥 Error completo (stringify):', JSON.stringify(error, null, 2));
    console.error('💥 Error directo:', error);
    
    let errorMessage = 'Unknown error';
    let errorDetails = '';
    let errorStack = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      errorStack = error.stack || '';
      console.error('💥 Error.name:', error.name);
      console.error('💥 Error.message:', error.message);
      console.error('💥 Error.stack:', error.stack);
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
      console.error('💥 Error como objeto:', error);
      console.error('💥 Keys del error:', Object.keys(error));
      console.error('💥 Values del error:', Object.values(error));
    }
    
    console.error('💥 Mensaje final de error:', errorMessage);
    console.error('💥 Detalles finales:', errorDetails);
    console.error('💥 === FIN DE EXCEPCIÓN ===');
    
    return res.status(500).json({ 
      error: 'Failed to send email',
      message: errorMessage,
      details: errorDetails,
      stack: errorStack,
      type: typeof error,
      isError: error instanceof Error
    });
  }
}
