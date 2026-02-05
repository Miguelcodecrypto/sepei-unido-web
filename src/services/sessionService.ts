import { supabase } from '../lib/supabase';
import { getClientIP, generateSecureToken } from '../utils/network';

/**
 * Servicio de sesión centralizado para reemplazar localStorage
 * Usa Supabase para almacenar sesiones persistentes y sincronizadas
 */

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
const SESSION_KEY = 'sepei_session_token'; // Solo el token en localStorage

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  last_activity: string;
  is_active: boolean;
}

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
 * Crear nueva sesión de usuario
 */
export async function createSession(userId: string): Promise<string | null> {
  try {
    const sessionToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();
    const ip = await getClientIP();
    const userAgent = navigator.userAgent;

    console.log('🔐 [SESIÓN] Creando nueva sesión para usuario:', userId);

    // Crear sesión en Supabase
    const { data, error } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt,
        ip_address: ip,
        user_agent: userAgent,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ [SESIÓN] Error al crear sesión:', error);
      return null;
    }

    // Guardar solo el token en localStorage (mínimo dato sensible)
    localStorage.setItem(SESSION_KEY, sessionToken);
    console.log('✅ [SESIÓN] Sesión creada exitosamente');

    return sessionToken;
  } catch (error) {
    console.error('❌ [SESIÓN] Error al crear sesión:', error);
    return null;
  }
}

/**
 * Obtener usuario actual desde sesión
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const sessionToken = localStorage.getItem(SESSION_KEY);
    
    if (!sessionToken) {
      console.log('⚠️ [SESIÓN] No hay token de sesión');
      return null;
    }

    console.log('🔍 [SESIÓN] Buscando sesión activa...');

    // Buscar sesión activa en Supabase
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      console.log('⚠️ [SESIÓN] Sesión no encontrada o inactiva');
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    // Verificar si la sesión expiró
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    
    if (now > expiresAt) {
      console.log('⚠️ [SESIÓN] Sesión expirada');
      await invalidateSession(sessionToken);
      return null;
    }

    // Obtener datos del usuario
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, dni, nombre, apellidos, email, verified, autorizado_votar, requires_password_change')
      .eq('id', session.user_id)
      .single();

    if (userError || !user) {
      console.error('❌ [SESIÓN] Error al obtener usuario:', userError);
      return null;
    }

    // Actualizar última actividad (sin bloquear)
    updateSessionActivity(sessionToken).catch(err => 
      console.warn('⚠️ [SESIÓN] No se pudo actualizar última actividad:', err)
    );

    console.log('✅ [SESIÓN] Usuario recuperado:', user.nombre);
    return user;
  } catch (error) {
    console.error('❌ [SESIÓN] Error al obtener usuario actual:', error);
    return null;
  }
}

/**
 * Actualizar última actividad de la sesión
 */
async function updateSessionActivity(sessionToken: string): Promise<void> {
  await supabase
    .from('user_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('session_token', sessionToken);
}

/**
 * Invalidar sesión actual (logout)
 */
export async function invalidateSession(sessionToken?: string): Promise<void> {
  try {
    const token = sessionToken || localStorage.getItem(SESSION_KEY);
    
    if (!token) {
      console.log('⚠️ [SESIÓN] No hay token para invalidar');
      return;
    }

    console.log('🔐 [SESIÓN] Invalidando sesión...');

    // Desactivar sesión en Supabase
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('session_token', token);

    // Limpiar localStorage
    localStorage.removeItem(SESSION_KEY);
    
    console.log('✅ [SESIÓN] Sesión invalidada');
  } catch (error) {
    console.error('❌ [SESIÓN] Error al invalidar sesión:', error);
  }
}

/**
 * Invalidar todas las sesiones de un usuario
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  try {
    console.log('🔐 [SESIÓN] Invalidando todas las sesiones del usuario:', userId);

    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId);

    console.log('✅ [SESIÓN] Todas las sesiones invalidadas');
  } catch (error) {
    console.error('❌ [SESIÓN] Error al invalidar sesiones:', error);
  }
}

/**
 * Renovar sesión (extender duración)
 */
export async function renewSession(): Promise<boolean> {
  try {
    const sessionToken = localStorage.getItem(SESSION_KEY);
    
    if (!sessionToken) {
      return false;
    }

    const newExpiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        expires_at: newExpiresAt,
        last_activity: new Date().toISOString()
      })
      .eq('session_token', sessionToken);

    if (error) {
      console.error('❌ [SESIÓN] Error al renovar sesión:', error);
      return false;
    }

    console.log('✅ [SESIÓN] Sesión renovada');
    return true;
  } catch (error) {
    console.error('❌ [SESIÓN] Error al renovar sesión:', error);
    return false;
  }
}

/**
 * Limpiar sesiones expiradas (llamar periódicamente)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const { error } = await supabase.rpc('cleanup_expired_sessions');
    
    if (error) {
      console.error('❌ [SESIÓN] Error al limpiar sesiones expiradas:', error);
    } else {
      console.log('✅ [SESIÓN] Sesiones expiradas limpiadas');
    }
  } catch (error) {
    console.error('❌ [SESIÓN] Error al limpiar sesiones:', error);
  }
}

/**
 * Verificar si hay sesión activa (sin consultar DB)
 */
export function hasSessionToken(): boolean {
  return !!localStorage.getItem(SESSION_KEY);
}
