/**
 * Token de sesión de admin: firmado con HMAC-SHA256 (SESSION_SECRET), sin estado en BD.
 * Formato del token: "<base64url(payload)>.<base64url(firma)>"
 * payload = JSON { exp: epoch_ms }
 */
import { createHmac, timingSafeEqual } from 'crypto';

const ADMIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Falta SESSION_SECRET en las variables de entorno del servidor');
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createAdminToken(): string {
  const payload = JSON.stringify({ exp: Date.now() + ADMIN_SESSION_DURATION_MS });
  const encodedPayload = base64url(payload);
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token || !token.includes('.')) return false;

  const [encodedPayload, signature] = token.split('.');
  const expectedSignature = sign(encodedPayload);

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getBearerToken(req: any): string | null {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}
