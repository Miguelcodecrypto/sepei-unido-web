/**
 * IP real del cliente. `x-forwarded-for` lo puede fijar el propio cliente (el valor más a la
 * izquierda es el menos fiable), así que se prioriza x-vercel-forwarded-for: Vercel lo fija en
 * su edge a partir de la conexión TCP real y descarta cualquier valor que llegue del cliente.
 */
export function getClientIP(req: any): string {
  const vercelForwarded = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded.length > 0) {
    return vercelForwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp.trim();
  }

  // Fallback solo si no hay cabeceras de Vercel: el salto más a la derecha es el más cercano
  // al proxy de confianza, el resto puede haberlo añadido el propio cliente.
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const parts = forwarded.split(',').map((p: string) => p.trim());
    return parts[parts.length - 1];
  }

  return req.socket?.remoteAddress || 'unknown';
}
