// Helper compartido para llamar a /api/admin desde el panel admin, con el
// token de sesión de admin en el header Authorization. Antes duplicado
// literalmente en adminUsersService.ts, adminSecurityService.ts y
// externalEmailsDatabase.ts.
import { getAdminToken } from './authService';

/**
 * `T` es lo que el endpoint promete devolver. No se valida en runtime —es una promesa,
 * no una comprobación—, pero obliga a declararla en cada llamada, y a partir de ahí el
 * compilador sí vigila lo que se hace con el resultado. Con el `any` anterior, todo lo
 * que entraba por aquí (es decir, TODO el panel admin) quedaba fuera de `strict`.
 */
export async function adminFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error((data as { error?: string })?.error || `Error en ${path}`);
  }
  return data as T;
}
