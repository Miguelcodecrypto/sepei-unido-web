/**
 * BOE Search API — Motor de búsqueda de convocatorias de bomberos
 * Vercel Serverless Function
 * 
 * REPLICA EXACTA de la lógica de desarrollo (vite.config.mjs)
 * Usa la API de datos abiertos del BOE: /datosabiertos/api/boe/sumario/{fecha}
 */

const BOE_BASE = 'https://www.boe.es';

// Keywords EXACTOS para filtrar publicaciones relacionadas con bomberos
const KW_BOMBEROS = [
  'bombero', 'bombera', 'bomberos', 'bomberas',
  'bombero-conductor', 'bombero conductor', 'bomberos-conductores',
  'bombero/a', 'bomberos/as',
  'sapador', 'sapadores',
  'sepei',
  'cuerpo de bomberos',
  'parque de bomberos',
  'servicio de extinción de incendios',
  'servicio extinción incendios',
  'prevención y extinción de incendios',
  'prevencion y extincion de incendios'
];

// Función mejorada para detectar si es relacionado con bomberos
function hasBoe(t: string): boolean {
  const texto = t.toLowerCase();
  
  for (const kw of KW_BOMBEROS) {
    if (texto.includes(kw.toLowerCase())) {
      return true;
    }
  }
  
  if ((texto.includes('extinción') || texto.includes('extincion')) && 
      texto.includes('incendio') &&
      (texto.includes('plaza') || texto.includes('convocatoria') || 
       texto.includes('oposición') || texto.includes('oposicion') ||
       texto.includes('proceso selectivo') || texto.includes('oferta de empleo'))) {
    return true;
  }
  
  return false;
}

function tipo(t: string): string {
  const l = t.toLowerCase();
  if (l.includes('oferta de empleo p')) return 'OPE';
  if (l.includes('convocatoria')) return 'Convocatoria';
  if (l.includes('bases') && (l.includes('plaza')||l.includes('selectiv'))) return 'Bases';
  if (l.includes('resolución')||l.includes('resolucion')) return 'Resolución';
  if (l.includes('anuncio')) return 'Anuncio';
  return 'Publicación';
}

function getXMLText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Saltar fines de semana
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    dates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
  }
  return dates;
}

function calcularEstadoPlazo(fechaISO: string, tipoPublicacion: string) {
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

// Consultar sumario usando API de datos abiertos (igual que en desarrollo)
async function fetchDaySummary(dateStr: string): Promise<any[]> {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  // Usar la API de datos abiertos (la misma que funciona en desarrollo)
  const url = `${BOE_BASE}/datosabiertos/api/boe/sumario/${dateStr}`;
  
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*',
      },
    });
    
    if (!r.ok) return [];
    
    const xml = await r.text();
    const results: any[] = [];
    
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const titulo = getXMLText(itemXml, 'titulo')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
      
      if (hasBoe(titulo)) {
        const id = getXMLText(itemXml, 'identificador');
        const urlHtml = getXMLText(itemXml, 'url_html');
        const urlPdf = getXMLText(itemXml, 'url_pdf');
        
        results.push({
          id,
          titulo,
          fecha: `${day}/${month}/${year}`,
          fechaISO: `${year}-${month}-${day}`,
          anio: parseInt(year),
          urlHtm: urlHtml || `${BOE_BASE}/diario_boe/txt.php?id=${id}`,
          urlPdf: urlPdf || '',
          tipo: tipo(titulo),
          departamento: ''
        });
      }
    }
    
    return results;
  } catch (e) {
    return [];
  }
}

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('[boe-search] Iniciando búsqueda...');
    
    // Usar 365 días (excluye fines de semana)
    const dates = getRecentDates(365);
    console.log(`[boe-search] Consultando ${dates.length} días laborables...`);
    
    const summaryResults: any[] = [];
    const batchSize = 10;
    const startTime = Date.now();
    const MAX_TIME = 8000; // 8 segundos máximo
    
    for (let i = 0; i < dates.length; i += batchSize) {
      // Verificar timeout
      if (Date.now() - startTime > MAX_TIME) {
        console.log('[boe-search] Tiempo límite alcanzado');
        break;
      }
      
      const batch = dates.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(d => fetchDaySummary(d)));
      summaryResults.push(...batchResults.flat());
      
      console.log(`[boe-search] Procesados ${Math.min(i + batchSize, dates.length)}/${dates.length} días, ${summaryResults.length} resultados`);
      
      // Parar si tenemos suficientes
      if (summaryResults.length >= 50) break;
    }
    
    // Eliminar duplicados y añadir estado de plazo
    const seen = new Set<string>();
    const merged: any[] = [];
    
    for (const item of summaryResults) {
      if (item.id && !seen.has(item.id)) {
        seen.add(item.id);
        const estadoPlazo = calcularEstadoPlazo(item.fechaISO, item.tipo);
        merged.push({
          ...item,
          estadoPlazo: estadoPlazo.estado,
          diasRestantes: estadoPlazo.diasRestantesEstimados,
          diasDesdePublicacion: estadoPlazo.diasTranscurridos,
          prioridad: estadoPlazo.prioridad
        });
      }
    }
    
    // Ordenar por prioridad y fecha
    merged.sort((a, b) => {
      if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
      return b.fechaISO.localeCompare(a.fechaISO);
    });

    console.log(`[boe-search] Total: ${merged.length} resultados únicos`);

    return res.status(200).json({
      ok: true,
      total: merged.length,
      results: merged,
      fuente: 'Boletín Oficial del Estado (BOE) — www.boe.es',
      timestamp: new Date().toISOString(),
      nota: 'Convocatorias ordenadas por relevancia (en plazo primero)'
    });
  } catch (err: any) {
    console.error('[boe-search] Error:', err);
    return res.status(500).json({ ok: false, error: 'Error al consultar el BOE', details: err.message });
  }
};
