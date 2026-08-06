// Autenticación del panel admin: la contraseña se verifica en el servidor (api/admin.ts, resource=login).
// El token que se guarda aquí es un JWT-like firmado con HMAC server-side, no un valor local.

const AUTH_KEY = 'sepei_admin_token';

// Verificar si está autenticado (comprobación local rápida; el servidor revalida el token en cada llamada admin-*)
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem(AUTH_KEY);
};

export const getAdminToken = (): string | null => {
  return localStorage.getItem(AUTH_KEY);
};

// Iniciar sesión
export const login = async (password: string): Promise<{ ok: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/admin?resource=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error || 'Error al iniciar sesión' };
    }

    localStorage.setItem(AUTH_KEY, data.token);
    return { ok: true };
  } catch (error) {
    console.error('Error en login admin:', error);
    return { ok: false, error: 'Error de conexión' };
  }
};

// Cerrar sesión
export const logout = (): void => {
  localStorage.removeItem(AUTH_KEY);
};

// Tiempo restante de sesión en minutos, leído del payload del token (solo para UI; el servidor
// es quien realmente valida la firma y expiración en cada llamada admin-*).
export const getSessionTimeRemaining = (): number => {
  const token = localStorage.getItem(AUTH_KEY);
  if (!token || !token.includes('.')) return 0;

  try {
    const [encodedPayload] = token.split('.');
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
    const remainingMs = payload.exp - Date.now();
    return remainingMs > 0 ? Math.floor(remainingMs / 1000 / 60) : 0;
  } catch {
    return 0;
  }
};
