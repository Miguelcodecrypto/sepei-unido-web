/**
 * Servicio de sesión de usuario. Todas las operaciones pasan por /api/auth
 * (el cliente ya no toca user_sessions ni users directamente).
 */

const SESSION_KEY = 'sepei_session_token';

export interface SessionUser {
  id: string;
  dni: string;
  nombre: string;
  apellidos?: string;
  email: string;
  verified: boolean;
  autorizado_votar?: boolean;
  requires_password_change?: boolean;
}

/**
 * Iniciar sesión con DNI y contraseña. La verificación ocurre en el servidor.
 */
export async function loginWithPassword(
  dni: string,
  password: string
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/auth?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error || 'Error al iniciar sesión' };
    }

    localStorage.setItem(SESSION_KEY, data.sessionToken);
    return { ok: true, user: data.user };
  } catch (error) {
    console.error('❌ [SESIÓN] Error al iniciar sesión:', error);
    return { ok: false, error: 'Error de conexión' };
  }
}

/**
 * Obtener usuario actual desde la sesión activa (revalidada en el servidor).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const sessionToken = localStorage.getItem(SESSION_KEY);
  if (!sessionToken) return null;

  try {
    const response = await fetch('/api/auth?action=session', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    if (!response.ok) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    const { user } = await response.json();
    return user;
  } catch (error) {
    console.error('❌ [SESIÓN] Error al obtener usuario actual:', error);
    return null;
  }
}

/**
 * Invalidar sesión actual (logout)
 */
export async function invalidateSession(): Promise<void> {
  const sessionToken = localStorage.getItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);

  if (!sessionToken) return;

  try {
    await fetch('/api/auth?action=logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
  } catch (error) {
    console.error('❌ [SESIÓN] Error al invalidar sesión:', error);
  }
}

/**
 * Verificar si hay sesión activa (sin consultar servidor)
 */
export function hasSessionToken(): boolean {
  return !!localStorage.getItem(SESSION_KEY);
}

/**
 * Token crudo de la sesión activa, para servicios que necesitan autenticar
 * sus propias llamadas (p.ej. votingDatabase.ts al emitir un voto).
 */
export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
