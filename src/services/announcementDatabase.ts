import { supabase } from '../lib/supabase';
// Los tipos del esquema real los genera `npm run types:db` (⚠️ se generan, no se editan).
// Se importan con `import type`, así que desaparecen al compilar: no entra nada de `api/`
// en el bundle del navegador.
import type { Database } from '../../api/_lib/database.types';
import { adminFetch } from './adminFetch';
import { uploadPublicFile } from './storageUpload';

/**
 * Convierte una URL de Supabase Storage a una URL del proxy que permite
 * visualizar archivos inline (HTML, PDF, etc.) en vez de forzar descarga.
 */
export const getViewableFileUrl = (supabaseUrl: string): string => {
  // Si ya es una URL del proxy o no es de Supabase, devolverla tal cual
  if (!supabaseUrl.includes('supabase.co/storage/')) {
    return supabaseUrl;
  }
  // Convertir a URL del proxy
  return `/api/view-file?url=${encodeURIComponent(supabaseUrl)}`;
};

/**
 * Genera la URL completa para compartir (emails, etc.)
 */
export const getShareableFileUrl = (supabaseUrl: string): string => {
  if (!supabaseUrl.includes('supabase.co/storage/')) {
    return supabaseUrl;
  }
  return `https://www.sepeiunido.org/api/view-file?url=${encodeURIComponent(supabaseUrl)}`;
};

/**
 * Las categorías que el front sabe pintar (cada una tiene su icono y su color).
 *
 * ⚠️ En la base `announcements.categoria` es **texto libre**: nada impide que llegue
 * cualquier otra cosa. Por eso lo que entra desde Supabase pasa por `aCategoria()`
 * en vez de afirmarse con un `as`. Hoy los datos están limpios (comunicado, noticia,
 * evento, urgente), pero eso es una coincidencia afortunada, no una garantía.
 */
export const CATEGORIAS_ANUNCIO = ['noticia', 'comunicado', 'evento', 'urgente'] as const;
export type CategoriaAnuncio = (typeof CATEGORIAS_ANUNCIO)[number];

/**
 * Convierte el texto de la base en una categoría conocida. Una desconocida se muestra
 * como «noticia» (la neutra) y se avisa por consola: preferimos un anuncio con el icono
 * genérico a un anuncio que no se pinta, y preferimos enterarnos a no enterarnos.
 */
export function aCategoria(valor: string | null | undefined): CategoriaAnuncio {
  if ((CATEGORIAS_ANUNCIO as readonly string[]).includes(valor ?? '')) {
    return valor as CategoriaAnuncio;
  }
  if (valor) console.warn(`Categoría de anuncio desconocida: ${valor}`);
  return 'noticia';
}

export interface Announcement {
  id: string;
  titulo: string;
  contenido: string;
  categoria: CategoriaAnuncio;
  // ⚠️ `| null` no es adorno: Postgres devuelve NULL, no `undefined`. Declararlos solo
  // como opcionales era una tercera forma de que el tipo dijera algo que el dato no
  // cumple — la misma clase de mentira que dejó pasar los fallos de `lastlogin`.
  imagen_url?: string | null;
  archivo_url?: string | null;
  archivo_nombre?: string | null;
  archivo_tipo?: string | null;
  publicado: boolean;
  destacado: boolean;
  es_html: boolean;
  // Nullables en Postgres (ninguna de las dos es NOT NULL), así que el tipo lo dice.
  fecha_publicacion: string | null;
  fecha_creacion: string | null;
  autor: string;
  vistas: number;
  attachments?: AnnouncementAttachment[];
}

export const CATEGORIAS_ADJUNTO = ['documento', 'video', 'audio', 'link'] as const;
export type CategoriaAdjunto = (typeof CATEGORIAS_ADJUNTO)[number];

/** Igual que `aCategoria`, para los adjuntos. Lo desconocido se trata como documento. */
export function aCategoriaAdjunto(valor: string | null | undefined): CategoriaAdjunto {
  if ((CATEGORIAS_ADJUNTO as readonly string[]).includes(valor ?? '')) {
    return valor as CategoriaAdjunto;
  }
  if (valor) console.warn(`Categoría de adjunto desconocida: ${valor}`);
  return 'documento';
}

/** Las filas tal y como las devuelve Supabase, antes de normalizarlas. */
type AnnouncementRow = Database['public']['Tables']['announcements']['Row'] & {
  attachments?: Database['public']['Tables']['announcements_attachments']['Row'][] | null;
};

export interface AnnouncementAttachment {
  id: string;
  announcement_id: string | null;
  url: string;
  nombre: string;
  tipo: string;
  categoria: CategoriaAdjunto;
  created_at: string;
}

// Obtener todos los anuncios (panel admin: incluye borradores, que la política
// pública de RLS no deja leer — por eso pasa por el backend con service_role).
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  try {
    // El endpoint del panel hace el MISMO select que la vista pública, así que devuelve
    // filas igual de crudas: `categoria` como texto libre y los flags nullables. Se
    // normalizan por el mismo sitio, o el panel y la web pública verían tipos distintos
    // del mismo dato.
    const { announcements } = await adminFetch<{ announcements: AnnouncementRow[] }>('/api/admin?resource=announcements');
    return (announcements ?? []).map(normalizarAnuncio);
  } catch (error) {
    console.error('Error en getAllAnnouncements:', error);
    return [];
  }
};

/**
 * Frontera entre la base y el front: aquí es donde una fila de Supabase se convierte
 * en un `Announcement` de verdad.
 *
 * Las tres columnas de flags son NULLABLE en Postgres (tienen DEFAULT, que no es lo
 * mismo que NOT NULL), así que pueden llegar como `null`. En vez de arrastrar ese
 * `boolean | null` por los veinte componentes que los leen, se resuelve una sola vez
 * aquí: NULL se trata como `false`, que es lo que ya hacía el código sin saberlo —
 * `null` es falsy—, pero ahora está escrito y el tipo deja de mentir.
 */
function normalizarAnuncio(fila: AnnouncementRow): Announcement {
  return {
    ...fila,
    categoria: aCategoria(fila.categoria),
    publicado: fila.publicado ?? false,
    destacado: fila.destacado ?? false,
    es_html: fila.es_html ?? false,
    vistas: fila.vistas ?? 0,
    attachments: (fila.attachments ?? []).map((adjunto) => ({
      ...adjunto,
      categoria: aCategoriaAdjunto(adjunto.categoria),
    })),
  };
}

// Obtener anuncios publicados (para la vista pública)
export const getPublishedAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, attachments:announcements_attachments(*)')
      .eq('publicado', true)
      .order('destacado', { ascending: false })
      .order('fecha_publicacion', { ascending: false });

    if (error) {
      console.error('Error al obtener anuncios publicados:', error);
      return [];
    }

    return (data ?? []).map(normalizarAnuncio);
  } catch (error) {
    console.error('Error en getPublishedAnnouncements:', error);
    return [];
  }
};

// Crear nuevo anuncio (solo admin, vía backend)
export const createAnnouncement = async (
  announcementData: Omit<Announcement, 'id' | 'fecha_creacion' | 'vistas'>
): Promise<Announcement | null> => {
  try {
    const { announcement } = await adminFetch<{ announcement: Announcement | null }>('/api/admin?resource=announcements', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', announcement: announcementData }),
    });
    return announcement || null;
  } catch (error) {
    console.error('Error en createAnnouncement:', error);
    return null;
  }
};

// Actualizar anuncio (solo admin, vía backend)
export const updateAnnouncement = async (
  id: string,
  updates: Partial<Announcement>
): Promise<boolean> => {
  try {
    await adminFetch('/api/admin?resource=announcements', {
      method: 'PATCH',
      body: JSON.stringify({ id, updates }),
    });
    return true;
  } catch (error) {
    console.error('Error en updateAnnouncement:', error);
    return false;
  }
};

// Eliminar anuncio (solo admin, vía backend)
export const deleteAnnouncement = async (id: string): Promise<boolean> => {
  try {
    await adminFetch(`/api/admin?resource=announcements&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Error en deleteAnnouncement:', error);
    return false;
  }
};

// Incrementar vistas
export const incrementViews = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('increment_announcement_views', { announcement_id: id });

    if (error) {
      console.error('Error al incrementar vistas:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en incrementViews:', error);
    return false;
  }
};

// Subir imagen a Supabase Storage (vía signed upload URL del backend admin: el
// bucket ya no acepta INSERT con la anon key).
export const uploadAnnouncementImage = async (file: File): Promise<string | null> => {
  return uploadPublicFile(file, 'announcements/images');
};

// Subir archivo a Supabase Storage (vía signed upload URL del backend admin).
// Se sigue forzando el Content-Type por extensión: el que declara el navegador es
// poco fiable para .html y ofimática, y de él depende que el adjunto se abra bien.
const CONTENT_TYPE_POR_EXTENSION: Record<string, string> = {
  'html': 'text/html',
  'htm': 'text/html',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'json': 'application/json',
  'xml': 'application/xml',
  'mp4': 'video/mp4',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'webm': 'video/webm',
  'ogg': 'audio/ogg',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
};

export const uploadAnnouncementFile = async (file: File): Promise<string | null> => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const contentType = CONTENT_TYPE_POR_EXTENSION[fileExt] || file.type || 'application/octet-stream';
  return uploadPublicFile(file, 'announcements/files', contentType);
};

// Adjuntos múltiples (solo admin, vía backend)
export const addAnnouncementAttachment = async (attachment: Omit<AnnouncementAttachment, 'id' | 'created_at'>): Promise<AnnouncementAttachment | null> => {
  try {
    const { attachment: created } = await adminFetch<{ attachment: AnnouncementAttachment | null }>('/api/admin?resource=announcements', {
      method: 'POST',
      body: JSON.stringify({ action: 'add_attachment', attachment }),
    });
    return created || null;
  } catch (error) {
    console.error('Error en addAnnouncementAttachment:', error);
    return null;
  }
};

export const deleteAnnouncementAttachment = async (id: string): Promise<boolean> => {
  try {
    await adminFetch(`/api/admin?resource=announcements&attachment_id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Error en deleteAnnouncementAttachment:', error);
    return false;
  }
};
