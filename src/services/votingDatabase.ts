/**
 * Cliente del sistema de votaciones. Todas las operaciones pasan por /api/voting
 * (service_role en el servidor) — el cliente ya no toca votaciones/opciones_votacion/
 * votos/voto_participaciones directamente. Antes lo hacía con la anon key y RLS
 * desactivado, lo que permitía votar ilimitadas veces o suplantar a otro usuario
 * desde la consola del navegador (ver auditoría 2026-08-06).
 *
 * La interfaz pública (nombres de función y tipos) se mantiene igual a propósito,
 * para no tener que tocar VotingBoard/VotingManager/VotingResultsPanel/
 * FloatingVotingButton — solo cambia la implementación de detrás.
 */
import { getSessionToken } from './sessionService';
import { getAdminToken } from './authService';

// Interfaces
export interface Votacion {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: 'votacion' | 'encuesta' | 'referendum';
  fecha_inicio: string;
  fecha_fin: string;
  publicado: boolean;
  resultados_publicos: boolean;
  multiple_respuestas: boolean;
  creado_por?: string;
  fecha_creacion: string;
  activa?: boolean;
}

export interface OpcionVotacion {
  id: string;
  votacion_id: string;
  texto: string;
  orden: number;
  fecha_creacion: string;
}

export interface Voto {
  id: string;
  votacion_id: string;
  opcion_id: string;
  user_id: string;
  user_email: string;
  fecha_voto: string;
}

export interface ResultadoVotacion {
  opcion_id: string;
  texto: string;
  total_votos: number;
  porcentaje: number;
}

export interface VotacionCompleta extends Votacion {
  opciones: OpcionVotacion[];
  total_votos?: number;
  usuario_ya_voto?: boolean;
  votos?: Array<{
    opcion: string;
    votos: number;
  }>;
  estado?: 'activa' | 'finalizada' | 'programada';
}

async function votingFetch(
  action: string,
  options: RequestInit & { auth?: 'user' | 'admin'; params?: Record<string, string> } = {}
): Promise<any> {
  const { auth, params, ...init } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as any) };

  if (auth === 'user') {
    const token = getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (auth === 'admin') {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const query = new URLSearchParams({ action, ...(params || {}) });
  const resp = await fetch(`/api/voting?${query.toString()}`, { ...init, headers });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const error = new Error(data.error || `Error en ${action}`) as any;
    error.status = resp.status;
    throw error;
  }
  return data;
}

// Obtener todas las votaciones (admin)
export async function getAllVotaciones(): Promise<VotacionCompleta[]> {
  try {
    const data = await votingFetch('admin-list', { auth: 'admin' });
    return data.votaciones || [];
  } catch (error) {
    console.error('Error al obtener votaciones:', error);
    return [];
  }
}

// Obtener votaciones publicadas (público)
export async function getVotacionesPublicadas(): Promise<VotacionCompleta[]> {
  try {
    const data = await votingFetch('published', { auth: 'user' });
    return data.votaciones || [];
  } catch (error) {
    console.error('Error al obtener votaciones publicadas:', error);
    return [];
  }
}

// Obtener votaciones activas
export async function getVotacionesActivas(): Promise<VotacionCompleta[]> {
  try {
    const data = await votingFetch('active', { auth: 'user' });
    return data.votaciones || [];
  } catch (error) {
    console.error('Error al obtener votaciones activas:', error);
    return [];
  }
}

// Verificar si hay votaciones activas y obtener días restantes
export async function checkActiveVotings(): Promise<{
  hasActiveVotings: boolean;
  daysRemaining: number;
  closestVoting: { titulo: string; fecha_fin: string } | null;
}> {
  try {
    return await votingFetch('summary');
  } catch (error) {
    console.error('Error al comprobar votaciones activas:', error);
    return { hasActiveVotings: false, daysRemaining: 0, closestVoting: null };
  }
}

// Crear votación
export async function createVotacion(
  votacion: Omit<Votacion, 'id' | 'fecha_creacion' | 'activa'>,
  opciones: string[]
): Promise<string | null> {
  try {
    const data = await votingFetch('admin-create', {
      method: 'POST',
      auth: 'admin',
      body: JSON.stringify({ votacion, opciones }),
    });
    return data.id || null;
  } catch (error) {
    console.error('Error al crear votación:', error);
    return null;
  }
}

// Actualizar votación
export async function updateVotacion(
  id: string,
  votacion: Partial<Votacion>,
  opciones?: { id?: string; texto: string; orden: number }[]
): Promise<boolean> {
  try {
    await votingFetch('admin-update', {
      method: 'POST',
      auth: 'admin',
      body: JSON.stringify({ id, votacion, opciones }),
    });
    return true;
  } catch (error) {
    console.error('Error al actualizar votación:', error);
    return false;
  }
}

// Eliminar votación
export async function deleteVotacion(id: string): Promise<boolean> {
  try {
    await votingFetch('admin-delete', {
      method: 'POST',
      auth: 'admin',
      body: JSON.stringify({ id }),
    });
    return true;
  } catch (error) {
    console.error('Error al eliminar votación:', error);
    return false;
  }
}

// Emitir voto (validado íntegramente en el servidor: sesión real, autorización,
// fechas, duplicados — el cliente no decide nada de esto).
export async function emitirVoto(
  votacion_id: string,
  opcion_ids: string[]
): Promise<boolean> {
  try {
    await votingFetch('vote', {
      method: 'POST',
      auth: 'user',
      body: JSON.stringify({ votacion_id, opcion_ids }),
    });
    return true;
  } catch (error) {
    console.error('Error al emitir voto:', error);
    return false;
  }
}

// Obtener resultados de votación (público, solo si resultados_publicos=true)
export async function getResultadosVotacion(
  votacion_id: string
): Promise<ResultadoVotacion[]> {
  try {
    const data = await votingFetch('results', { params: { votacion_id } });
    return data.resultados || [];
  } catch (error) {
    console.error('Error al obtener resultados:', error);
    return [];
  }
}

// Verificar si el usuario ya votó en una votación específica
export async function usuarioYaVoto(votacion_id: string): Promise<boolean> {
  try {
    const data = await votingFetch('has-voted', { auth: 'user', params: { votacion_id } });
    return !!data.yaVoto;
  } catch (error) {
    console.error('Error al verificar voto:', error);
    return false;
  }
}

// Toggle publicado
export async function togglePublicado(id: string, publicado: boolean): Promise<boolean> {
  try {
    await votingFetch('admin-toggle', {
      method: 'POST',
      auth: 'admin',
      body: JSON.stringify({ id, field: 'publicado', value: publicado }),
    });
    return true;
  } catch (error) {
    console.error('Error al cambiar estado de publicación:', error);
    return false;
  }
}

// Toggle resultados públicos
export async function toggleResultadosPublicos(
  id: string,
  resultados_publicos: boolean
): Promise<boolean> {
  try {
    await votingFetch('admin-toggle', {
      method: 'POST',
      auth: 'admin',
      body: JSON.stringify({ id, field: 'resultados_publicos', value: resultados_publicos }),
    });
    return true;
  } catch (error) {
    console.error('Error al cambiar visibilidad de resultados:', error);
    return false;
  }
}
