// Lectura de estadísticas de seguridad del panel admin.
// Todas las consultas pasan por /api/admin-security (protegido con el token de sesión de admin);
// el cliente ya no toca las tablas admin_login_attempts / blocked_ips directamente.

import { getAdminToken } from './authService';

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
  attempt_number: number;
  success: boolean;
  user_agent: string;
  country: string | null;
  city: string | null;
  blocked: boolean;
  created_at: string;
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getAdminToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Error en ${path}: ${response.status}`);
  }
  return response.json();
}

export async function getSecurityStats(): Promise<SecurityStats | null> {
  try {
    const { stats } = await adminFetch('/api/admin-security?resource=stats');
    return stats;
  } catch (error) {
    console.error('Error en getSecurityStats:', error);
    return null;
  }
}

export async function getRecentLoginAttempts(_limit: number = 50): Promise<LoginAttemptRecord[]> {
  try {
    const { attempts } = await adminFetch('/api/admin-security?resource=attempts');
    return attempts || [];
  } catch (error) {
    console.error('Error en getRecentLoginAttempts:', error);
    return [];
  }
}

export async function getBlockedIPs(): Promise<Array<{
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  blocked_until: string | null;
}>> {
  try {
    const { blocked } = await adminFetch('/api/admin-security?resource=blocked');
    return blocked || [];
  } catch (error) {
    console.error('Error en getBlockedIPs:', error);
    return [];
  }
}

export async function unblockIP(ip: string): Promise<boolean> {
  try {
    await adminFetch('/api/admin-security', {
      method: 'POST',
      body: JSON.stringify({ action: 'unblock', ip }),
    });
    return true;
  } catch (error) {
    console.error('Error en unblockIP:', error);
    return false;
  }
}
