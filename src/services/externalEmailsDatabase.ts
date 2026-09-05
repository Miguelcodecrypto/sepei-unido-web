/**
 * Servicio para gestionar emails externos (destinatarios de notificaciones que no
 * son usuarios registrados). Todas las operaciones pasan por /api/admin
 * (resource=external_emails, protegido con el token de sesión de admin) — antes se
 * hacía CRUD completo directo contra Supabase con la anon key.
 */
import { getAdminToken } from './authService';

export interface ExternalEmail {
  id: string;
  email: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkImportContact {
  email: string;
  nombre: string;
  descripcion?: string;
}

export interface BulkImportResult {
  created: number;
  alreadyExists: number;
  invalid: Array<{ row: number; reason: string }>;
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

/**
 * Obtener todos los emails externos
 */
export async function getAllExternalEmails(): Promise<ExternalEmail[]> {
  try {
    const { externalEmails } = await adminFetch('/api/admin?resource=external_emails');
    return externalEmails || [];
  } catch (error) {
    console.error('Error obteniendo emails externos:', error);
    return [];
  }
}

/**
 * Obtener solo emails externos activos
 */
export async function getActiveExternalEmails(): Promise<ExternalEmail[]> {
  const all = await getAllExternalEmails();
  return all.filter((e) => e.activo);
}

/**
 * Crear nuevo email externo
 */
export async function createExternalEmail(
  email: string,
  nombre: string,
  descripcion?: string
): Promise<boolean> {
  try {
    await adminFetch('/api/admin?resource=external_emails', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', email, nombre, descripcion }),
    });
    return true;
  } catch (error) {
    console.error('Error en createExternalEmail:', error);
    return false;
  }
}

/**
 * Importar varios emails externos a la vez (desde un archivo CSV/Excel/JSON ya
 * parseado en el cliente). Los duplicados dentro del archivo y los que ya existen
 * en la base de datos se omiten sin error — se reportan en el resultado.
 */
export async function bulkCreateExternalEmails(contacts: BulkImportContact[]): Promise<BulkImportResult | null> {
  try {
    return await adminFetch('/api/admin?resource=external_emails', {
      method: 'POST',
      body: JSON.stringify({ action: 'bulk_create', contacts }),
    });
  } catch (error) {
    console.error('Error en bulkCreateExternalEmails:', error);
    return null;
  }
}

/**
 * Actualizar email externo
 */
export async function updateExternalEmail(
  id: string,
  updates: Partial<Omit<ExternalEmail, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  try {
    await adminFetch('/api/admin?resource=external_emails', {
      method: 'PATCH',
      body: JSON.stringify({ id, updates }),
    });
    return true;
  } catch (error) {
    console.error('Error actualizando email externo:', error);
    return false;
  }
}

/**
 * Eliminar email externo
 */
export async function deleteExternalEmail(id: string): Promise<boolean> {
  try {
    await adminFetch(`/api/admin?resource=external_emails&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error('Error eliminando email externo:', error);
    return false;
  }
}

/**
 * Activar/desactivar email externo
 */
export async function toggleExternalEmailStatus(id: string, activo: boolean): Promise<boolean> {
  return updateExternalEmail(id, { activo });
}
