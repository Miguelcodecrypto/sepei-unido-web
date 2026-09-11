/**
 * Cliente del sistema de votaciones. Todas las operaciones pasan por /api/voting
 * (service_role en el servidor) — el cliente ya no toca votaciones/opciones_votacion/
 * votos/voto_participaciones directamente. Antes lo hacía con la anon key y RLS
 * desactivado, lo que permitía votar ilimitadas veces o suplantar a otro usuario
 * desde la consola del navegador (ver auditoría 2026-08-06).
 *
 * La interfaz pública (nombres de función y tipos) se mantiene igual a propósito,
 * para no tener que tocar VotingBoard/VotingManager/VotingResultsPanel/
 * FloatingVotingButton — solo cambia la implementación de detrás. Las dos únicas
 * excepciones son `getResultadosVotacionAdmin` y `emitirVoto`: ahí el error del
 * servidor es información que el usuario necesita ver, y tragárselo para
 * mantener la firma salía más caro que cambiarla.
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

/**
 * Qué votación activa cierra antes, para el botón flotante. Devuelve la fecha,
 * no un contador: el "cuánto queda" se calcula en un único sitio
 * (`utils/tiempoRestante`), porque tenerlo también aquí es lo que hacía que la
 * tarjeta dijera "4 horas restantes" y el botón "1d" a la vez.
 */
export async function checkActiveVotings(): Promise<{
  hasActiveVotings: boolean;
  closestVoting: { titulo: string; fecha_fin: string } | null;
}> {
  try {
    return await votingFetch('summary');
  } catch (error) {
    console.error('Error al comprobar votaciones activas:', error);
    return { hasActiveVotings: false, closestVoting: null };
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

/**
 * Emitir voto (validado íntegramente en el servidor: sesión real, autorización,
 * fechas, duplicados — el cliente no decide nada de esto).
 *
 * Segunda excepción a la convención de este archivo, por el mismo motivo que
 * `getResultadosVotacionAdmin`: el servidor distingue "ya has votado" de "no
 * estás autorizado" o "la votación ha finalizado", y devolver un `boolean`
 * tiraba ese motivo a la basura. La pantalla acababa enseñando las tres causas
 * a la vez para que el votante adivinara cuál era la suya.
 */
export interface ResultadoEmisionVoto {
  ok: boolean;
  /** Motivo del rechazo, ya presentable: es el texto que manda el servidor. */
  motivo?: string;
  /** Código HTTP, para que la UI distinga la sesión caducada (401) del resto. */
  status?: number;
}

export async function emitirVoto(
  votacion_id: string,
  opcion_ids: string[]
): Promise<ResultadoEmisionVoto> {
  try {
    await votingFetch('vote', {
      method: 'POST',
      auth: 'user',
      body: JSON.stringify({ votacion_id, opcion_ids }),
    });
    return { ok: true };
  } catch (error) {
    console.error('Error al emitir voto:', error);
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : undefined;
    return { ok: false, status, motivo: motivoDeRechazo(error, status) };
  }
}

/**
 * Los mensajes de `api/voting.ts` para la acción `vote` están escritos para
 * leerse ("Ya has votado en esta votación", "La votación ha finalizado"), así
 * que se muestran tal cual. Los únicos que se sustituyen son los que no le
 * dicen nada al votante: un fallo interno del servidor o una caída de red, que
 * además sí admiten "vuelve a intentarlo".
 */
function motivoDeRechazo(error: unknown, status?: number): string {
  // Sin status es que el `fetch` ni llegó a responder (sin conexión, DNS, CORS).
  if (status === undefined) {
    return 'No se ha podido conectar con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo.';
  }
  if (status >= 500) {
    return 'El servidor ha fallado al registrar el voto. Inténtalo de nuevo dentro de unos minutos.';
  }
  const mensaje = typeof (error as any)?.message === 'string' ? (error as any).message.trim() : '';
  return mensaje || 'No se ha podido registrar el voto.';
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

/**
 * Resultados para el panel admin. Es una acción aparte a propósito: la pública
 * (`results`) devuelve 403 mientras `resultados_publicos` sea false, así que el
 * admin no podía ver el recuento de una votación secreta sin publicarlo antes
 * para todo el mundo. A diferencia del resto de funciones de este archivo, esta
 * NO se traga el error: quien la llama tiene que poder avisar en pantalla en vez
 * de pintar un panel vacío sin explicación.
 */
export async function getResultadosVotacionAdmin(
  votacion_id: string
): Promise<ResultadoVotacion[]> {
  const data = await votingFetch('admin-results', { auth: 'admin', params: { votacion_id } });
  return data.resultados || [];
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
