/**
 * Backend del sistema de votaciones. Antes todo esto corría en el cliente contra
 * Supabase con la anon key (src/services/votingDatabase.ts) y las tablas tenían RLS
 * desactivado — cualquiera podía votar ilimitadas veces, votar por otra persona, o
 * borrar/editar votaciones ajenas desde la consola del navegador (ver auditoría
 * 2026-08-06). Aquí todo pasa por service_role, y la identidad del votante se deriva
 * siempre de la sesión validada server-side (api/_lib/session.ts) — nunca de un DNI
 * que mande el cliente en el body.
 *
 * Acciones públicas (sin autenticación):
 *   GET  ?action=active            — votaciones activas + opciones + usuario_ya_voto si hay sesión
 *   GET  ?action=published         — votaciones publicadas (todas, con estado) + resultados si son públicos
 *   GET  ?action=summary           — resumen simple: ¿hay alguna activa? ¿cuánto falta?
 *
 * Acciones de usuario autenticado (Authorization: Bearer <sessionToken>):
 *   POST ?action=vote              — { votacion_id, opcion_ids }
 *   GET  ?action=has-voted&votacion_id=X
 *
 * Acciones de admin (Authorization: Bearer <adminToken>):
 *   GET  ?action=admin-list
 *   POST ?action=admin-create      — { votacion, opciones }
 *   POST ?action=admin-update      — { id, votacion, opciones? }
 *   POST ?action=admin-delete      — { id }
 *   POST ?action=admin-toggle      — { id, field: 'publicado'|'resultados_publicos', value }
 */
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { getBearerToken, verifyAdminToken } from './_lib/adminAuth.js';
import { getSessionUser } from './_lib/session.js';

type Supa = ReturnType<typeof getSupabaseAdmin>;

function calcularEstado(fechaInicio: string, fechaFin: string): 'activa' | 'finalizada' | 'programada' {
  const ahora = new Date();
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (ahora < inicio) return 'programada';
  if (ahora > fin) return 'finalizada';
  return 'activa';
}

async function contarParticipantes(supabase: Supa, votacionId: string): Promise<number> {
  const { count } = await supabase
    .from('voto_participaciones')
    .select('id', { count: 'exact', head: true })
    .eq('votacion_id', votacionId);
  return count || 0;
}

async function obtenerResultados(supabase: Supa, votacionId: string) {
  const { data, error } = await (supabase as any).rpc('obtener_resultados_votacion', { votacion_uuid: votacionId });
  if (error) {
    console.error('[voting] Error al obtener resultados:', error);
    return [];
  }
  return data || [];
}

async function haVotado(supabase: Supa, votacionId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('voto_participaciones')
    .select('id')
    .eq('votacion_id', votacionId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

async function withOpciones(supabase: Supa, votaciones: any[]) {
  return Promise.all(
    votaciones.map(async (v) => {
      const { data: opciones } = await supabase
        .from('opciones_votacion')
        .select('*')
        .eq('votacion_id', v.id)
        .order('orden');
      return { ...v, opciones: opciones || [] };
    })
  );
}

// ---- action=active ----
async function handleActive(req: any, res: any, supabase: Supa) {
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('*')
    .eq('publicado', true)
    .order('fecha_fin', { ascending: true });

  if (error) return res.status(500).json({ error: 'Error al consultar votaciones' });

  const activas = (votaciones || []).filter((v: any) => calcularEstado(v.fecha_inicio, v.fecha_fin) === 'activa');
  const conOpciones = await withOpciones(supabase, activas);

  const sessionUser = await getSessionUser(req);

  const completas = await Promise.all(
    conOpciones.map(async (v: any) => ({
      ...v,
      total_votos: await contarParticipantes(supabase, v.id),
      usuario_ya_voto: sessionUser ? await haVotado(supabase, v.id, sessionUser.dni.toUpperCase()) : false,
    }))
  );

  return res.status(200).json({ votaciones: completas });
}

// ---- action=published ----
async function handlePublished(req: any, res: any, supabase: Supa) {
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('*')
    .eq('publicado', true)
    .order('fecha_fin', { ascending: false });

  if (error) return res.status(500).json({ error: 'Error al consultar votaciones' });

  const conOpciones = await withOpciones(supabase, votaciones || []);
  const sessionUser = await getSessionUser(req);

  const completas = await Promise.all(
    conOpciones.map(async (v: any) => {
      const estado = calcularEstado(v.fecha_inicio, v.fecha_fin);
      const resultados = v.resultados_publicos ? await obtenerResultados(supabase, v.id) : [];
      return {
        ...v,
        estado,
        total_votos: await contarParticipantes(supabase, v.id),
        usuario_ya_voto: sessionUser ? await haVotado(supabase, v.id, sessionUser.dni.toUpperCase()) : false,
        votos: resultados.map((r: any) => ({ opcion: r.texto, votos: r.total_votos })),
      };
    })
  );

  return res.status(200).json({ votaciones: completas });
}

// ---- action=summary ----
async function handleSummary(req: any, res: any, supabase: Supa) {
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('titulo, fecha_inicio, fecha_fin')
    .eq('publicado', true)
    .order('fecha_fin', { ascending: true });

  if (error || !votaciones || votaciones.length === 0) {
    return res.status(200).json({ hasActiveVotings: false, daysRemaining: 0, closestVoting: null });
  }

  const activas = votaciones.filter((v: any) => calcularEstado(v.fecha_inicio, v.fecha_fin) === 'activa');
  if (activas.length === 0) {
    return res.status(200).json({ hasActiveVotings: false, daysRemaining: 0, closestVoting: null });
  }

  const closest = activas[0] as any;
  const diasRestantes = Math.max(0, Math.ceil((new Date(closest.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return res.status(200).json({
    hasActiveVotings: true,
    daysRemaining: diasRestantes,
    closestVoting: { titulo: closest.titulo, fecha_fin: closest.fecha_fin },
  });
}

// ---- action=has-voted ----
async function handleHasVoted(req: any, res: any, supabase: Supa) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'No autenticado' });

  const votacionId = req.query?.votacion_id;
  if (!votacionId) return res.status(400).json({ error: 'Falta votacion_id' });

  const yaVoto = await haVotado(supabase, votacionId, sessionUser.dni.toUpperCase());
  return res.status(200).json({ yaVoto });
}

// ---- action=vote ----
async function handleVote(req: any, res: any, supabase: Supa) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return res.status(401).json({ error: 'Debes iniciar sesión para votar' });
  if (!sessionUser.verified) return res.status(403).json({ error: 'Tu cuenta aún no está verificada' });
  if (!sessionUser.autorizado_votar) return res.status(403).json({ error: 'No estás autorizado por el administrador para votar' });

  const { votacion_id, opcion_ids } = req.body || {};
  if (!votacion_id || !Array.isArray(opcion_ids) || opcion_ids.length === 0) {
    return res.status(400).json({ error: 'Faltan votacion_id u opcion_ids' });
  }

  const { data: votacion, error: votacionError } = await supabase
    .from('votaciones')
    .select('multiple_respuestas, publicado, fecha_inicio, fecha_fin')
    .eq('id', votacion_id)
    .maybeSingle();

  if (votacionError || !votacion) return res.status(404).json({ error: 'Votación no encontrada' });
  if (!(votacion as any).publicado) return res.status(403).json({ error: 'Votación no publicada' });

  const estado = calcularEstado((votacion as any).fecha_inicio, (votacion as any).fecha_fin);
  if (estado === 'programada') return res.status(403).json({ error: 'La votación aún no ha comenzado' });
  if (estado === 'finalizada') return res.status(403).json({ error: 'La votación ha finalizado' });

  if (opcion_ids.length > 1 && !(votacion as any).multiple_respuestas) {
    return res.status(400).json({ error: 'Esta votación no permite múltiples respuestas' });
  }

  // Las opciones marcadas deben pertenecer realmente a esta votación (si no, cualquiera
  // podría mezclar un opcion_id de otra votación y contaminar sus resultados).
  const { data: opcionesValidas, error: opcionesError } = await supabase
    .from('opciones_votacion')
    .select('id')
    .eq('votacion_id', votacion_id)
    .in('id', opcion_ids);

  if (opcionesError || !opcionesValidas || opcionesValidas.length !== opcion_ids.length) {
    return res.status(400).json({ error: 'Opción inválida para esta votación' });
  }

  const dniNormalizado = sessionUser.dni.toUpperCase();

  const { data: participacion, error: participacionError } = await supabase
    .from('voto_participaciones')
    .insert({ votacion_id, user_id: dniNormalizado } as any)
    .select()
    .single();

  if (participacionError) {
    if ((participacionError as any).code === '23505') {
      return res.status(409).json({ error: 'Ya has votado en esta votación' });
    }
    console.error('[voting] Error al registrar participación:', participacionError);
    return res.status(500).json({ error: 'Error al registrar el voto' });
  }

  const detalle = opcion_ids.map((opcion_id: string) => ({
    votacion_id,
    opcion_id,
    participacion_id: (participacion as any).id,
  }));

  const { error: detalleError } = await supabase.from('votos').insert(detalle as any);

  if (detalleError) {
    // Compensar: sin la participación, el usuario podría quedar bloqueado para siempre
    // sin haber votado realmente.
    await supabase.from('voto_participaciones').delete().eq('id', (participacion as any).id);
    console.error('[voting] Error al registrar detalle de voto:', detalleError);
    return res.status(500).json({ error: 'Error al registrar el voto' });
  }

  return res.status(200).json({ success: true });
}

// ---- admin: list ----
async function handleAdminList(req: any, res: any, supabase: Supa) {
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (error) return res.status(500).json({ error: 'Error al consultar votaciones' });

  const conOpciones = await withOpciones(supabase, votaciones || []);
  const completas = await Promise.all(
    conOpciones.map(async (v: any) => ({ ...v, total_votos: await contarParticipantes(supabase, v.id) }))
  );

  return res.status(200).json({ votaciones: completas });
}

// ---- admin: create ----
async function handleAdminCreate(req: any, res: any, supabase: Supa) {
  const { votacion, opciones } = req.body || {};
  if (!votacion || !Array.isArray(opciones) || opciones.length === 0) {
    return res.status(400).json({ error: 'Faltan datos de la votación u opciones' });
  }

  const { data: nueva, error: votacionError } = await supabase
    .from('votaciones')
    .insert(votacion as any)
    .select()
    .single();

  if (votacionError || !nueva) {
    console.error('[voting] Error al crear votación:', votacionError);
    return res.status(500).json({ error: 'Error al crear la votación' });
  }

  const opcionesData = opciones.map((texto: string, index: number) => ({
    votacion_id: (nueva as any).id,
    texto,
    orden: index,
  }));

  const { error: opcionesError } = await supabase.from('opciones_votacion').insert(opcionesData as any);

  if (opcionesError) {
    await supabase.from('votaciones').delete().eq('id', (nueva as any).id);
    console.error('[voting] Error al crear opciones:', opcionesError);
    return res.status(500).json({ error: 'Error al crear las opciones' });
  }

  return res.status(200).json({ id: (nueva as any).id });
}

// ---- admin: update ----
async function handleAdminUpdate(req: any, res: any, supabase: Supa) {
  const { id, votacion, opciones } = req.body || {};
  if (!id || !votacion) return res.status(400).json({ error: 'Faltan datos' });

  const { error: votacionError } = await (supabase.from('votaciones') as any).update(votacion).eq('id', id);
  if (votacionError) {
    console.error('[voting] Error al actualizar votación:', votacionError);
    return res.status(500).json({ error: 'Error al actualizar la votación' });
  }

  if (Array.isArray(opciones)) {
    await supabase.from('opciones_votacion').delete().eq('votacion_id', id);
    const opcionesData = opciones.map((o: any, index: number) => ({
      votacion_id: id,
      texto: o.texto,
      orden: index,
    }));
    const { error: opcionesError } = await supabase.from('opciones_votacion').insert(opcionesData as any);
    if (opcionesError) {
      console.error('[voting] Error al actualizar opciones:', opcionesError);
      return res.status(500).json({ error: 'Error al actualizar las opciones' });
    }
  }

  return res.status(200).json({ success: true });
}

// ---- admin: delete ----
async function handleAdminDelete(req: any, res: any, supabase: Supa) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Falta id' });

  const { error } = await supabase.from('votaciones').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Error al eliminar la votación' });

  return res.status(200).json({ success: true });
}

// ---- admin: toggle ----
async function handleAdminToggle(req: any, res: any, supabase: Supa) {
  const { id, field, value } = req.body || {};
  if (!id || (field !== 'publicado' && field !== 'resultados_publicos') || typeof value !== 'boolean') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const { error } = await (supabase.from('votaciones') as any).update({ [field]: value }).eq('id', id);
  if (error) return res.status(500).json({ error: 'Error al actualizar la votación' });

  return res.status(200).json({ success: true });
}

// ---- admin: results (para el panel, aunque resultados_publicos sea false) ----
async function handleAdminResults(req: any, res: any, supabase: Supa) {
  const votacionId = req.query?.votacion_id;
  if (!votacionId) return res.status(400).json({ error: 'Falta votacion_id' });

  const resultados = await obtenerResultados(supabase, votacionId);
  return res.status(200).json({ resultados });
}

// ---- action=results (público, solo si resultados_publicos=true) ----
async function handleResults(req: any, res: any, supabase: Supa) {
  const votacionId = req.query?.votacion_id;
  if (!votacionId) return res.status(400).json({ error: 'Falta votacion_id' });

  const { data: votacion } = await supabase
    .from('votaciones')
    .select('resultados_publicos')
    .eq('id', votacionId)
    .maybeSingle();

  if (!votacion || !(votacion as any).resultados_publicos) {
    return res.status(403).json({ error: 'Los resultados de esta votación no son públicos' });
  }

  const resultados = await obtenerResultados(supabase, votacionId);
  return res.status(200).json({ resultados });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action;
  const supabase = getSupabaseAdmin();

  try {
    switch (action) {
      case 'active':
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await handleActive(req, res, supabase);

      case 'published':
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await handlePublished(req, res, supabase);

      case 'summary':
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await handleSummary(req, res, supabase);

      case 'results':
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await handleResults(req, res, supabase);

      case 'has-voted':
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await handleHasVoted(req, res, supabase);

      case 'vote':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        return await handleVote(req, res, supabase);

      case 'admin-list':
      case 'admin-create':
      case 'admin-update':
      case 'admin-delete':
      case 'admin-toggle':
      case 'admin-results': {
        if (!verifyAdminToken(getBearerToken(req))) return res.status(401).json({ error: 'No autorizado' });
        if (action === 'admin-list') return await handleAdminList(req, res, supabase);
        if (action === 'admin-results') return await handleAdminResults(req, res, supabase);
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        if (action === 'admin-create') return await handleAdminCreate(req, res, supabase);
        if (action === 'admin-update') return await handleAdminUpdate(req, res, supabase);
        if (action === 'admin-delete') return await handleAdminDelete(req, res, supabase);
        return await handleAdminToggle(req, res, supabase);
      }

      default:
        return res.status(400).json({ error: 'Acción no reconocida' });
    }
  } catch (error: any) {
    console.error(`[voting] Error en action=${action}:`, error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
