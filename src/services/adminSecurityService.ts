// Servicio de seguridad para el panel de administración
// Registra intentos de login, IPs, y gestiona bloqueos

import { supabase } from '../lib/supabase';

export interface LoginAttemptData {
  ip_address: string;
  attempted_password: string;
  success: boolean;
  user_agent: string;
  country?: string;
  city?: string;
}

export interface SecurityStats {
  total_attempts: number;
  failed_attempts_24h: number;
  successful_attempts_24h: number;
  unique_ips_24h: number;
  blocked_ips: number;
  suspicious_ips: Array<{
    ip: string;
    attempts: number;
    last_attempt: string;
  }> | null;
}

export interface LoginAttemptRecord {
  id: string;
  ip_address: string;
  attempted_password: string;
  attempt_number: number;
  success: boolean;
  user_agent: string;
  country: string | null;
  city: string | null;
  blocked: boolean;
  created_at: string;
}

// Configuración de seguridad
const MAX_ATTEMPTS_BEFORE_BLOCK = 3; // Bloquear después de 3 intentos fallidos
const BLOCK_DURATION_HOURS = 24; // Bloqueo temporal de 24 horas
const RATE_LIMIT_WINDOW_MINUTES = 5; // Ventana para rate limiting
const MAX_ATTEMPTS_IN_WINDOW = 3; // Máximo intentos en la ventana

/**
 * Obtiene la IP del cliente usando servicios externos
 */
export async function getClientIP(): Promise<string> {
  try {
    // Intentar con ipify (más confiable)
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      return data.ip;
    }
  } catch (error) {
    console.error('Error obteniendo IP con ipify:', error);
  }

  try {
    // Fallback con ip-api
    const response = await fetch('https://ip-api.com/json/');
    if (response.ok) {
      const data = await response.json();
      return data.query;
    }
  } catch (error) {
    console.error('Error obteniendo IP con ip-api:', error);
  }

  return 'unknown';
}

/**
 * Obtiene información geográfica de la IP
 */
export async function getIPGeolocation(ip: string): Promise<{ country?: string; city?: string }> {
  if (ip === 'unknown') return {};
  
  try {
    const response = await fetch(`https://ip-api.com/json/${ip}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return {
          country: data.country,
          city: data.city
        };
      }
    }
  } catch (error) {
    console.error('Error obteniendo geolocalización:', error);
  }
  
  return {};
}

/**
 * Cuenta los intentos fallidos de una IP en las últimas horas
 */
export async function countFailedAttempts(ip: string, hours: number = 24): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('count_failed_attempts', {
      check_ip: ip,
      hours: hours
    });
    
    if (error) {
      console.error('Error contando intentos fallidos:', error);
      // Fallback: consulta directa
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('admin_login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .eq('success', false)
        .gte('created_at', since);
      return count || 0;
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error en countFailedAttempts:', error);
    return 0;
  }
}

/**
 * Verifica si una IP está bloqueada
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_ip_blocked', {
      check_ip: ip
    });
    
    if (error) {
      console.error('Error verificando bloqueo:', error);
      // Fallback: consulta directa
      const { data: blocked } = await supabase
        .from('blocked_ips')
        .select('id')
        .eq('ip_address', ip)
        .or('blocked_until.is.null,blocked_until.gt.now()')
        .limit(1);
      return (blocked && blocked.length > 0) ?? false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error en isIPBlocked:', error);
    return false;
  }
}

/**
 * Bloquea una IP temporal o permanentemente
 */
export async function blockIP(ip: string, reason: string, permanent: boolean = false): Promise<boolean> {
  try {
    const blockedUntil = permanent ? null : new Date(Date.now() + BLOCK_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('blocked_ips')
      .upsert({
        ip_address: ip,
        reason: reason,
        blocked_until: blockedUntil,
        blocked_at: new Date().toISOString()
      }, {
        onConflict: 'ip_address'
      });
    
    if (error) {
      console.error('Error bloqueando IP:', error);
      return false;
    }
    
    console.log(`🚫 IP ${ip} bloqueada: ${reason}`);
    return true;
  } catch (error) {
    console.error('Error en blockIP:', error);
    return false;
  }
}

/**
 * Registra un intento de login
 */
export async function logLoginAttempt(
  password: string,
  success: boolean
): Promise<{ allowed: boolean; blocked: boolean; attempts: number; message?: string }> {
  try {
    // Obtener IP del cliente
    const ip = await getClientIP();
    const userAgent = navigator.userAgent;
    
    // Verificar si la IP está bloqueada
    const blocked = await isIPBlocked(ip);
    if (blocked) {
      return {
        allowed: false,
        blocked: true,
        attempts: 0,
        message: '🚫 Tu IP ha sido bloqueada temporalmente por múltiples intentos fallidos. Intenta más tarde.'
      };
    }
    
    // Contar intentos fallidos recientes
    const failedAttempts = await countFailedAttempts(ip, 24);
    
    // Obtener geolocalización
    const geo = await getIPGeolocation(ip);
    
    // Registrar el intento
    const { error } = await supabase
      .from('admin_login_attempts')
      .insert({
        ip_address: ip,
        attempted_password: password, // Se guarda la contraseña intentada
        attempt_number: failedAttempts + 1,
        success: success,
        user_agent: userAgent,
        country: geo.country || null,
        city: geo.city || null,
        blocked: false
      });
    
    if (error) {
      console.error('Error registrando intento de login:', error);
    }
    
    // Si falló y supera el límite, bloquear IP
    if (!success && failedAttempts + 1 >= MAX_ATTEMPTS_BEFORE_BLOCK) {
      await blockIP(ip, `Más de ${MAX_ATTEMPTS_BEFORE_BLOCK} intentos fallidos de login al panel admin`);
      return {
        allowed: false,
        blocked: true,
        attempts: failedAttempts + 1,
        message: `🚫 Tu IP ha sido bloqueada por ${BLOCK_DURATION_HOURS} horas debido a múltiples intentos fallidos.`
      };
    }
    
    // Rate limiting: verificar intentos en ventana corta
    const recentAttempts = await countRecentAttempts(ip);
    if (recentAttempts >= MAX_ATTEMPTS_IN_WINDOW) {
      return {
        allowed: false,
        blocked: false,
        attempts: failedAttempts + 1,
        message: `⏳ Demasiados intentos. Espera ${RATE_LIMIT_WINDOW_MINUTES} minutos antes de intentar de nuevo.`
      };
    }
    
    return {
      allowed: true,
      blocked: false,
      attempts: failedAttempts + (success ? 0 : 1)
    };
  } catch (error) {
    console.error('Error en logLoginAttempt:', error);
    return { allowed: true, blocked: false, attempts: 0 };
  }
}

/**
 * Cuenta intentos recientes en la ventana de rate limiting
 */
async function countRecentAttempts(ip: string): Promise<number> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  
  const { count } = await supabase
    .from('admin_login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', since);
  
  return count || 0;
}

/**
 * Obtiene estadísticas de seguridad
 */
export async function getSecurityStats(): Promise<SecurityStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_security_stats');
    
    if (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
    
    return data as SecurityStats;
  } catch (error) {
    console.error('Error en getSecurityStats:', error);
    return null;
  }
}

/**
 * Obtiene los últimos intentos de login
 */
export async function getRecentLoginAttempts(limit: number = 50): Promise<LoginAttemptRecord[]> {
  try {
    const { data, error } = await supabase
      .from('admin_login_attempts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error obteniendo intentos recientes:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en getRecentLoginAttempts:', error);
    return [];
  }
}

/**
 * Obtiene las IPs bloqueadas
 */
export async function getBlockedIPs(): Promise<Array<{
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  blocked_until: string | null;
}>> {
  try {
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('blocked_at', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo IPs bloqueadas:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en getBlockedIPs:', error);
    return [];
  }
}

/**
 * Desbloquea una IP
 */
export async function unblockIP(ip: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('blocked_ips')
      .delete()
      .eq('ip_address', ip);
    
    if (error) {
      console.error('Error desbloqueando IP:', error);
      return false;
    }
    
    console.log(`✅ IP ${ip} desbloqueada`);
    return true;
  } catch (error) {
    console.error('Error en unblockIP:', error);
    return false;
  }
}

/**
 * Obtiene intentos por IP específica
 */
export async function getAttemptsByIP(ip: string): Promise<LoginAttemptRecord[]> {
  try {
    const { data, error } = await supabase
      .from('admin_login_attempts')
      .select('*')
      .eq('ip_address', ip)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo intentos por IP:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en getAttemptsByIP:', error);
    return [];
  }
}
