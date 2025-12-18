import { supabase } from '../lib/supabase';
import { getCurrentUser } from './sessionService';

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

      // Obtener resultados detallados por opción
      const resultados = await getResultadosVotacion(votacion.id);
      const votos = resultados.map(r => ({
        opcion: r.texto,
        votos: r.total_votos
      }));

      // Calcular estado de la votación
      const now = new Date();
      const inicio = new Date(votacion.fecha_inicio);
      const fin = new Date(votacion.fecha_fin);
      let estado: 'activa' | 'finalizada' | 'programada';
      
      if (now < inicio) {
        estado = 'programada';
      } else if (now >= inicio && now <= fin) {
        estado = 'activa';
      } else {
        estado = 'finalizada';
      }

      let usuario_ya_voto = false;
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const { data: existingVote } = await supabase
          .from('votos')
          .select('id')
          .eq('votacion_id', votacion.id)
          .eq('user_id', currentUser.dni)
          .single();
        usuario_ya_voto = !!existingVote;
      }

      return {
        ...votacion,
        opciones: opciones || [],
        total_votos: count || 0,
        usuario_ya_voto,
        votos: votos,
        estado: estado
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
  const ahora = new Date();
  const votacionesActivas = votaciones.filter(v => {
    const inicio = new Date(v.fecha_inicio);
    const fin = new Date(v.fecha_fin);
    const esActiva = ahora >= inicio && ahora <= fin;
    
    const minutosHastaInicio = Math.round((inicio.getTime() - ahora.getTime()) / 60000);
    const minutosHastaFin = Math.round((fin.getTime() - ahora.getTime()) / 60000);
    
    console.log(`🗳️ [VOTACIÓN] "${v.titulo}":`, {
      inicio_local: inicio.toLocaleString('es-ES'),
      fin_local: fin.toLocaleString('es-ES'),
      ahora_local: ahora.toLocaleString('es-ES'),
      tiempo_hasta_inicio: minutosHastaInicio > 0 ? `Faltan ${minutosHastaInicio} minutos` : `Empezó hace ${Math.abs(minutosHastaInicio)} minutos`,
      tiempo_hasta_fin: minutosHastaFin > 0 ? `Quedan ${minutosHastaFin} minutos` : 'Finalizada',
      estado: esActiva ? '✅ ACTIVA' : '❌ NO ACTIVA'
    });
    
    return esActiva;
  });

  console.log(`📊 [RESUMEN] Votaciones activas encontradas: ${votacionesActivas.length} de ${votaciones.length}`);

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
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const { data: existingVote } = await supabase
          .from('votos')
          .select('id')
          .eq('votacion_id', votacion.id)
          .eq('user_id', currentUser.dni)
          .single();
        usuario_ya_voto = !!existingVote;
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

// Verificar si hay votaciones activas y obtener días restantes
export async function checkActiveVotings(): Promise<{
  hasActiveVotings: boolean;
  daysRemaining: number;
  closestVoting: { titulo: string; fecha_fin: string } | null;
}> {
  const now = new Date().toISOString();
  
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('titulo, fecha_inicio, fecha_fin')
    .eq('publicado', true)
    .order('fecha_fin', { ascending: true });

  if (error || !votaciones || votaciones.length === 0) {
    return { hasActiveVotings: false, daysRemaining: 0, closestVoting: null };
  }

  // Filtrar votaciones activas
  const ahora = new Date();
  const votacionesActivas = votaciones.filter(v => {
    const inicio = new Date(v.fecha_inicio);
    const fin = new Date(v.fecha_fin);
    return ahora >= inicio && ahora <= fin;
  });

  if (votacionesActivas.length === 0) {
    return { hasActiveVotings: false, daysRemaining: 0, closestVoting: null };
  }

  // Obtener la votación que cierra más pronto
  const closestVoting = votacionesActivas[0];
  const fechaFin = new Date(closestVoting.fecha_fin);
  const diffTime = fechaFin.getTime() - ahora.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    hasActiveVotings: true,
    daysRemaining: Math.max(0, daysRemaining),
    closestVoting: {
      titulo: closestVoting.titulo,
      fecha_fin: closestVoting.fecha_fin
    }
  };
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

// Emitir voto con validación de seguridad estricta
export async function emitirVoto(
  votacion_id: string,
  opcion_ids: string[]
): Promise<boolean> {
  try {
    // 1. VALIDAR AUTENTICACIÓN
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('❌ [VOTO] Usuario no autenticado');
      return false;
    }

    if (!currentUser.dni || !currentUser.email || !currentUser.verified) {
      console.error('❌ [VOTO] Usuario inválido o no verificado');
      return false;
    }

    console.log('👤 [VOTO] Usuario votando:', currentUser.dni, currentUser.email);

    // 1.5 VERIFICAR AUTORIZACIÓN PARA VOTAR
    if (!currentUser.autorizado_votar) {
      console.warn('⚠️ [VOTO] Usuario no autorizado para votar');
      return false;
    }

    if (!currentUser.autorizado_votar) {
      console.warn('⚠️ [VOTO] Usuario no autorizado para votar por el administrador');
      return false;
    }

    console.log('✅ [VOTO] Usuario autorizado para votar');

    // 2. VERIFICAR SI YA VOTÓ (PREVENCIÓN DE VOTO DUPLICADO)
    const dniNormalizado = currentUser.dni.toUpperCase();
    console.log('🔍 [VOTO] Verificando voto previo con DNI:', dniNormalizado);
    
    const { data: votosExistentes, error: checkError } = await supabase
      .from('votos')
      .select('id')
      .eq('votacion_id', votacion_id)
      .eq('user_id', dniNormalizado)
      .limit(1);

    if (checkError) {
      console.error('❌ [VOTO] Error al verificar voto previo:', checkError);
      return false;
    }

    if (votosExistentes && votosExistentes.length > 0) {
      console.warn('⚠️ [VOTO] El usuario ya votó en esta votación');
      return false;
    }

    console.log('✅ [VOTO] Usuario no ha votado aún, procediendo...');

    // 3. VALIDAR CONFIGURACIÓN DE VOTACIÓN
    const { data: votacion, error: votacionError } = await supabase
      .from('votaciones')
      .select('multiple_respuestas, publicado, fecha_inicio, fecha_fin')
      .eq('id', votacion_id)
      .single();

    if (votacionError || !votacion) {
      console.error('❌ [VOTO] Votación no encontrada');
      return false;
    }

    // Verificar que la votación está publicada
    if (!votacion.publicado) {
      console.error('❌ [VOTO] Votación no publicada');
      return false;
    }

    // Verificar que estamos en el período de votación
    const ahora = new Date();
    const inicio = new Date(votacion.fecha_inicio);
    const fin = new Date(votacion.fecha_fin);

    if (ahora < inicio) {
      console.error('❌ [VOTO] La votación aún no ha comenzado');
      return false;
    }

    if (ahora > fin) {
      console.error('❌ [VOTO] La votación ha finalizado');
      return false;
    }

    // Verificar múltiples respuestas
    if (opcion_ids.length > 1 && !votacion.multiple_respuestas) {
      console.error('❌ [VOTO] Esta votación no permite múltiples respuestas');
      return false;
    }

    if (opcion_ids.length === 0) {
      console.error('❌ [VOTO] Debe seleccionar al menos una opción');
      return false;
    }

    console.log('✅ [VOTO] Validaciones pasadas, registrando voto...');

    // 4. PREPARAR VOTOS
    const votos = opcion_ids.map(opcion_id => ({
      votacion_id,
      opcion_id,
      user_id: dniNormalizado, // DNI normalizado a mayúsculas
      user_email: currentUser.email,
      fecha_voto: new Date().toISOString()
    }));

    // 5. INSERTAR VOTO (la constraint UNIQUE en la BD previene duplicados)
    const { error: insertError } = await supabase
      .from('votos')
      .insert(votos);

    if (insertError) {
      // Si el error es por duplicate key, significa que ya votó
      if (insertError.code === '23505') {
        console.error('⚠️ [VOTO] Intento de voto duplicado detectado por la base de datos');
        return false;
      }
      console.error('❌ [VOTO] Error al emitir voto:', insertError);
      return false;
    }

    console.log('✅ [VOTO] Voto registrado correctamente y de forma segura');
    return true;
  } catch (error) {
    console.error('❌ [VOTO] Error al emitir voto:', error);
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

// Verificar si el usuario ya votó en una votación específica
export async function usuarioYaVoto(votacion_id: string): Promise<boolean> {
  try {
    // Obtener usuario autenticado desde sesión en Supabase
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('❌ [VERIFICACIÓN VOTO] Usuario no autenticado');
      return false; // No autenticado = no puede haber votado
    }

    if (!currentUser.dni) {
      console.error('❌ [VERIFICACIÓN VOTO] Usuario sin DNI');
      return false;
    }

    const dniNormalizado = currentUser.dni.toUpperCase();
    console.log('🔍 [VERIFICACIÓN VOTO] Verificando si votó:', dniNormalizado, 'en votación:', votacion_id);

    // Consultar directamente la tabla votos usando el DNI del usuario
    const { data, error } = await supabase
      .from('votos')
      .select('id')
      .eq('votacion_id', votacion_id)
      .eq('user_id', dniNormalizado)
      .limit(1);

    if (error) {
      console.error('❌ [VERIFICACIÓN VOTO] Error al verificar voto:', error);
      return false;
    }

    const yaVoto = data && data.length > 0;
    console.log(yaVoto ? '✅ [VERIFICACIÓN VOTO] Usuario YA votó' : '❌ [VERIFICACIÓN VOTO] Usuario NO ha votado');
    
    return yaVoto;
  } catch (error) {
    console.error('❌ [VERIFICACIÓN VOTO] Error:', error);
    return false;
  }
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
