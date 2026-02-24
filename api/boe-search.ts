/**
 * BOE Search API — Motor de búsqueda de convocatorias de bomberos
 * Vercel Serverless Function
 *
 * Consulta el buscador oficial del BOE (www.boe.es) de forma server-side,
 * evitando restricciones CORS, y parsea los resultados filtrando por
 * términos relacionados con oposiciones de bomberos.
 */

const BOE_BASE = 'https://www.boe.es';

// ─── Palabras clave que identifican una publicación relacionada con bomberos ──

const BOMBERO_KEYWORDS = [
  'bombero',
  'bombera',
  'bomberos',
  'bomberas',
  'sapador',
  'sapadores',
  'extinción de incendio',
  'extincion de incendio',
  'cuerpo de bomberos',
  'servicio de extinción',
  'servicio extincion',
  'parque de bomberos',
  'brigada de bomberos',
  'sepei',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function containsBomberoKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return BOMBERO_KEYWORDS.some(kw => lower.includes(kw));
}

function detectTipo(titulo: string): string {
  const t = titulo.toLowerCase();
  if (t.includes('oferta de empleo p') ) return 'OPE';
  if (t.includes('convocatoria')) return 'Convocatoria';
  if (t.includes('bases') && (t.includes('plaza') || t.includes('plazas') || t.includes('selectiv'))) return 'Bases';
  if ((t.includes('lista') || t.includes('relación')) && (t.includes('aprobado') || t.includes('admitido') || t.includes('aspirante'))) return 'Resultado';
  if (t.includes('resolución') || t.includes('resolucion')) return 'Resolución';
  if (t.includes('anuncio')) return 'Anuncio';
  return 'Publicación';
}

// Calcular estado del plazo basado en tipo de publicación y fecha
function calcularEstadoPlazo(fechaISO: string, tipoPublicacion: string): { estado: string; diasRestantesEstimados: number | null; diasTranscurridos: number; prioridad: number } {
  const fechaPub = new Date(fechaISO);
  const hoy = new Date();
  const diasTranscurridos = Math.floor((hoy.getTime() - fechaPub.getTime()) / (1000 * 60 * 60 * 24));
  const diasHabilesAprox = Math.floor(diasTranscurridos * 0.7);
  
  let estado = 'indeterminado';
  let diasRestantesEstimados: number | null = null;
  let prioridad = 0;
  
  switch (tipoPublicacion) {
    case 'Convocatoria':
      if (diasHabilesAprox <= 20) {
        estado = 'en_plazo';
        diasRestantesEstimados = Math.max(0, 20 - diasHabilesAprox);
        prioridad = 100 - diasHabilesAprox;
      } else if (diasHabilesAprox <= 30) {
        estado = 'plazo_posible';
        prioridad = 50;
      } else {
        estado = 'plazo_cerrado';
        prioridad = 10;
      }
      break;
    case 'Bases':
      if (diasTranscurridos <= 60) {
        estado = 'pendiente_convocatoria';
        prioridad = 80;
      } else if (diasTranscurridos <= 180) {
        estado = 'convocatoria_probable';
        prioridad = 40;
      } else {
        estado = 'convocatoria_posible';
        prioridad = 20;
      }
      break;
    case 'OPE':
      if (diasTranscurridos <= 180) {
        estado = 'pendiente_convocatoria';
        prioridad = 60;
      } else {
        estado = 'convocatoria_posible';
        prioridad = 15;
      }
      break;
    case 'Anuncio':
    case 'Resolución':
      if (diasHabilesAprox <= 15) {
        estado = 'en_plazo';
        diasRestantesEstimados = Math.max(0, 15 - diasHabilesAprox);
        prioridad = 90 - diasHabilesAprox;
      } else if (diasHabilesAprox <= 25) {
        estado = 'plazo_posible';
        prioridad = 45;
      } else {
        estado = 'plazo_cerrado';
        prioridad = 5;
      }
      break;
    default:
      if (diasHabilesAprox <= 20) {
        estado = 'plazo_posible';
        prioridad = 30;
      } else {
        estado = 'indeterminado';
        prioridad = 1;
      }
  }
  
  return { estado, diasRestantesEstimados, diasTranscurridos, prioridad };
}

// ─── Parseo del HTML del BOE ─────────────────────────────────────────────────

interface ParsedResult {
  id: string;
  titulo: string;
  fecha: string;
  fechaISO: string;
  anio: number;
  urlHtm: string;
  urlPdf: string;
  tipo: string;
  departamento: string;
  estadoPlazo?: string;
  diasRestantes?: number | null;
  diasDesdePublicacion?: number;
  prioridad?: number;
}

function fallbackDate(boeId: string): { fecha: string; fechaISO: string; anio: number } {
  const m = boeId.match(/BOE-[A-Z]-(\d{4})-/);
  const y = m ? parseInt(m[1]) : new Date().getFullYear();
  return { fecha: `??/??/${y}`, fechaISO: `${y}-06-01`, anio: y };
}

function parseBoePage(html: string): ParsedResult[] {
  const results: ParsedResult[] = [];
  const seen = new Set<string>();

  // ── Estrategia 1: links /diario_boe/txt.php?id=BOE-X-YYYY-NNNNN ──────────
  const linkRe = /href="\/diario_boe\/txt\.php\?id=(BOE-[A-Z]-\d{4}-\d+)"[^>]*>([\s\S]{0,600}?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;

    const rawTitle = stripHtml(m[2]);
    if (!rawTitle || rawTitle.length < 10) continue;
    if (!containsBomberoKeyword(rawTitle)) continue;

    seen.add(id);

    // Contexto local: 800 chars alrededor del enlace
    const ctx = html.substring(
      Math.max(0, m.index - 400),
      Math.min(html.length, m.index + m[0].length + 800)
    );

    // Fecha
    const dateM = ctx.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const { fecha, fechaISO, anio } = dateM
      ? { fecha: `${dateM[1]}/${dateM[2]}/${dateM[3]}`, fechaISO: `${dateM[3]}-${dateM[2]}-${dateM[1]}`, anio: parseInt(dateM[3]) }
      : fallbackDate(id);

    // PDF
    const pdfM = ctx.match(/href="(\/boe\/dias\/\d{4}\/\d{2}\/\d{2}\/pdfs\/[^"]+\.pdf)"/i);
    const urlPdf = pdfM ? `${BOE_BASE}${pdfM[1]}` : '';

    // Departamento (texto antes del primer punto en el título)
    const deptM = rawTitle.match(/^([^.]+)\./);
    const departamento = deptM ? deptM[1].trim() : '';

    results.push({
      id,
      titulo: rawTitle,
      fecha,
      fechaISO,
      anio,
      urlHtm: `${BOE_BASE}/diario_boe/txt.php?id=${id}`,
      urlPdf,
      tipo: detectTipo(rawTitle),
      departamento,
    });
  }

  // ── Estrategia 2: links directos a PDF (captura lo que escapó a la 1ª) ───
  const pdfOnlyRe = /href="\/boe\/dias\/(\d{4})\/(\d{2})\/(\d{2})\/pdfs\/(BOE-[A-Z]-\d{4}-\d+)\.pdf"/gi;
  while ((m = pdfOnlyRe.exec(html)) !== null) {
    const [, yyyy, mm, dd, id] = m;
    if (seen.has(id)) continue;

    // Buscar título hacia atrás en el HTML
    const before = html.substring(Math.max(0, m.index - 1200), m.index);
    const titleM = before.match(/href="\/diario_boe\/txt\.php\?id=[^"]*"[^>]*>([\s\S]{0,400}?)<\/a>\s*$/);
    if (!titleM) continue;

    const rawTitle = stripHtml(titleM[1]);
    if (!rawTitle || !containsBomberoKeyword(rawTitle)) continue;

    seen.add(id);
    const deptM = rawTitle.match(/^([^.]+)\./);
    results.push({
      id,
      titulo: rawTitle,
      fecha: `${dd}/${mm}/${yyyy}`,
      fechaISO: `${yyyy}-${mm}-${dd}`,
      anio: parseInt(yyyy),
      urlHtm: `${BOE_BASE}/diario_boe/txt.php?id=${id}`,
      urlPdf: `${BOE_BASE}/boe/dias/${yyyy}/${mm}/${dd}/pdfs/${id}.pdf`,
      tipo: detectTipo(rawTitle),
      departamento: deptM ? deptM[1].trim() : '',
    });
  }

  return results;
}

// ─── Fetch de una consulta al buscador BOE ────────────────────────────────────

async function searchBOE(query: string, page = 1, retries = 2): Promise<ParsedResult[]> {
  const params = new URLSearchParams({ q: query, accion: 'buscar', nd: '1' });
  if (page > 1) params.set('p', String(page));

  const url = `${BOE_BASE}/buscar/boe.php?${params.toString()}`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

    try {
      console.log(`[boe-search] Consultando: ${query} (intento ${attempt + 1})`);
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
      clearTimeout(tid);
      
      if (!resp.ok) {
        console.log(`[boe-search] HTTP error ${resp.status} para: ${query}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return [];
      }
      
      const html = await resp.text();
      console.log(`[boe-search] Respuesta recibida para: ${query} (${html.length} bytes)`);
      const results = parseBoePage(html);
      console.log(`[boe-search] Parseados ${results.length} resultados para: ${query}`);
      return results;
    } catch (err: any) {
      clearTimeout(tid);
      console.log(`[boe-search] Error en búsqueda "${query}" (intento ${attempt + 1}):`, err.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return [];
    }
  }
  return [];
}

// ─── Handler principal ────────────────────────────────────────────────────────

module.exports = async function handler(req: any, res: any) {
  console.log('[boe-search] === INICIO REQUEST ===');
  console.log('[boe-search] Method:', req.method);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Caché de 2 horas (el BOE actualiza una vez al día)
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=3600');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('[boe-search] Iniciando búsquedas paralelas...');
    
    // 4 búsquedas paralelas para máxima cobertura
    const [r1, r2, r3, r4] = await Promise.all([
      searchBOE('bombero oposición'),
      searchBOE('bomberos convocatoria'),
      searchBOE('extinción incendios oposición'),
      searchBOE('bombero oferta empleo público'),
    ]);

    console.log(`[boe-search] Resultados: r1=${r1.length}, r2=${r2.length}, r3=${r3.length}, r4=${r4.length}`);

    // Deduplicar por ID
    const seen = new Set<string>();
    const merged: ParsedResult[] = [];
    for (const item of [...r1, ...r2, ...r3, ...r4]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }

    console.log(`[boe-search] Total después de deduplicar: ${merged.length}`);

    // Añadir estado de plazo a cada resultado
    const conEstado = merged.map(item => {
      const estadoPlazo = calcularEstadoPlazo(item.fechaISO, item.tipo);
      return {
        ...item,
        estadoPlazo: estadoPlazo.estado,
        diasRestantes: estadoPlazo.diasRestantesEstimados,
        diasDesdePublicacion: estadoPlazo.diasTranscurridos,
        prioridad: estadoPlazo.prioridad
      };
    });

    // Ordenar por prioridad (mayor primero) y luego por fecha
    // No filtrar - mostrar todos los resultados con su estado de plazo
    conEstado.sort((a, b) => {
      if (b.prioridad !== a.prioridad) {
        return b.prioridad - a.prioridad;
      }
      const aApprox = a.fecha.startsWith('??');
      const bApprox = b.fecha.startsWith('??');
      if (aApprox && !bApprox) return 1;
      if (!aApprox && bApprox) return -1;
      return b.fechaISO.localeCompare(a.fechaISO);
    });

    console.log(`[boe-search] === FIN REQUEST OK === Total: ${conEstado.length}`);

    return res.status(200).json({
      ok: true,
      total: conEstado.length,
      results: conEstado,
      fuente: 'Boletín Oficial del Estado (BOE) — www.boe.es',
      timestamp: new Date().toISOString(),
      nota: 'Convocatorias ordenadas por relevancia (en plazo primero)'
    });
  } catch (err: any) {
    console.error('[boe-search] ERROR:', err);
    return res.status(500).json({ ok: false, error: 'Error al consultar el BOE', details: err.message });
  }
};
