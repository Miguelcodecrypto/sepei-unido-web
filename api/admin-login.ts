import { timingSafeEqual } from 'crypto';
import { createAdminToken } from './_lib/adminAuth';
import { getClientIP, checkLoginAllowed, recordLoginAttempt } from './_lib/adminSecurity';

function passwordMatches(input: string, expected: string): boolean {
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD no está configurada en el servidor');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Falta la contraseña' });
  }

  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const gate = await checkLoginAllowed(ip);
    if (!gate.allowed) {
      return res.status(429).json({ error: gate.message });
    }

    const success = passwordMatches(password, adminPassword);
    await recordLoginAttempt(ip, userAgent, success);

    if (!success) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = createAdminToken();
    return res.status(200).json({ token });
  } catch (error: any) {
    console.error('Error en admin-login:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
