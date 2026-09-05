// Helper compartido para llamar a /api/admin desde el panel admin, con el
// token de sesión de admin en el header Authorization. Antes duplicado
// literalmente en adminUsersService.ts, adminSecurityService.ts y
// externalEmailsDatabase.ts.
import { getAdminToken } from './authService';

export async function adminFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getAdminToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error en ${path}`);
  }
  return data;
}
