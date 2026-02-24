/**
 * BOE Search API — Motor de búsqueda de convocatorias de bomberos
 * Vercel Serverless Function
 */

const BOE_BASE = 'https://www.boe.es';

const BOMBERO_KEYWORDS = [
  'bombero', 'bombera', 'bomberos', 'bomberas',
  'extinción de incendio', 'extincion de incendio',
  'cuerpo de bomberos', 'servicio de extinción',
  'parque de bomberos', 'sepei',
];

function containsBomberoKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return BOMBERO_KEYWORDS.some(kw => lower.includes(kw));
}

function detectTipo(titulo: string): string {
  const t = titulo.toLowerCase();
  if (t.includes('oferta de empleo p')) return 'OPE';
  if (t.includes('convocatoria')) return 'Convocatoria';
  if (t.includes('bases') && (t.includes('plaza') || t.includes('plazas'))) return 'Bases';
  if (t.includes('lista') && (t.includes('aprobado') || t.includes('admitido'))) return 'Resultado';
  if (t.includes('resolución') || t.includes('resolucion')) return 'Resolución';
  if (t.includes('anuncio')) return 'Anuncio';
  return 'Publicación';
}

function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}${mm}${dd}`);
  }
  return dates;
}

function parseXmlSumario(xml: string, fechaStr: string): any[] {
  const results: any[] = [];
  const itemRegex = /<item[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    try {
      const id = match[1];
      const content = match[2];
      
      const tituloMatch = content.match(/<titulo[^>]*>([\s\S]*?)<\/titulo>/i);
      if (!tituloMatch) continue;
      
      const titulo = tituloMatch[1]
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      
      if (!containsBomberoKeyword(titulo)) continue;
      
      const urlHtmMatch = content.match(/<urlHtm[^>]*>([\s\S]*?)<\/urlHtm>/i);
      const urlPdfMatch = content.match(/<urlPdf[^>]*>([\s\S]*?)<\/urlPdf>/i);
      
      let urlHtm = urlHtmMatch 
        ? urlHtmMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
        : `${BOE_BASE}/diario_boe/txt.php?id=${id}`;
      
      let urlPdf = urlPdfMatch 
        ? urlPdfMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
        : '';
      
      const deptMatch = content.match(/<departamento[^>]*>([\s\S]*?)<\/departamento>/i);
      const departamento = deptMatch 
        ? deptMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
        : '';
      
      const yyyy = fechaStr.substring(0, 4);
      const mm = fechaStr.substring(4, 6);
      const dd = fechaStr.substring(6, 8);
      
      results.push({
        id,
        titulo,
        fecha: `${dd}/${mm}/${yyyy}`,
        fechaISO: `${yyyy}-${mm}-${dd}`,
        anio: parseInt(yyyy),
        urlHtm: urlHtm.startsWith('http') ? urlHtm : `${BOE_BASE}${urlHtm}`,
        urlPdf: urlPdf && !urlPdf.startsWith('http') ? `${BOE_BASE}${urlPdf}` : urlPdf,
        tipo: detectTipo(titulo),
        departamento,
      });
    } catch (e) {
      // Ignorar items con errores de parsing
      continue;
    }
  }
  
  return results;
}

async function fetchSumario(fecha: string): Promise<any[]> {
  const url = `${BOE_BASE}/diario_boe/xml.php?id=BOE-S-${fecha}`;
  
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'application/xml, text/xml, */*',
      },
    });
    
    if (!resp.ok) return [];
    
    const xml = await resp.text();
    return parseXmlSumario(xml, fecha);
  } catch (e) {
    return [];
  }
}

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[boe-search] Iniciando búsqueda...');
    
    // Solo últimos 60 días para evitar timeout
    const fechas = getRecentDates(60);
    const allResults: any[] = [];
    
    // Procesar en lotes de 10
    for (let i = 0; i < fechas.length && allResults.length < 30; i += 10) {
      const batch = fechas.slice(i, i + 10);
      
      try {
        const batchResults = await Promise.all(batch.map(f => fetchSumario(f)));
        for (const results of batchResults) {
          allResults.push(...results);
        }
      } catch (batchError) {
        console.log('[boe-search] Error en batch:', batchError);
        continue;
      }
      
      console.log(`[boe-search] Procesados ${Math.min(i + 10, fechas.length)} días, ${allResults.length} resultados`);
    }

    // Deduplicar
    const seen = new Set<string>();
    const unique = allResults.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // Ordenar por fecha (más recientes primero)
    unique.sort((a, b) => b.fechaISO.localeCompare(a.fechaISO));

    console.log(`[boe-search] Total: ${unique.length} resultados únicos`);

    return res.status(200).json({
      ok: true,
      total: unique.length,
      results: unique,
      fuente: 'Boletín Oficial del Estado (BOE)',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[boe-search] Error general:', err);
    return res.status(500).json({ 
      ok: false, 
      error: 'Error al consultar el BOE', 
      details: err.message || 'Unknown error'
    });
  }
};
