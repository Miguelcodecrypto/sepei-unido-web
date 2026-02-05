// Autenticación simple con contraseña para el panel admin
// IMPORTANTE: La contraseña debe estar configurada en variables de entorno

// Obtener contraseña de variable de entorno (VITE_ para cliente Vite)
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
const AUTH_KEY = 'sepei_admin_auth';
const AUTH_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

// Verificar que la contraseña está configurada
if (!ADMIN_PASSWORD && import.meta.env.MODE !== 'development') {
  console.error('⚠️ [AUTH] VITE_ADMIN_PASSWORD no está configurada en las variables de entorno');
}

interface AuthSession {
  token: string;
  timestamp: number;
}

// Verificar si está autenticado
export const isAuthenticated = (): boolean => {
  const session = localStorage.getItem(AUTH_KEY);
  if (!session) return false;
  
  try {
    const auth: AuthSession = JSON.parse(session);
    const now = Date.now();
    
    // Verificar si la sesión expiró
    if (now - auth.timestamp > AUTH_EXPIRY) {
      logout();
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

// Iniciar sesión
export const login = (password: string): boolean => {
  if (password === ADMIN_PASSWORD) {
    const auth: AuthSession = {
      token: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    return true;
  }
  return false;
};

// Cerrar sesión
export const logout = (): void => {
  localStorage.removeItem(AUTH_KEY);
};

// Obtener tiempo restante de sesión (en minutos)
export const getSessionTimeRemaining = (): number => {
  const session = localStorage.getItem(AUTH_KEY);
  if (!session) return 0;
  
  try {
    const auth: AuthSession = JSON.parse(session);
    const elapsed = Date.now() - auth.timestamp;
    const remaining = AUTH_EXPIRY - elapsed;
    return Math.floor(remaining / 1000 / 60); // convertir a minutos
  } catch {
    return 0;
  }
};
