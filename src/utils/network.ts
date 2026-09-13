/**
 * Utilidades de red centralizadas
 * Este módulo contiene funciones comunes de red para evitar duplicación
 */

/**
 * Generar un token aleatorio seguro
 * @param length Longitud del token en bytes (el resultado será el doble en caracteres hex)
 * @returns String hexadecimal aleatorio
 */
export function generateSecureToken(length: number = 32): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generar una contraseña temporal legible
 * @param length Longitud de la contraseña
 * @returns Contraseña temporal alfanumérica
 */
export function generateTempPassword(length: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, byte => chars[byte % chars.length]).join('');
}
