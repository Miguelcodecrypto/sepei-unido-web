// Gestión de usuarios desde el panel admin. Todas las operaciones pasan por
// /api/admin-users (protegido con el token de sesión de admin).

import { getAdminToken } from './authService';

export interface AdminUser {
  id: string;
  nombre: string;
  apellidos?: string;
  dni?: string;
  email: string;
  telefono?: string;
  parque_sepei?: string;
  fecha_registro: string;
  terminos_aceptados: boolean;
  fecha_aceptacion_terminos: string;
  version_terminos: string;
  certificado_nif?: string;
  certificado_thumbprint?: string;
  certificado_fecha_validacion?: string;
  certificado_valido?: boolean;
  autorizado_votar?: boolean;
  telegram_chat_id?: string;
  telegram_username?: string;
  telegram_linked_at?: string;
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error en ${path}`);
  }
  return data;
}

export const getAllUsers = async (): Promise<AdminUser[]> => {
  try {
    const { users } = await adminFetch('/api/admin-users');
    return users || [];
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return [];
  }
};

export const deleteUser = async (id: string): Promise<boolean> => {
  try {
    await adminFetch(`/api/admin-users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return false;
  }
};

export const toggleVotingAuthorization = async (userId: string, autorizado: boolean): Promise<boolean> => {
  try {
    await adminFetch('/api/admin-users', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'toggle_voting', userId, autorizado }),
    });
    return true;
  } catch (error) {
    console.error('Error al actualizar autorización de voto:', error);
    return false;
  }
};

export const resetTempPassword = async (userId: string): Promise<{ success: boolean; tempPassword?: string }> => {
  try {
    const data = await adminFetch('/api/admin-users', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reset_password', userId }),
    });
    return { success: true, tempPassword: data.tempPassword };
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    return { success: false };
  }
};

export const exportUsersToCSV = async (): Promise<void> => {
  const users = await getAllUsers();

  if (users.length === 0) {
    alert('No hay usuarios para exportar');
    return;
  }

  const headers = ['ID', 'Nombre', 'Apellidos', 'DNI', 'Email', 'Teléfono', 'Fecha Registro', 'Términos Aceptados', 'Certificado NIF', 'Certificado Válido'];
  const rows = users.map(u => [
    u.id,
    u.nombre,
    u.apellidos || '',
    u.dni || '',
    u.email,
    u.telefono || '',
    new Date(u.fecha_registro).toLocaleString('es-ES'),
    u.terminos_aceptados ? 'Sí' : 'No',
    u.certificado_nif || '',
    u.certificado_valido ? 'Sí' : 'No',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `usuarios_sepei_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};
