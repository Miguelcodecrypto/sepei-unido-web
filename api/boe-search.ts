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

async function searchBOE(query: string, page = 1): Promise<ParsedResult[]> {
  const params = new URLSearchParams({ q: query, accion: 'buscar', nd: '1' });
  if (page > 1) params.set('p', String(page));

  const url = `${BOE_BASE}/buscar/boe.php?${params.toString()}`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 9000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(tid);
    if (!resp.ok) return [];
    const html = await resp.text();
    return parseBoePage(html);
  } catch {
    clearTimeout(tid);
    return [];
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Caché de 2 horas (el BOE actualiza una vez al día)
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=3600');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 3 búsquedas paralelas para máxima cobertura
    const [r1, r2, r3, r4] = await Promise.all([
      searchBOE('bombero oposición'),
      searchBOE('bomberos convocatoria'),
      searchBOE('extinción incendios oposición'),
      searchBOE('bombero oferta empleo público'),
    ]);

    // Deduplicar por ID
    const seen = new Set<string>();
    const merged: ParsedResult[] = [];
    for (const item of [...r1, ...r2, ...r3, ...r4]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }

    // Ordenar: fecha real primero (más reciente), fechas aproximadas al final
    merged.sort((a, b) => {
      const aApprox = a.fecha.startsWith('??');
      const bApprox = b.fecha.startsWith('??');
      if (aApprox && !bApprox) return 1;
      if (!aApprox && bApprox) return -1;
      return b.fechaISO.localeCompare(a.fechaISO);
    });

    return res.status(200).json({
      ok: true,
      total: merged.length,
      results: merged,
      fuente: 'Boletín Oficial del Estado (BOE) — www.boe.es',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[boe-search] error:', err);
    return res.status(500).json({ ok: false, error: 'Error al consultar el BOE', details: err.message });
  }
};
