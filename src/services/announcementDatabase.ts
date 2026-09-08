import { supabase } from '../lib/supabase';
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

export interface Announcement {
  id: string;
  titulo: string;
  contenido: string;
  categoria: 'noticia' | 'comunicado' | 'evento' | 'urgente';
  imagen_url?: string;
  archivo_url?: string;
  archivo_nombre?: string;
  archivo_tipo?: string;
  publicado: boolean;
  destacado: boolean;
  es_html: boolean;
  fecha_publicacion: string;
  fecha_creacion: string;
  autor: string;
  vistas: number;
  attachments?: AnnouncementAttachment[];
}

export interface AnnouncementAttachment {
  id: string;
  announcement_id: string;
  url: string;
  nombre: string;
  tipo: string;
  categoria: 'documento' | 'video' | 'audio' | 'link';
  created_at: string;
}

// Obtener todos los anuncios (panel admin: incluye borradores, que la política
// pública de RLS no deja leer — por eso pasa por el backend con service_role).
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const { announcements } = await adminFetch('/api/admin?resource=announcements');
    return announcements || [];
  } catch (error) {
    console.error('Error en getAllAnnouncements:', error);
    return [];
  }
};

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

    return data || [];
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
    const { announcement } = await adminFetch('/api/admin?resource=announcements', {
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
    const { attachment: created } = await adminFetch('/api/admin?resource=announcements', {
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
