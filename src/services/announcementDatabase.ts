import { supabase } from '../lib/supabase';
import { adminFetch } from './adminFetch';

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

// Subir imagen a Supabase Storage
export const uploadAnnouncementImage = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `announcements/images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public-files')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error al subir imagen:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('public-files')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error en uploadAnnouncementImage:', error);
    return null;
  }
};

// Subir archivo a Supabase Storage
export const uploadAnnouncementFile = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `announcements/files/${fileName}`;

    console.log('📁 [UPLOAD] Iniciando subida de archivo:', {
      originalName: file.name,
      newName: fileName,
      path: filePath,
      size: file.size,
      type: file.type
    });

    // Determinar el Content-Type correcto
    const contentTypeMap: Record<string, string> = {
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

    const contentType = contentTypeMap[fileExt || ''] || file.type || 'application/octet-stream';
    console.log('📁 [UPLOAD] Content-Type:', contentType);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public-files')
      .upload(filePath, file, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ [UPLOAD] Error al subir archivo:', uploadError);
      alert(`Error al subir archivo: ${uploadError.message}`);
      return null;
    }

    console.log('✅ [UPLOAD] Archivo subido:', uploadData);

    const { data: { publicUrl } } = supabase.storage
      .from('public-files')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error en uploadAnnouncementFile:', error);
    return null;
  }
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
