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
 *   POST ?action=admin-update      — { id, votacion, opciones?, confirmar_reinicio? }
 *                                    409 si cambiar las opciones anularía votos ya emitidos
 *                                    y no se ha confirmado
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

/**
 * Recibos de participación que se quedaron sin ningún voto detrás.
 *
 * No debería existir ninguno: la única forma de crearlos era editar una votación
 * ya votada, porque al borrar y recrear las opciones el `ON DELETE CASCADE` de
 * `votos.opcion_id` se llevaba el detalle mientras el recibo (que cuelga de la
 * votación, no de la opción) sobrevivía. Resultado: el votante quedaba bloqueado
 * ("ya has votado") y su voto no se contaba en ningún sitio. Pasó de verdad el
 * 2026-09-15 con la votación de prueba.
 *
 * Se cuentan en dos consultas globales en vez de dos por votación porque
 * `admin-list` ya hacía una por votación solo para el total.
 */
async function contarPorVotacion(supabase: Supa) {
  const [{ data: participaciones }, { data: detalle }] = await Promise.all([
    supabase.from('voto_participaciones').select('id, votacion_id'),
    supabase.from('votos').select('participacion_id'),
  ]);

  const conVoto = new Set((detalle || []).map((v: any) => v.participacion_id));
  const totales = new Map<string, number>();
  const huerfanos = new Map<string, number>();

  for (const p of (participaciones || []) as any[]) {
    totales.set(p.votacion_id, (totales.get(p.votacion_id) || 0) + 1);
    if (!conVoto.has(p.id)) huerfanos.set(p.votacion_id, (huerfanos.get(p.votacion_id) || 0) + 1);
  }

  return { totales, huerfanos };
}

/**
 * Compara las opciones que manda el panel con las que ya hay guardadas. Si son
 * las mismas, editar la votación no debe tocarlas: borrarlas y recrearlas
 * destruye los votos emitidos aunque el admin solo haya cambiado una fecha.
 */
function mismasOpciones(actuales: any[], entrantes: any[]): boolean {
  if (actuales.length !== entrantes.length) return false;
  return actuales.every((o: any, i: number) => String(o.texto).trim() === String(entrantes[i]?.texto ?? '').trim());
}

/**
 * Las mismas opciones en otro orden. Reordenar la papeleta no cambia lo que votó
 * nadie, así que no puede costar la anulación de los votos: basta con reescribir
 * la columna `orden` de las opciones que ya existen.
 *
 * Con textos repetidos no se puede emparejar cuál es cuál, así que ahí se
 * responde que no y el cambio pasa por el camino normal (reinicio confirmado).
 */
function soloReordenadas(actuales: any[], entrantes: any[]): boolean {
  if (actuales.length !== entrantes.length) return false;
  const norm = (v: any) => String(v ?? '').trim();
  const a = actuales.map((o: any) => norm(o.texto)).sort();
  const b = entrantes.map((o: any) => norm(o.texto)).sort();
  if (new Set(a).size !== a.length) return false;
  return a.every((texto, i) => texto === b[i]);
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
// Devuelve QUÉ votación cierra antes, no cuánto le queda: el contador se calcula
// en el cliente (`src/utils/tiempoRestante.ts`) a partir de esta `fecha_fin`.
// Cuando se calculaba también aquí (redondeando a días hacia arriba), la tarjeta
// de la votación y el badge del botón flotante se contradecían en pantalla.
async function handleSummary(req: any, res: any, supabase: Supa) {
  const { data: votaciones, error } = await supabase
    .from('votaciones')
    .select('titulo, fecha_inicio, fecha_fin')
    .eq('publicado', true)
    .order('fecha_fin', { ascending: true });

  if (error || !votaciones || votaciones.length === 0) {
    return res.status(200).json({ hasActiveVotings: false, closestVoting: null });
  }

  const activas = votaciones.filter((v: any) => calcularEstado(v.fecha_inicio, v.fecha_fin) === 'activa');
  if (activas.length === 0) {
    return res.status(200).json({ hasActiveVotings: false, closestVoting: null });
  }

  const closest = activas[0] as any;

  return res.status(200).json({
    hasActiveVotings: true,
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
  const { totales, huerfanos } = await contarPorVotacion(supabase);
  const completas = conOpciones.map((v: any) => ({
    ...v,
    total_votos: totales.get(v.id) || 0,
    // El panel lo enseña en rojo: es la señal de que una edición anuló votos sin
    // liberar a quien los emitió. Con el flujo nuevo debería ser siempre 0.
    participaciones_sin_voto: huerfanos.get(v.id) || 0,
  }));

  return res.status(200).json({ votaciones: completas });
}

// ---- admin: create ----
async function handleAdminCreate(req: any, res: any, supabase: Supa) {
  const { votacion, opciones } = req.body || {};
  if (!votacion || !Array.isArray(opciones) || opciones.length === 0) {
    return res.status(400).json({ error: 'Faltan datos de la votación u opciones' });
  }

  // El panel admin es una sola cuenta sin identidad propia (el token solo lleva
  // caducidad), así que el autor lo pone el servidor y se ignora lo que mande el
  // cliente — el formulario no tiene ese campo y enviaba siempre cadena vacía.
  // Mismo literal que usan los anuncios, para que la autoría se lea igual.
  const nuevaVotacion = { ...votacion, creado_por: 'Administrador' };

  const { data: nueva, error: votacionError } = await supabase
    .from('votaciones')
    .insert(nuevaVotacion as any)
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
//
// Editar una votación NO puede destruir votos por sorpresa. Antes esta función
// borraba y recreaba las opciones en cada guardado, así que cambiar solo el
// título o la fecha borraba el detalle de los votos ya emitidos (CASCADE desde
// `opciones_votacion`) y dejaba vivos los recibos de `voto_participaciones`: la
// gente que ya había votado quedaba bloqueada y su voto no contaba en ninguna
// parte. Ahora:
//   1. Si las opciones no han cambiado, no se tocan.
//   2. Si cambian y ya hay participaciones, hace falta `confirmar_reinicio` (el
//      panel lo pide por pantalla). Sin confirmar, 409 y no se escribe nada.
//   3. Al confirmar se borran también los recibos, no solo el detalle: o hay
//      recibo con voto, o no hay recibo. El estado intermedio no vuelve a existir.
async function handleAdminUpdate(req: any, res: any, supabase: Supa) {
  const { id, votacion, opciones, confirmar_reinicio } = req.body || {};
  if (!id || !votacion) return res.status(400).json({ error: 'Faltan datos' });

  const cambiarOpciones = Array.isArray(opciones);
  let opcionesCambian = false;
  let reordenar = false;

  if (cambiarOpciones) {
    const { data: actuales, error: actualesError } = await supabase
      .from('opciones_votacion')
      .select('texto, orden')
      .eq('votacion_id', id)
      .order('orden');

    if (actualesError) {
      console.error('[voting] Error al leer las opciones actuales:', actualesError);
      return res.status(500).json({ error: 'Error al actualizar la votación' });
    }

    opcionesCambian = !mismasOpciones(actuales || [], opciones);

    // Caso intermedio: las mismas opciones en otro orden. Se reordenan en sitio
    // (mismos ids, mismos votos) en vez de borrarlas y recrearlas.
    if (opcionesCambian && soloReordenadas(actuales || [], opciones)) {
      opcionesCambian = false;
      reordenar = true;
    }
  }

  // La comprobación va antes de cualquier escritura: si hace falta confirmar, el
  // guardado se aborta entero y el título no queda cambiado a medias.
  let participaciones = 0;
  if (opcionesCambian) {
    participaciones = await contarParticipantes(supabase, id);
    if (participaciones > 0 && confirmar_reinicio !== true) {
      return res.status(409).json({
        error: 'Cambiar las opciones anularía los votos ya emitidos',
        requiere_confirmacion: true,
        participaciones,
      });
    }
  }

  // La autoría la fija el servidor al crear; editar no la reescribe (el
  // formulario llegó a mandarla vacía y borraba el valor bueno).
  const { creado_por: _ignorado, ...cambios } = votacion;

  const { error: votacionError } = await (supabase.from('votaciones') as any).update(cambios).eq('id', id);
  if (votacionError) {
    console.error('[voting] Error al actualizar votación:', votacionError);
    return res.status(500).json({ error: 'Error al actualizar la votación' });
  }

  if (reordenar) {
    for (const [index, o] of opciones.entries()) {
      const { error: ordenError } = await (supabase.from('opciones_votacion') as any)
        .update({ orden: index })
        .eq('votacion_id', id)
        .eq('texto', o.texto);
      if (ordenError) {
        console.error('[voting] Error al reordenar las opciones:', ordenError);
        return res.status(500).json({ error: 'Error al actualizar las opciones' });
      }
    }
  }

  if (opcionesCambian) {
    if (participaciones > 0) {
      // Primero los recibos: su CASCADE se lleva el detalle asociado. Si esto
      // fallara y siguiéramos, volveríamos a dejar recibos sin voto.
      const { error: reinicioError } = await supabase.from('voto_participaciones').delete().eq('votacion_id', id);
      if (reinicioError) {
        console.error('[voting] Error al reiniciar la participación:', reinicioError);
        return res.status(500).json({ error: 'Error al reiniciar los votos de la votación' });
      }
      console.warn(`[voting] Votación ${id}: opciones cambiadas, ${participaciones} participaciones anuladas a petición del admin`);
    }

    await supabase.from('opciones_votacion').delete().eq('votacion_id', id);
    const opcionesData = opciones.map((o: any, index: number) => ({
      votacion_id: id,
      texto: o.texto,
      orden: index,
    }));
    const { error: opcionesError } = await supabase.from('opciones_votacion').insert(opcionesData as any);
    if (opcionesError) {
      console.error('[voting] Error al actualizar las opciones:', opcionesError);
      return res.status(500).json({ error: 'Error al actualizar las opciones' });
    }
  }

  return res.status(200).json({ success: true, votos_anulados: opcionesCambian ? participaciones : 0 });
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

  // Una votación que no existe no es "no pública": decir 403 ahí mandaba al panel
  // (y a cualquiera) a buscar un permiso que no era el problema. El id no es
  // secreto — se ve en la propia página pública —, así que distinguirlos no
  // filtra nada que no se supiera ya.
  if (!votacion) {
    return res.status(404).json({ error: 'Votación no encontrada' });
  }

  if (!(votacion as any).resultados_publicos) {
    return res.status(403).json({ error: 'Los resultados de esta votación no son públicos' });
  }

  const resultados = await obtenerResultados(supabase, votacionId);
  return res.status(200).json({ resultados });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.sepeiunido.org');
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
