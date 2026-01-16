import { supabase } from '../lib/supabase';

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

export const uploadInterinosBibliografiaFile = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop() || 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9\.\-_]/g, '_');
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${safeName}`;
    const filePath = `interinos/bibliografia/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public-files')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error al subir archivo de bibliografía:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('public-files')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('Error en uploadInterinosBibliografiaFile:', err);
    return null;
  }
};

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
    const { data, error } = await supabase
      .from('interinos_bibliografia')
      .insert([
        {
          titulo: params.titulo,
          descripcion: params.descripcion,
          url: params.url,
          nombre: params.nombre,
          tipo: params.tipo,
          categoria: params.categoria || 'bibliografia',
          created_by: params.created_by || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al crear contenido de interinos:', error);
      return null;
    }

    return data as InterinosBibliografiaItem;
  } catch (err) {
    console.error('Error en createInterinosContenidoRecord:', err);
    return null;
  }
};

export const deleteInterinosContenido = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('interinos_bibliografia')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar contenido de interinos:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error en deleteInterinosContenido:', err);
    return false;
  }
};
