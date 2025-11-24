/**
 * Servicio de envío de emails
 * En producción, esto debe conectarse a un backend real (Resend, SendGrid, etc.)
 */

export interface EmailVerificationData {
  email: string;
  nombre: string;
  tempPassword: string;
  verificationToken: string;
  dni: string;
}

export interface SuggestionEmailData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  categoria: string;
  lugarTrabajo: string;
  asunto: string;
  descripcion: string;
}

/**
 * Enviar email de verificación
 */
export async function sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
  try {
    console.log('📧 [EMAIL SERVICE] === INICIO ENVÍO EMAIL ===');
    console.log('📧 [EMAIL SERVICE] Datos recibidos:', {
      email: data.email,
      nombre: data.nombre,
      dni: data.dni,
      tokenLength: data.verificationToken?.length || 0
    });
    
    // MODO DESARROLLO: Simular envío exitoso y mostrar datos en consola
    if (import.meta.env.DEV) {
      console.log('🔧 [DESARROLLO] Modo desarrollo detectado - Simulando envío de email');
      console.log('📧 ========================================');
      console.log('📧 EMAIL DE VERIFICACIÓN (SIMULADO)');
      console.log('📧 ========================================');
      console.log('📧 Para:', data.email);
      console.log('📧 Nombre:', data.nombre);
      console.log('📧 DNI:', data.dni);
      console.log('📧 Contraseña temporal:', data.tempPassword);
      console.log('📧 Token:', data.verificationToken);
      console.log('📧 ========================================');
      console.log('📧 LINK DE VERIFICACIÓN:');
      console.log(`📧 http://localhost:5176/verify?token=${data.verificationToken}`);
      console.log('📧 ========================================');
      console.log('🔧 Copia el link de arriba y pégalo en el navegador para verificar tu cuenta');
      
      // Simular éxito
      return true;
    }
    
    const html = generateVerificationEmailHTML(data);
    const text = generateVerificationEmailText(data);
    
    console.log('📧 [EMAIL SERVICE] HTML generado, longitud:', html.length);
    console.log('📧 [EMAIL SERVICE] Text generado, longitud:', text.length);

    const payload = {
      to: data.email,
      subject: 'Verifica tu cuenta - SEPEI UNIDO',
      html: html,
      text: text,
    };
    
    console.log('📧 [EMAIL SERVICE] Payload preparado:', {
      to: payload.to,
      subject: payload.subject,
      htmlLength: payload.html.length,
      textLength: payload.text.length
    });
    
    console.log('📧 [EMAIL SERVICE] Llamando a /api/send-email...');

    // Llamar a la API serverless de Vercel
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('📧 [EMAIL SERVICE] Respuesta recibida, status:', response.status, response.statusText);
    console.log('📧 [EMAIL SERVICE] Response ok:', response.ok);

    console.log('📧 [EMAIL SERVICE] Respuesta recibida, status:', response.status, response.statusText);
    console.log('📧 [EMAIL SERVICE] Response ok:', response.ok);

    if (!response.ok) {
      console.log('📧 [EMAIL SERVICE] Respuesta no OK, intentando parsear error...');
      const contentType = response.headers.get('content-type');
      console.log('📧 [EMAIL SERVICE] Content-Type:', contentType);
      
      let error;
      try {
        const text = await response.text();
        console.log('📧 [EMAIL SERVICE] Respuesta como texto:', text);
        error = JSON.parse(text);
        console.log('📧 [EMAIL SERVICE] Error parseado:', error);
      } catch (parseError) {
        console.error('📧 [EMAIL SERVICE] Error al parsear respuesta:', parseError);
        error = { message: 'Unknown error' };
      }
      
      console.error('❌ [EMAIL SERVICE] Error al enviar email:', error);
      console.error('❌ Status:', response.status, response.statusText);
      
      // En desarrollo, mostrar en consola
      if (import.meta.env.DEV) {
        console.log('📧 [DESARROLLO] Email que se habría enviado:');
        console.log('Para:', data.email);
        console.log('DNI:', data.dni);
        console.log('Contraseña temporal:', data.tempPassword);
        console.log('Token:', data.verificationToken);
        console.log('⚠️ La API de email falló, pero en desarrollo continuamos');
        return true; // Simular éxito en desarrollo
      }
      
      return false;
    }

    const result = await response.json();
    console.log('✅ [EMAIL SERVICE] Email enviado correctamente, resultado:', result);
    return true;

  } catch (error) {
    console.error('💥 [EMAIL SERVICE] === EXCEPCIÓN CAPTURADA ===');
    console.error('💥 [EMAIL SERVICE] Tipo:', typeof error);
    console.error('💥 [EMAIL SERVICE] Error:', error);
    console.error('💥 [EMAIL SERVICE] Is Error:', error instanceof Error);
    if (error instanceof Error) {
      console.error('💥 [EMAIL SERVICE] Message:', error.message);
      console.error('💥 [EMAIL SERVICE] Stack:', error.stack);
    }
    return false;
  }
}

/**
 * Generar HTML del email de verificación
 */
export function generateVerificationEmailHTML(data: EmailVerificationData): string {
  const verificationLink = `https://www.sepeiunido.org/verify?token=${data.verificationToken}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu cuenta - SEPEI UNIDO</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SEPEI UNIDO</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Bienvenido al movimiento</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">¡Hola ${data.nombre}!</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Gracias por registrarte en <strong>SEPEI UNIDO</strong>. Para completar tu registro, necesitamos verificar tu cuenta.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #1f2937; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">
                  TUS CREDENCIALES
                </p>
                <table width="100%" cellpadding="5" cellspacing="0">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;">Usuario (DNI):</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.dni}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;">Contraseña temporal:</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: bold; text-align: right; font-family: monospace;">${data.tempPassword}</td>
                  </tr>
                </table>
                <p style="color: #dc2626; margin: 15px 0 0 0; font-size: 12px;">
                  ⚠️ <strong>Importante:</strong> Cambia tu contraseña después del primer inicio de sesión.
                </p>
              </div>

              <!-- Verification Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Verificar mi cuenta
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                O copia y pega este enlace en tu navegador:
              </p>
              <p style="color: #3b82f6; font-size: 12px; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0;">
                ${verificationLink}
              </p>

              <!-- Warning Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0 0 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 13px;">
                  ⏱️ Este enlace expira en <strong>24 horas</strong>. Si no verificas tu cuenta en este tiempo, deberás registrarte nuevamente.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">
                Si no solicitaste este registro, puedes ignorar este email.
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
 * Generar texto plano del email (fallback)
 */
export function generateVerificationEmailText(data: EmailVerificationData): string {
  const verificationLink = `https://www.sepeiunido.org/verify?token=${data.verificationToken}`;

  return `
SEPEI UNIDO - Verifica tu cuenta

¡Hola ${data.nombre}!

Gracias por registrarte en SEPEI UNIDO. Para completar tu registro, necesitamos verificar tu cuenta.

TUS CREDENCIALES:
------------------
Usuario (DNI): ${data.dni}
Contraseña temporal: ${data.tempPassword}

⚠️ IMPORTANTE: Cambia tu contraseña después del primer inicio de sesión.

VERIFICAR CUENTA:
Para verificar tu cuenta, haz clic en el siguiente enlace:
${verificationLink}

⏱️ Este enlace expira en 24 horas.

Si no puedes hacer clic en el enlace, copia y pega la URL completa en tu navegador.

---

Si no solicitaste este registro, puedes ignorar este email.

© ${new Date().getFullYear()} SEPEI UNIDO
www.sepeiunido.org
  `;
}

/**
 * Enviar email de confirmación de propuesta al usuario
 */
export async function sendSuggestionConfirmationEmail(data: SuggestionEmailData): Promise<boolean> {
  try {
    console.log('📧 [EMAIL] Enviando confirmación de propuesta a:', data.email);
    
    if (import.meta.env.DEV) {
      console.log('🔧 [DESARROLLO] Simulando envío de confirmación de propuesta');
      console.log('📧 Para:', data.email);
      console.log('📧 Asunto:', data.asunto);
      return true;
    }

    const html = generateSuggestionConfirmationHTML(data);
    const text = generateSuggestionConfirmationText(data);

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.email,
        subject: 'Propuesta recibida - SEPEI UNIDO',
        html,
        text,
      }),
    });

    if (!response.ok) {
      console.error('Error al enviar email de confirmación:', response.statusText);
      return false;
    }

    console.log('✅ Email de confirmación enviado');
    return true;
  } catch (error) {
    console.error('Error al enviar email de confirmación:', error);
    return false;
  }
}

/**
 * Enviar notificación de nueva propuesta a admin
 */
export async function sendSuggestionNotificationEmail(data: SuggestionEmailData): Promise<boolean> {
  try {
    console.log('📧 [EMAIL] Enviando notificación de nueva propuesta a admin');
    
    if (import.meta.env.DEV) {
      console.log('🔧 [DESARROLLO] Simulando envío de notificación a admin');
      console.log('📧 Propuesta de:', data.nombre, data.apellidos);
      console.log('📧 Asunto:', data.asunto);
      return true;
    }

    const html = generateSuggestionNotificationHTML(data);
    const text = generateSuggestionNotificationText(data);

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'sepeiunido@gmail.com',
        subject: `Nueva propuesta: ${data.asunto}`,
        html,
        text,
      }),
    });

    if (!response.ok) {
      console.error('Error al enviar notificación a admin:', response.statusText);
      return false;
    }

    console.log('✅ Notificación enviada a admin');
    return true;
  } catch (error) {
    console.error('Error al enviar notificación a admin:', error);
    return false;
  }
}

/**
 * HTML para confirmación de propuesta al usuario
 */
function generateSuggestionConfirmationHTML(data: SuggestionEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                💡 SEPEI UNIDO
              </h1>
              <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 14px;">
                Movimiento de Bomberos de Castilla-La Mancha
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #16a34a; margin: 0 0 20px 0; font-size: 24px;">
                ✅ Propuesta Recibida
              </h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hola <strong>${data.nombre} ${data.apellidos}</strong>,
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Hemos recibido tu propuesta correctamente. Nuestro equipo la revisará y nos pondremos en contacto contigo pronto.
              </p>

              <!-- Propuesta Details -->
              <div style="background-color: #f9fafb; border-left: 4px solid #f59e0b; padding: 20px; margin: 0 0 30px 0; border-radius: 4px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">
                  📋 Resumen de tu propuesta:
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Asunto:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${data.asunto}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Categoría:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0; text-transform: capitalize;">${data.categoria}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Lugar:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${data.lugarTrabajo}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 0; border-radius: 4px;">
                <p style="color: #1e40af; margin: 0; font-size: 14px;">
                  💬 Nos pondremos en contacto contigo a través de tu email <strong>${data.email}</strong> o por teléfono al <strong>${data.telefono}</strong>.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
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
 * Texto plano para confirmación de propuesta
 */
function generateSuggestionConfirmationText(data: SuggestionEmailData): string {
  return `
SEPEI UNIDO - Propuesta Recibida

Hola ${data.nombre} ${data.apellidos},

Hemos recibido tu propuesta correctamente. Nuestro equipo la revisará y nos pondremos en contacto contigo pronto.

RESUMEN DE TU PROPUESTA:
------------------------
Asunto: ${data.asunto}
Categoría: ${data.categoria}
Lugar de trabajo: ${data.lugarTrabajo}

CONTACTO:
---------
Email: ${data.email}
Teléfono: ${data.telefono}

Gracias por tu participación en SEPEI UNIDO.

© ${new Date().getFullYear()} SEPEI UNIDO
www.sepeiunido.org
  `;
}

/**
 * HTML para notificación a admin de nueva propuesta
 */
function generateSuggestionNotificationHTML(data: SuggestionEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🔔 Nueva Propuesta
              </h1>
              <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 14px;">
                Panel de Administración - SEPEI UNIDO
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Se ha recibido una nueva propuesta a través de la plataforma SEPEI UNIDO.
              </p>

              <!-- Usuario Info -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 0 0 20px 0; border-radius: 4px;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">
                  👤 Datos del usuario:
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Nombre:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${data.nombre} ${data.apellidos}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Email:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;"><a href="mailto:${data.email}" style="color: #3b82f6;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Teléfono:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${data.telefono}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Categoría:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0; text-transform: capitalize;">${data.categoria}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Lugar:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${data.lugarTrabajo}</td>
                  </tr>
                </table>
              </div>

              <!-- Propuesta Info -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 0 0 20px 0; border-radius: 4px;">
                <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px;">
                  💡 Propuesta:
                </h3>
                <p style="color: #78350f; margin: 0 0 10px 0; font-size: 14px;">
                  <strong>Asunto:</strong> ${data.asunto}
                </p>
                <p style="color: #78350f; margin: 0; font-size: 14px;">
                  <strong>Descripción:</strong><br>
                  ${data.descripcion}
                </p>
              </div>

              <!-- Action Box -->
              <table role="presentation" style="width: 100%; margin: 30px 0 0 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.sepeiunido.org" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Ver en Panel de Administración
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} SEPEI UNIDO - Panel de Administración
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
 * Texto plano para notificación a admin
 */
function generateSuggestionNotificationText(data: SuggestionEmailData): string {
  return `
SEPEI UNIDO - Nueva Propuesta Recibida

DATOS DEL USUARIO:
------------------
Nombre: ${data.nombre} ${data.apellidos}
Email: ${data.email}
Teléfono: ${data.telefono}
Categoría: ${data.categoria}
Lugar de trabajo: ${data.lugarTrabajo}

PROPUESTA:
----------
Asunto: ${data.asunto}

Descripción:
${data.descripcion}

---

Accede al panel de administración para ver más detalles:
https://www.sepeiunido.org

© ${new Date().getFullYear()} SEPEI UNIDO
  `;
}

