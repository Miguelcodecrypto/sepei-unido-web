import { supabase } from '../lib/supabase';

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

// Obtener todos los anuncios
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, attachments:announcements_attachments(*)')
      .order('fecha_publicacion', { ascending: false });

    if (error) {
      console.error('Error al obtener anuncios:', error);
      return [];
    }

    return data || [];
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

// Crear nuevo anuncio
export const createAnnouncement = async (
  announcementData: Omit<Announcement, 'id' | 'fecha_creacion' | 'vistas'>
): Promise<Announcement | null> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        titulo: announcementData.titulo,
        contenido: announcementData.contenido,
        categoria: announcementData.categoria,
        imagen_url: announcementData.imagen_url,
        archivo_url: announcementData.archivo_url,
        archivo_nombre: announcementData.archivo_nombre,
        archivo_tipo: announcementData.archivo_tipo,
        publicado: announcementData.publicado,
        destacado: announcementData.destacado,
        fecha_publicacion: announcementData.fecha_publicacion,
        autor: announcementData.autor,
        vistas: 0,
      }])
      .select('*, attachments:announcements_attachments(*)')
      .single();

    if (error) {
      console.error('Error al crear anuncio:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en createAnnouncement:', error);
    return null;
  }
};

// Actualizar anuncio
export const updateAnnouncement = async (
  id: string,
  updates: Partial<Announcement>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar anuncio:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en updateAnnouncement:', error);
    return false;
  }
};

// Eliminar anuncio
export const deleteAnnouncement = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar anuncio:', error);
      return false;
    }

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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `announcements/files/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public-files')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error al subir archivo:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('public-files')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error en uploadAnnouncementFile:', error);
    return null;
  }
};

// Adjuntos múltiples
export const addAnnouncementAttachment = async (attachment: Omit<AnnouncementAttachment, 'id' | 'created_at'>): Promise<AnnouncementAttachment | null> => {
  try {
    const { data, error } = await supabase
      .from('announcements_attachments')
      .insert([attachment])
      .select()
      .single();

    if (error) {
      console.error('Error al crear adjunto:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en addAnnouncementAttachment:', error);
    return null;
  }
};

export const deleteAnnouncementAttachment = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('announcements_attachments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar adjunto:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en deleteAnnouncementAttachment:', error);
    return false;
  }
};
