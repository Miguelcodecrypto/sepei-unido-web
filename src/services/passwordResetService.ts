interface PasswordResetResult {
  success: boolean;
  message: string;
}

/**
 * Solicitar reseteo de contraseña por email.
 * Toda la lógica (buscar usuario, generar contraseña temporal, hashear, enviar email)
 * ocurre en el servidor: ver api/auth-forgot-password.ts.
 */
export async function requestPasswordResetByEmail(email: string): Promise<PasswordResetResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { success: false, message: 'Debes introducir un email válido' };
  }

  try {
    const response = await fetch('/api/auth-forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const data = await response.json();
    return { success: !!data.success, message: data.message };
  } catch (error) {
    console.error('❌ [RESET PASSWORD] Error al solicitar reseteo de contraseña:', error);
    return {
      success: false,
      message: 'Error al procesar la solicitud. Inténtalo de nuevo más tarde.',
    };
  }
}
