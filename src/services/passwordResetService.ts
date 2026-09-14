import { jsonONada, mensajeDeFallo, MENSAJE_SIN_RED } from './respuestaApi';

interface PasswordResetResult {
  success: boolean;
  message: string;
}

/**
 * Solicitar reseteo de contraseña por email.
 * Toda la lógica (buscar usuario, generar contraseña temporal, hashear, enviar email)
 * ocurre en el servidor: ver api/auth.ts (action=forgot-password).
 */
export async function requestPasswordResetByEmail(email: string): Promise<PasswordResetResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { success: false, message: 'Debes introducir un email válido' };
  }

  try {
    const response = await fetch('/api/auth?action=forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const data = await jsonONada(response);

    // Este es EL botón que se pulsa cuando algo va mal, así que es el peor sitio para
    // devolver un mensaje que culpe al usuario: el 2026-09-13 decía «Error de conexión»
    // mientras la función de auth no arrancaba.
    if (!response.ok || data === null) {
      return {
        success: false,
        message: mensajeDeFallo(response.status, data, 'No se ha podido procesar la solicitud.'),
      };
    }

    return { success: !!data.success, message: data.message };
  } catch (error) {
    console.error('❌ [RESET PASSWORD] Error al solicitar reseteo de contraseña:', error);
    return { success: false, message: MENSAJE_SIN_RED };
  }
}
