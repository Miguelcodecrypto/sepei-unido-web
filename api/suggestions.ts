/**
 * Backend de sugerencias/propuestas. Antes `suggestionDatabase.ts` leía y escribía
 * la tabla `suggestions` directo con la anon key: cualquiera podía llamar
 * getAllSuggestions() desde la consola del navegador y leer nombre, apellidos,
 * email y teléfono de todas las sugerencias enviadas por cualquiera — sin RLS que
 * lo impidiera (ver auditoría 2026-08-06). Aquí la creación es pública (cualquiera
 * puede enviar una sugerencia, como antes) pero leer/borrar solo lo puede hacer un
 * admin autenticado.
 */
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { getBearerToken, verifyAdminToken } from './_lib/adminAuth.js';

const CATEGORIAS = ['bombero', 'cabo', 'sargento', 'suboficial', 'oficial'];
const LUGARES = ['Villarrobledo', 'Hellín', 'Almansa', 'La Roda', 'Alcaraz', 'Molinicos', 'Casas Ibáñez'];

function isNonEmptyString(v: any): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

async function handleCreate(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { nombre, apellidos, email, telefono, categoria, lugar_trabajo, asunto, descripcion } = req.body || {};

  if (!isNonEmptyString(nombre) || !isNonEmptyString(apellidos) || !isNonEmptyString(email)
    || !isNonEmptyString(telefono) || !isNonEmptyString(asunto) || !isNonEmptyString(descripcion)) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!CATEGORIAS.includes(categoria)) return res.status(400).json({ error: 'Categoría no válida' });
  if (!LUGARES.includes(lugar_trabajo)) return res.status(400).json({ error: 'Lugar de trabajo no válido' });

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      nombre: String(nombre).trim(),
      apellidos: String(apellidos).trim(),
      email: String(email).trim().toLowerCase(),
      telefono: String(telefono).trim(),
      categoria,
      lugar_trabajo,
      asunto: String(asunto).trim(),
      descripcion: String(descripcion).trim(),
    } as any)
    .select()
    .single();

  if (error) {
    console.error('[suggestions] Error al crear sugerencia:', error);
    return res.status(500).json({ error: 'Error al enviar la sugerencia' });
  }

  return res.status(200).json({ suggestion: data });
}

async function handleList(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .order('fecha_registro', { ascending: false });

  if (error) {
    console.error('[suggestions] Error al listar sugerencias:', error);
    return res.status(500).json({ error: 'Error al obtener sugerencias' });
  }

  return res.status(200).json({ suggestions: data || [] });
}

async function handleDelete(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Falta id' });

  const { error } = await supabase.from('suggestions').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Error al eliminar la sugerencia' });

  return res.status(200).json({ success: true });
}

async function handleClear(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { error } = await supabase.from('suggestions').delete().not('id', 'is', null);
  if (error) return res.status(500).json({ error: 'Error al limpiar las sugerencias' });

  return res.status(200).json({ success: true });
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
    if (action === 'create') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      return await handleCreate(req, res, supabase);
    }

    if (action === 'list' || action === 'delete' || action === 'clear') {
      if (!verifyAdminToken(getBearerToken(req))) return res.status(401).json({ error: 'No autorizado' });
      if (action === 'list') return await handleList(req, res, supabase);
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      if (action === 'delete') return await handleDelete(req, res, supabase);
      return await handleClear(req, res, supabase);
    }

    return res.status(400).json({ error: 'Acción no reconocida' });
  } catch (error: any) {
    console.error(`[suggestions] Error en action=${action}:`, error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
