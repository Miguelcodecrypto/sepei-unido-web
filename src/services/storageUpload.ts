// Subida de archivos al bucket `public-files` sin INSERT público.
//
// El panel admin ya no sube con la anon key: pide a /api/admin?resource=storage_upload
// una signed upload URL (generada con service_role tras validar el token de admin) y
// sube el archivo directo a Supabase con ese token. El archivo no pasa por la función
// serverless, así que no le aplica el límite de body de Vercel.
import { supabase } from '../lib/supabase';
import { adminFetch } from './adminFetch';

export type StorageFolder =
  | 'announcements/images'
  | 'announcements/files'
  | 'interinos/bibliografia';

const STORAGE_BUCKET = 'public-files';

/**
 * Sube un archivo y devuelve su URL pública, o null si falla.
 * `contentType` solo hace falta cuando se quiere forzar uno distinto del que
 * declara el navegador (p. ej. text/html para los adjuntos de anuncios).
 */
export const uploadPublicFile = async (
  file: File,
  folder: StorageFolder,
  contentType?: string
): Promise<string | null> => {
  try {
    const { path, token, publicUrl } = await adminFetch('/api/admin?resource=storage_upload', {
      method: 'POST',
      body: JSON.stringify({ folder, fileName: file.name, contentType }),
    });

    if (!path || !token) {
      console.error('El backend no devolvió una signed upload URL válida');
      return null;
    }

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .uploadToSignedUrl(path, token, file, contentType ? { contentType } : undefined);

    if (error) {
      console.error('Error al subir el archivo a Storage:', error);
      return null;
    }

    return publicUrl || null;
  } catch (error) {
    console.error('Error en uploadPublicFile:', error);
    return null;
  }
};
