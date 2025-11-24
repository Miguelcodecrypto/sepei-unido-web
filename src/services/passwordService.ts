import bcrypt from 'bcryptjs';

/**
 * Servicio para manejo seguro de contraseñas
 */

/**
 * Cifra una contraseña usando bcrypt
 * @param password - Contraseña en texto plano
 * @returns Contraseña cifrada (hash)
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10; // Nivel de seguridad (10 es estándar)
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

/**
 * Verifica si una contraseña coincide con su hash
 * @param password - Contraseña en texto plano
 * @param hashedPassword - Hash almacenado en la BD
 * @returns true si coinciden, false si no
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const isValid = await bcrypt.compare(password, hashedPassword);
  return isValid;
}

/**
 * Valida que una contraseña cumple requisitos mínimos de seguridad
 * @param password - Contraseña a validar
 * @returns Objeto con validación y mensaje de error si hay
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'La contraseña debe tener al menos 8 caracteres'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos una mayúscula'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos una minúscula'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos un número'
    };
  }

  return { valid: true };
}

/**
 * Genera una contraseña temporal segura
 * @param length - Longitud de la contraseña (por defecto 12)
 * @returns Contraseña temporal
 */
export function generateTemporaryPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Asegurar al menos un carácter de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Rellenar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mezclar caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
