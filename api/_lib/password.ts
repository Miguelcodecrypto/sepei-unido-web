import { randomBytes } from 'crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';

/** Genera una contraseña temporal con entropía criptográfica (crypto.randomBytes), no Math.random. */
export function generateTempPassword(length: number = 12): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CHARS[byte % CHARS.length]).join('');
}
