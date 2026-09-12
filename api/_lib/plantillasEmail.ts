/**
 * Plantillas de los emails que dispara un flujo PÚBLICO (envío de una propuesta y
 * alta de un usuario nuevo). Viven en el servidor a propósito: antes las componía
 * el navegador y las mandaba a `/api/send-email` con destinatario y HTML libres,
 * de modo que ese endpoint tenía que aceptar envíos sin autenticar — un open relay
 * con el que cualquiera podía escribir a quien quisiera desde noreply@sepeiunido.org.
 *
 * ⚠️ Los botones llevan el color en `bgcolor` del <td> y repetido en
 * `background-color`, nunca solo en un `linear-gradient`: Yahoo Mail y Outlook de
 * escritorio no lo pintan y el botón se queda blanco sobre blanco, invisible.
 * Ahora el cliente solo pide la acción (crear propuesta, registrarse) y es el
 * servidor quien decide a quién escribe y con qué contenido.
 */

/** Buzón que recibe los avisos internos del movimiento. */
export const EMAIL_ADMIN = 'sepeiunido@gmail.com';

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

export interface NewUserNotificationData {
  nombre: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  parque_sepei: string;
}

/**
 * HTML para confirmación de propuesta al usuario
 */
export function generateSuggestionConfirmationHTML(data: SuggestionEmailData): string {
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

/**
 * Texto plano para confirmación de propuesta
 */
export function generateSuggestionConfirmationText(data: SuggestionEmailData): string {
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

/**
 * HTML para notificación a admin de nueva propuesta
 */
export function generateSuggestionNotificationHTML(data: SuggestionEmailData): string {
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
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#dc2626" style="border-radius: 6px; background-color: #dc2626; background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);">
                          <a href="https://www.sepeiunido.org" style="display: inline-block; padding: 15px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">
                            Ver en Panel de Administración
                          </a>
                        </td>
                      </tr>
                    </table>
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

/**
 * Texto plano para notificación a admin
 */
export function generateSuggestionNotificationText(data: SuggestionEmailData): string {
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

// ============================================
// NOTIFICACIONES A ADMIN (sepeiunido@gmail.com)
// ============================================

/**
 * HTML para notificación de nuevo usuario
 */
export function generateNewUserNotificationHTML(data: NewUserNotificationData): string {
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
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🆕 Nuevo Usuario Registrado
              </h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 14px;">
                Panel de Administración - SEPEI UNIDO
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Se ha registrado un nuevo usuario en la plataforma SEPEI UNIDO.
              </p>

              <!-- Usuario Info -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 0 0 20px 0; border-radius: 4px;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">
                  👤 Datos del nuevo usuario:
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Nombre:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${data.nombre} ${data.apellidos}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>DNI:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${data.dni}</td>
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
                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Parque SEPEI:</strong></td>
                    <td style="color: #1f2937; font-size: 14px; padding: 5px 0;">${data.parque_sepei}</td>
                  </tr>
                </table>
              </div>

              <!-- Action Box -->
              <table role="presentation" style="width: 100%; margin: 30px 0 0 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#059669" style="border-radius: 6px; background-color: #059669; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                          <a href="https://www.sepeiunido.org" style="display: inline-block; padding: 15px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">
                            Ver en Panel de Administración
                          </a>
                        </td>
                      </tr>
                    </table>
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
 * Texto plano para notificación de nuevo usuario
 */

/**
 * Texto plano para notificación de nuevo usuario
 */
export function generateNewUserNotificationText(data: NewUserNotificationData): string {
  return `
SEPEI UNIDO - Nuevo Usuario Registrado

DATOS DEL NUEVO USUARIO:
------------------------
Nombre: ${data.nombre} ${data.apellidos}
DNI: ${data.dni}
Email: ${data.email}
Teléfono: ${data.telefono}
Parque SEPEI: ${data.parque_sepei}

---

Accede al panel de administración para ver más detalles:
https://www.sepeiunido.org

© ${new Date().getFullYear()} SEPEI UNIDO
  `;
}
