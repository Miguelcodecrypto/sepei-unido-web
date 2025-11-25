import { supabase } from '../lib/supabase';

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
}

// Obtener todas las votaciones (admin)
export async function getAllVotaciones(): Promise<VotacionCompleta[]> {
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (error) {
    console.error('Error al obtener votaciones:', error);
    return [];
  }

  // Obtener opciones para cada votación
  const votacionesCompletas = await Promise.all(
    votaciones.map(async (votacion) => {
      const { data: opciones } = await supabase
        .from('opciones_votacion')
        .select('*')
        .eq('votacion_id', votacion.id)
        .order('orden');

      const { count } = await supabase
        .from('votos')
        .select('user_id', { count: 'exact', head: true })
        .eq('votacion_id', votacion.id);

      return {
        ...votacion,
        opciones: opciones || [],
        total_votos: count || 0
      };
    })
  );

  return votacionesCompletas;
}

// Obtener votaciones publicadas (público)
export async function getVotacionesPublicadas(): Promise<VotacionCompleta[]> {
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('*')
    .eq('publicado', true)
    .order('fecha_fin', { ascending: false });

  if (error) {
    console.error('Error al obtener votaciones publicadas:', error);
    return [];
  }

  const user = (await supabase.auth.getUser()).data.user;

  const votacionesCompletas = await Promise.all(
    votaciones.map(async (votacion) => {
      const { data: opciones } = await supabase
        .from('opciones_votacion')
        .select('*')
        .eq('votacion_id', votacion.id)
        .order('orden');

      const { count } = await supabase
        .from('votos')
        .select('user_id', { count: 'exact', head: true })
        .eq('votacion_id', votacion.id);

      let usuario_ya_voto = false;
      if (user) {
        const { data: votoData } = await supabase.rpc('usuario_ya_voto', {
          votacion_uuid: votacion.id,
          usuario_id: user.id
        });
        usuario_ya_voto = votoData || false;
      }

      return {
        ...votacion,
        opciones: opciones || [],
        total_votos: count || 0,
        usuario_ya_voto
      };
    })
  );

  return votacionesCompletas;
}

// Obtener votaciones activas
export async function getVotacionesActivas(): Promise<VotacionCompleta[]> {
  const now = new Date().toISOString();
  
  console.log('Buscando votaciones activas. Hora actual:', now);
  
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('*')
    .eq('publicado', true)
    .order('fecha_fin', { ascending: true });

  if (error) {
    console.error('Error al obtener votaciones activas:', error);
    return [];
  }

  if (!votaciones || votaciones.length === 0) {
    console.log('No hay votaciones publicadas');
    return [];
  }

  // Filtrar manualmente las votaciones activas
  const votacionesActivas = votaciones.filter(v => {
    const inicio = new Date(v.fecha_inicio);
    const fin = new Date(v.fecha_fin);
    const ahora = new Date();
    const esActiva = ahora >= inicio && ahora <= fin;
    console.log(`Votación "${v.titulo}": inicio=${v.fecha_inicio}, fin=${v.fecha_fin}, activa=${esActiva}`);
    return esActiva;
  });

  console.log(`Total votaciones activas: ${votacionesActivas.length}`);

  const user = (await supabase.auth.getUser()).data.user;

  const votacionesCompletas = await Promise.all(
    votacionesActivas.map(async (votacion) => {
      const { data: opciones } = await supabase
        .from('opciones_votacion')
        .select('*')
        .eq('votacion_id', votacion.id)
        .order('orden');

      const { count } = await supabase
        .from('votos')
        .select('user_id', { count: 'exact', head: true })
        .eq('votacion_id', votacion.id);

      let usuario_ya_voto = false;
      if (user) {
        const { data: votoData } = await supabase.rpc('usuario_ya_voto', {
          votacion_uuid: votacion.id,
          usuario_id: user.id
        });
        usuario_ya_voto = votoData || false;
      }

      return {
        ...votacion,
        opciones: opciones || [],
        total_votos: count || 0,
        usuario_ya_voto
      };
    })
  );

  return votacionesCompletas;
}

// Crear votación
export async function createVotacion(
  votacion: Omit<Votacion, 'id' | 'fecha_creacion' | 'activa'>,
  opciones: string[]
): Promise<string | null> {
  try {
    // Crear la votación
    const { data: nuevaVotacion, error: votacionError } = await supabase
      .from('votaciones')
      .insert([votacion])
      .select()
      .single();

    if (votacionError || !nuevaVotacion) {
      console.error('Error al crear votación:', votacionError);
      return null;
    }

    // Crear las opciones
    const opcionesData = opciones.map((texto, index) => ({
      votacion_id: nuevaVotacion.id,
      texto,
      orden: index
    }));

    const { error: opcionesError } = await supabase
      .from('opciones_votacion')
      .insert(opcionesData);

    if (opcionesError) {
      console.error('Error al crear opciones:', opcionesError);
      // Eliminar la votación si fallan las opciones
      await supabase.from('votaciones').delete().eq('id', nuevaVotacion.id);
      return null;
    }

    return nuevaVotacion.id;
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
    // Actualizar votación
    const { error: votacionError } = await supabase
      .from('votaciones')
      .update(votacion)
      .eq('id', id);

    if (votacionError) {
      console.error('Error al actualizar votación:', votacionError);
      return false;
    }

    // Si se proporcionan opciones, actualizarlas
    if (opciones) {
      // Eliminar opciones antiguas
      await supabase.from('opciones_votacion').delete().eq('votacion_id', id);

      // Insertar nuevas opciones
      const opcionesData = opciones.map((opcion, index) => ({
        votacion_id: id,
        texto: opcion.texto,
        orden: index
      }));

      const { error: opcionesError } = await supabase
        .from('opciones_votacion')
        .insert(opcionesData);

      if (opcionesError) {
        console.error('Error al actualizar opciones:', opcionesError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error al actualizar votación:', error);
    return false;
  }
}

// Eliminar votación
export async function deleteVotacion(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('votaciones')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error al eliminar votación:', error);
    return false;
  }

  return true;
}

// Emitir voto
export async function emitirVoto(
  votacion_id: string,
  opcion_ids: string[]
): Promise<boolean> {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.error('Usuario no autenticado');
      return false;
    }

    // Verificar que la votación permite múltiples respuestas si se envían varias
    if (opcion_ids.length > 1) {
      const { data: votacion } = await supabase
        .from('votaciones')
        .select('multiple_respuestas')
        .eq('id', votacion_id)
        .single();

      if (!votacion?.multiple_respuestas) {
        console.error('Esta votación no permite múltiples respuestas');
        return false;
      }
    }

    // Preparar los votos
    const votos = opcion_ids.map(opcion_id => ({
      votacion_id,
      opcion_id,
      user_id: user.id,
      user_email: user.email || ''
    }));

    const { error } = await supabase
      .from('votos')
      .insert(votos);

    if (error) {
      console.error('Error al emitir voto:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error al emitir voto:', error);
    return false;
  }
}

// Obtener resultados de votación
export async function getResultadosVotacion(
  votacion_id: string
): Promise<ResultadoVotacion[]> {
  const { data, error } = await supabase.rpc('obtener_resultados_votacion', {
    votacion_uuid: votacion_id
  });

  if (error) {
    console.error('Error al obtener resultados:', error);
    return [];
  }

  return data || [];
}

// Verificar si usuario ya votó
export async function usuarioYaVoto(
  votacion_id: string,
  user_id: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('usuario_ya_voto', {
    votacion_uuid: votacion_id,
    usuario_id: user_id
  });

  if (error) {
    console.error('Error al verificar voto:', error);
    return false;
  }

  return data || false;
}

// Toggle publicado
export async function togglePublicado(id: string, publicado: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('votaciones')
    .update({ publicado })
    .eq('id', id);

  if (error) {
    console.error('Error al cambiar estado de publicación:', error);
    return false;
  }

  return true;
}

// Toggle resultados públicos
export async function toggleResultadosPublicos(
  id: string,
  resultados_publicos: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('votaciones')
    .update({ resultados_publicos })
    .eq('id', id);

  if (error) {
    console.error('Error al cambiar visibilidad de resultados:', error);
    return false;
  }

  return true;
}
