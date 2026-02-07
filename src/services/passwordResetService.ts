import { generateTemporaryPassword, hashPassword } from './passwordService';
import { getUserByEmail, resetTempPassword } from './userDatabase';
import { sendPasswordResetEmail, sendPasswordResetNotificationToAdmin } from './emailService';

interface PasswordResetResult {
  success: boolean;
  message: string;
}

/**
 * Solicitar reseteo de contraseña por email
 * - Genera una contraseña temporal segura
 * - Actualiza la contraseña en Supabase
 * - Marca requires_password_change = true
 * - Envía email con la nueva contraseña temporal
 */
export async function requestPasswordResetByEmail(email: string): Promise<PasswordResetResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      success: false,
      message: 'Debes introducir un email válido',
    };
  }

  try {
    // Buscar usuario por email
    const user = await getUserByEmail(normalizedEmail);

    // Para no filtrar si el email existe o no, devolvemos siempre mensaje genérico
    if (!user) {
      return {
        success: true,
        message: 'Si el email está registrado, recibirás un correo con instrucciones para restablecer tu contraseña.',
      };
    }

    if (!user.verified) {
      return {
        success: false,
        message: 'Tu cuenta aún no está verificada. Revisa el email de verificación que te enviamos.',
      };
    }

    // Generar nueva contraseña temporal
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    if (!user.id) {
      console.error('❌ [RESET PASSWORD] Usuario encontrado sin ID');
      return {
        success: false,
        message: 'Error interno al procesar la solicitud. Inténtalo de nuevo más tarde.',
      };
    }

    // Actualizar en Supabase usando helper existente
    const resetOk = await resetTempPassword(user.id, tempPassword, hashedPassword);

    if (!resetOk) {
      return {
        success: false,
        message: 'No se pudo restablecer la contraseña. Inténtalo de nuevo más tarde.',
      };
    }

    // Enviar email con la nueva contraseña temporal
    const emailOk = await sendPasswordResetEmail({
      email: user.email,
      nombre: user.nombre,
      dni: user.dni || '',
      tempPassword,
    });

    if (!emailOk) {
      return {
        success: false,
        message: 'La contraseña se ha restablecido, pero hubo un error al enviar el email. Inténtalo de nuevo en unos minutos.',
      };
    }

    // Enviar notificación a admin de cambio de contraseña solicitado
    sendPasswordResetNotificationToAdmin({
      nombre: user.nombre,
      apellidos: user.apellidos,
      dni: user.dni || '',
      email: user.email,
    }).catch(error => {
      // No bloquear el flujo si falla la notificación
      console.error('Error al enviar notificación de cambio de contraseña a admin:', error);
    });

    return {
      success: true,
      message: 'Si el email está registrado, recibirás un correo con una nueva contraseña temporal.',
    };
  } catch (error) {
    console.error('❌ [RESET PASSWORD] Error al solicitar reseteo de contraseña:', error);
    return {
      success: false,
      message: 'Error al procesar la solicitud. Inténtalo de nuevo más tarde.',
    };
  }
}
