import { supabase } from '../lib/supabase';
import { adminFetch } from './adminFetch';
import { uploadPublicFile } from './storageUpload';

export type InterinosCategoria =
  | 'bibliografia'
  | 'formacion_bibliografia'
  | 'formacion_curso'
  | 'formacion_enlace'
  | 'noticias_destacadas'
  | 'oposiciones';

export interface InterinosBibliografiaItem {
  id: string;
  titulo: string;
  descripcion?: string | null;
  url: string;
  nombre: string;
  tipo: string;
  categoria: string;
  created_by?: string | null;
  created_at: string;
}

export const getInterinosContenido = async (
  categorias?: InterinosCategoria[] | InterinosCategoria
): Promise<InterinosBibliografiaItem[]> => {
  try {
    let query = supabase
      .from('interinos_bibliografia')
      .select('*');

    if (categorias) {
      const cats = Array.isArray(categorias) ? categorias : [categorias];
      query = query.in('categoria', cats);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener contenido de interinos:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error en getInterinosContenido:', err);
    return [];
  }
};

// Función específica para la bibliografía de formación en Interinos
export const getInterinosBibliografia = async (): Promise<InterinosBibliografiaItem[]> => {
  return getInterinosContenido(['bibliografia', 'formacion_bibliografia']);
};

// La subida pasa por una signed upload URL pedida al backend admin: el bucket ya
// no acepta INSERT con la anon key.
export const uploadInterinosBibliografiaFile = async (file: File): Promise<string | null> => {
  return uploadPublicFile(file, 'interinos/bibliografia');
};

// La creación pasa por /api/admin?resource=interinos (service_role tras el token
// de admin): la tabla ya no acepta escritura con la anon key.
export const createInterinosContenidoRecord = async (params: {
  titulo: string;
  descripcion?: string;
  url: string;
  nombre: string;
  tipo: string;
  categoria: InterinosCategoria;
  created_by?: string | null;
}): Promise<InterinosBibliografiaItem | null> => {
  try {
    const { item } = await adminFetch('/api/admin?resource=interinos', {
      method: 'POST',
      body: JSON.stringify({
        item: {
          titulo: params.titulo,
          descripcion: params.descripcion,
          url: params.url,
          nombre: params.nombre,
          tipo: params.tipo,
          categoria: params.categoria || 'bibliografia',
          created_by: params.created_by || null,
        },
      }),
    });
    return (item as InterinosBibliografiaItem) || null;
  } catch (error) {
    console.error('Error al crear contenido de interinos:', error);
    return null;
  }
};

export const deleteInterinosContenido = async (id: string): Promise<boolean> => {
  try {
    await adminFetch(`/api/admin?resource=interinos&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Error al eliminar contenido de interinos:', error);
    return false;
  }
};
