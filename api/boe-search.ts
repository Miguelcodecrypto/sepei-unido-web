/**
 * BOE Search API — Motor de búsqueda de convocatorias de bomberos
 * Vercel Serverless Function
 *
 * Consulta la API de sumarios XML del BOE de forma server-side,
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

function containsBomberoKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return BOMBERO_KEYWORDS.some(kw => lower.includes(kw));
}

function detectTipo(titulo: string): string {
  const t = titulo.toLowerCase();
  if (t.includes('oferta de empleo p')) return 'OPE';
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

// ─── Tipos ───────────────────────────────────────────────────────────────────

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

// ─── Generar fechas recientes ────────────────────────────────────────────────

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

// ─── Parsear XML de sumario BOE ──────────────────────────────────────────────

function parseXmlSumario(xml: string, fechaStr: string): ParsedResult[] {
  const results: ParsedResult[] = [];
  
  // Extraer items del XML
  const itemRegex = /<item[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const id = match[1];
    const content = match[2];
    
    // Extraer título
    const tituloMatch = content.match(/<titulo[^>]*>([\s\S]*?)<\/titulo>/i);
    if (!tituloMatch) continue;
    
    const titulo = tituloMatch[1]
      .replace(/<!\[CDATA\[|\]\]>/g, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    
    // Filtrar solo bomberos
    if (!containsBomberoKeyword(titulo)) continue;
    
    // Extraer URLs
    const urlHtmMatch = content.match(/<urlHtm[^>]*>([\s\S]*?)<\/urlHtm>/i);
    const urlPdfMatch = content.match(/<urlPdf[^>]*>([\s\S]*?)<\/urlPdf>/i);
    
    const urlHtm = urlHtmMatch 
      ? urlHtmMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      : `${BOE_BASE}/diario_boe/txt.php?id=${id}`;
    
    const urlPdf = urlPdfMatch 
      ? urlPdfMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      : '';
    
    // Extraer departamento
    const deptMatch = content.match(/<departamento[^>]*>([\s\S]*?)<\/departamento>/i);
    const departamento = deptMatch 
      ? deptMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      : '';
    
    // Formatear fecha
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
      urlPdf: urlPdf.startsWith('http') ? urlPdf : (urlPdf ? `${BOE_BASE}${urlPdf}` : ''),
      tipo: detectTipo(titulo),
      departamento,
    });
  }
  
  return results;
}

// ─── Fetch sumario de un día ─────────────────────────────────────────────────

async function fetchSumario(fecha: string): Promise<ParsedResult[]> {
  const url = `${BOE_BASE}/diario_boe/xml.php?id=BOE-S-${fecha}`;
  
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000); // 3 segundos max por petición
    
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BOESearchBot/1.0)',
        'Accept': 'application/xml, text/xml, */*',
      },
    });
    
    clearTimeout(tid);
    
    if (!resp.ok) return [];
    
    const xml = await resp.text();
    return parseXmlSumario(xml, fecha);
  } catch {
    return [];
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  console.log('[boe-search] === INICIO REQUEST ===');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=3600');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Obtener últimos 90 días (suficiente para convocatorias activas)
    const fechas = getRecentDates(90);
    console.log(`[boe-search] Consultando ${fechas.length} días de sumarios...`);
    
    // Procesar en lotes pequeños para no exceder timeout de Vercel (10s)
    const BATCH_SIZE = 15;
    const allResults: ParsedResult[] = [];
    const startTime = Date.now();
    const MAX_TIME = 8000; // 8 segundos máximo para dejar margen
    
    for (let i = 0; i < fechas.length; i += BATCH_SIZE) {
      // Verificar si estamos cerca del timeout
      if (Date.now() - startTime > MAX_TIME) {
        console.log('[boe-search] Cerca del timeout, deteniendo búsqueda');
        break;
      }
      
      const batch = fechas.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(f => fetchSumario(f)));
      
      for (const results of batchResults) {
        allResults.push(...results);
      }
      
      console.log(`[boe-search] Procesados ${Math.min(i + BATCH_SIZE, fechas.length)}/${fechas.length} días, encontrados ${allResults.length} resultados`);
      
      // Si ya tenemos suficientes resultados, podemos parar
      if (allResults.length >= 50) {
        console.log('[boe-search] Suficientes resultados encontrados');
        break;
      }
    }

    // Deduplicar por ID
    const seen = new Set<string>();
    const merged: ParsedResult[] = [];
    for (const item of allResults) {
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
    conEstado.sort((a, b) => {
      if (b.prioridad !== a.prioridad) {
        return b.prioridad - a.prioridad;
      }
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
}
