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

/**
 * Enviar email de verificación (SIMULADO - para desarrollo)
 * En producción, esto debe llamar a una API backend
 */
export async function sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
  try {
    // DESARROLLO: Simular envío
    console.log('📧 [EMAIL SERVICE] Enviando email de verificación...');
    console.log('Para:', data.email);
    console.log('Nombre:', data.nombre);
    console.log('DNI:', data.dni);
    console.log('Contraseña temporal:', data.tempPassword);
    console.log('Token:', data.verificationToken);

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: En producción, implementar llamada real a backend
    // Ejemplo con fetch:
    /*
    const response = await fetch('https://api.sepeiunido.org/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.email,
        subject: 'Verifica tu cuenta - SEPEI UNIDO',
        template: 'verification',
        data: {
          nombre: data.nombre,
          dni: data.dni,
          tempPassword: data.tempPassword,
          verificationLink: `https://www.sepeiunido.org/verify?token=${data.verificationToken}`,
        },
      }),
    });

    return response.ok;
    */

    return true; // Simulado exitoso

  } catch (error) {
    console.error('❌ [EMAIL SERVICE] Error al enviar email:', error);
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
