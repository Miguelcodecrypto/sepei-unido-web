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
  'mecánico conductor bombero', 'mecanico conductor bombero',
  'mecánico/a conductor/a bombero/a', 'mecanico/a conductor/a bombero/a',
  'sapador', 'sapadores',
  'sepei',
  'cuerpo de bomberos',
  'parque de bomberos',
  'servicio de extinción de incendios',
  'servicio extinción incendios',
  'servicio de extincion de incendios',
  'prevención y extinción de incendios',
  'prevencion y extincion de incendios',
  'extinción de incendios',
  'extincion de incendios'
];

// Palabras clave que EXCLUYEN resultados (falsos positivos)
const EXCLUSION_KEYWORDS = [
  // Contextos hidrográficos
  'confederación hidrográfica',
  'confederacion hidrografica',
  'aprovechamiento de agua',
  'concesión de agua',
  'concesion de agua',
  'riego y extinción',
  'riego y extincion',
  'abastecimiento de agua',
  'cuenca hidrográfica',
  'demarcación hidrográfica',
  // Contextos portuarios (tarifas, no oposiciones)
  'autoridad portuaria',
  'servicio portuario',
  'tarifas por intervención',
  'tarifas por intervencion',
  'amarre y desamarre',
  'servicio de remolque',
  'recepción de desechos',
  'recepcion de desechos',
];

// Función mejorada para detectar si es relacionado con bomberos
function hasBoe(t: string): boolean {
  const texto = t.toLowerCase();
  
  // PRIMERO: Excluir falsos positivos conocidos
  for (const excl of EXCLUSION_KEYWORDS) {
    if (texto.includes(excl)) {
      return false;
    }
  }
  
  for (const kw of KW_BOMBEROS) {
    if (texto.includes(kw.toLowerCase())) {
      return true;
    }
  }
  
  // Patrones adicionales: extinción + incendios en contexto de empleo
  // PERO solo si no es un contexto hidrográfico
  if ((texto.includes('extinción') || texto.includes('extincion')) && 
      texto.includes('incendio') &&
      !texto.includes('agua') && !texto.includes('riego') &&
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

// Función para detectar si es una convocatoria potencial de administración local
// que podría contener plazas de bomberos (títulos genéricos como "proveer varias plazas")
function isPotentialLocalConvocatoria(titulo: string, seccion: string): boolean {
  const tituloLower = titulo.toLowerCase();
  // Solo en sección de oposiciones (2B)
  if (!seccion.includes('2B') && !seccion.includes('Oposiciones')) return false;
  
  // Detectar títulos genéricos de ayuntamientos/diputaciones
  if ((tituloLower.includes('diputación') || tituloLower.includes('diputacion') ||
       tituloLower.includes('ayuntamiento') || tituloLower.includes('consorcio') ||
       tituloLower.includes('mancomunidad')) &&
      (tituloLower.includes('proveer') || tituloLower.includes('plaza') || 
       tituloLower.includes('convocatoria'))) {
    return true;
  }
  return false;
}

// Patrones ESTRICTOS para verificar contenido de documentos
// Solo patrones que claramente indican plazas de bomberos
const PATRONES_ESTRICTOS_BOMBEROS = [
  /plaza[s]?\s+(de\s+)?bomber[oa]/i,
  /bomber[oa][s]?[\s\-\/a]+conductor/i,
  /conductor[\s\/a]+bomber[oa]/i,
  /mecánic[oa\s\/]+conductor[oa\s\/]+bomber[oa]/i,
  /mecanico[a\s\/]+conductor[a\s\/]+bomber[oa]/i,
  /cuerpo\s+de\s+bomberos/i,
  /servicio\s+de\s+extinción\s+de\s+incendios/i,
  /servicio\s+de\s+extincion\s+de\s+incendios/i,
  /servicio\s+extinción\s+incendios/i,
  /clase\s+servicio\s+de\s+extinci/i,
  /\bsepei\b/i,
  /\bsapador[es]?\b/i,
  /escala[^.]{0,50}servicios\s+especiales[^.]{0,50}extinci/i,
  /subescala[^.]{0,30}extinci[oó]n/i
];

// Función para verificar el contenido de un documento específico con patrones estrictos
async function checkDocumentContent(urlHtml: string): Promise<boolean> {
  try {
    const r = await fetch(urlHtml, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(5000) // 5 segundos - igual que desarrollo
    });
    if (!r.ok) return false;
    const html = await r.text();
    
    // Buscar solo patrones estrictos que claramente indican bomberos
    for (const patron of PATRONES_ESTRICTOS_BOMBEROS) {
      if (patron.test(html)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
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
      signal: AbortSignal.timeout(10000) // 10 segundos - igual que desarrollo
    });
    
    if (!r.ok) return [];
    
    const xml = await r.text();
    const results: any[] = [];
    const potentialItems: any[] = [];
    
    // Buscar todos los items en el XML
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    let currentSeccion = '';
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const titulo = getXMLText(itemXml, 'titulo')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
      
      const id = getXMLText(itemXml, 'identificador');
      const urlHtml = getXMLText(itemXml, 'url_html');
      const urlPdf = getXMLText(itemXml, 'url_pdf');
      
      // Detectar sección del item basándose en su posición en el XML
      const itemPos = match.index;
      const xmlBefore = xml.substring(0, itemPos);
      const lastSeccionMatch = xmlBefore.match(/<seccion[^>]*codigo="([^"]*)"[^>]*nombre="([^"]*)"[^>]*>/gi);
      if (lastSeccionMatch && lastSeccionMatch.length > 0) {
        currentSeccion = lastSeccionMatch[lastSeccionMatch.length - 1];
      }
      
      // DEBUG para BOE-A-2026-4839
      if (id === 'BOE-A-2026-4839') {
        console.log(`[boe-search] DEBUG BOE-A-2026-4839 encontrado:`);
        console.log(`  titulo: ${titulo.substring(0, 100)}`);
        console.log(`  currentSeccion: ${currentSeccion}`);
        console.log(`  hasBoe: ${hasBoe(titulo)}`);
        console.log(`  isPotential: ${isPotentialLocalConvocatoria(titulo, currentSeccion)}`);
      }
      
      // Si el título ya contiene palabras clave de bomberos
      if (hasBoe(titulo)) {
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
      // Si es una convocatoria potencial de administración local, guardarla para verificar
      else if (isPotentialLocalConvocatoria(titulo, currentSeccion)) {
        potentialItems.push({
          id,
          titulo,
          fecha: `${day}/${month}/${year}`,
          fechaISO: `${year}-${month}-${day}`,
          anio: parseInt(year),
          urlHtm: urlHtml || `${BOE_BASE}/diario_boe/txt.php?id=${id}`,
          urlPdf: urlPdf || '',
        });
      }
    }
    
    // Verificar contenido de items potenciales (sin límite - verificamos todos)
    // Ya están ordenados por ID descendente para priorizar los más recientes
    potentialItems.sort((a, b) => b.id.localeCompare(a.id));
    
    if (potentialItems.length > 0) {
      console.log(`[boe-search] ${dateStr}: ${potentialItems.length} items potenciales a verificar`);
    }
    
    // Verificar TODOS los items potenciales SECUENCIALMENTE (igual que desarrollo)
    for (const item of potentialItems) {
      const isBombero = await checkDocumentContent(item.urlHtm);
      if (isBombero) {
        console.log(`[boe-search] ✓ ENCONTRADO BOMBERO: ${item.id} - ${item.titulo.substring(0, 80)}`);
        results.push({
          ...item,
          tipo: tipo(item.titulo) || 'Convocatoria',
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
  // Headers CORS más completos para compatibilidad con móviles
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('[boe-search] Iniciando búsqueda...');
    
    // Usar 90 días (3 meses, excluye fines de semana)
    const dates = getRecentDates(90);
    console.log(`[boe-search] Consultando ${dates.length} días laborables...`);
    
    const summaryResults: any[] = [];
    const batchSize = 15; // Igual que desarrollo
    
    // Procesar TODOS los días sin límite ni parada temprana (igual que desarrollo)
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(d => fetchDaySummary(d)));
      summaryResults.push(...batchResults.flat());
      
      // Log de progreso
      if ((i + batchSize) % 50 === 0 || i + batchSize >= dates.length) {
        console.log(`[boe-search] Procesados ${Math.min(i + batchSize, dates.length)}/${dates.length} días, ${summaryResults.length} resultados`);
      }
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
    
    // Ordenar por fecha más reciente
    merged.sort((a, b) => b.fechaISO.localeCompare(a.fechaISO));

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
