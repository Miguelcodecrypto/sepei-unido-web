/**
 * Utilidades de red centralizadas
 * Este módulo contiene funciones comunes de red para evitar duplicación
 */

/**
 * Obtener la IP pública del cliente usando un servicio externo
 * @returns Promise con la IP del cliente o 'unknown' si falla
 */
export async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      console.warn('[NETWORK] Error al obtener IP:', response.status);
      return 'unknown';
    }
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.warn('[NETWORK] No se pudo obtener la IP del cliente:', error);
    return 'unknown';
  }
}

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
