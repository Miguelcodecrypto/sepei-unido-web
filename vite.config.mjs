import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ─── BOE search logic (dev mode) usando API XML del BOE ──────────────────────

const BOE_BASE = 'https://www.boe.es';

// Keywords EXACTOS para filtrar publicaciones relacionadas con bomberos
// Solo palabras que claramente identifican convocatorias de bomberos
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
const hasBoe = (t) => {
  const texto = t.toLowerCase();
  
  // Verificar si contiene alguna palabra clave de bomberos
  for (const kw of KW_BOMBEROS) {
    if (texto.includes(kw.toLowerCase())) {
      return true;
    }
  }
  
  // Patrones adicionales más específicos con regex
  // "extinción" + "incendios" juntos en contexto de plaza/convocatoria
  if ((texto.includes('extinción') || texto.includes('extincion')) && 
      texto.includes('incendio') &&
      (texto.includes('plaza') || texto.includes('convocatoria') || 
       texto.includes('oposición') || texto.includes('oposicion') ||
       texto.includes('proceso selectivo') || texto.includes('oferta de empleo'))) {
    return true;
  }
  
  return false;
};

const tipo = (t) => {
  const l = t.toLowerCase();
  if (l.includes('oferta de empleo p')) return 'OPE';
  if (l.includes('convocatoria')) return 'Convocatoria';
  if (l.includes('bases') && (l.includes('plaza')||l.includes('selectiv'))) return 'Bases';
  if (l.includes('resolución')||l.includes('resolucion')) return 'Resolución';
  if (l.includes('anuncio')) return 'Anuncio';
  return 'Publicación';
};

// Función para extraer texto de un tag XML
function getXMLText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

// Función para extraer atributo de un tag XML
function getXMLAttr(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'));
  return match ? match[1] : '';
}

// Obtener las últimas fechas a consultar (últimos N días)
function getRecentDates(days = 365) {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Saltar fines de semana (el BOE no se publica sábados y domingos)
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    dates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
  }
  return dates;
}

// Calcular estado del plazo basado en tipo de publicación y fecha
// Los plazos típicos del BOE son:
// - Convocatorias: 20 días hábiles (~1 mes)
// - OPE: informativa, los plazos vienen después en convocatoria
// - Bases: puede tardar meses hasta la convocatoria
// - Anuncios/Resoluciones: plazos variables (10-20 días hábiles)
function calcularEstadoPlazo(fechaISO, tipoPublicacion) {
  const fechaPub = new Date(fechaISO);
  const hoy = new Date();
  const diasTranscurridos = Math.floor((hoy - fechaPub) / (1000 * 60 * 60 * 24));
  
  // Estimar días hábiles (aproximadamente 70% de los días naturales)
  const diasHabilesAprox = Math.floor(diasTranscurridos * 0.7);
  
  let estado = 'indeterminado';
  let diasRestantesEstimados = null;
  let prioridad = 0;
  
  switch (tipoPublicacion) {
    case 'Convocatoria':
      // Convocatorias suelen tener 20 días hábiles de plazo
      if (diasHabilesAprox <= 20) {
        estado = 'en_plazo';
        diasRestantesEstimados = Math.max(0, 20 - diasHabilesAprox);
        prioridad = 100 - diasHabilesAprox; // Mayor prioridad si queda menos tiempo
      } else if (diasHabilesAprox <= 30) {
        estado = 'plazo_posible';
        prioridad = 50;
      } else {
        estado = 'plazo_cerrado';
        prioridad = 10;
      }
      break;
      
    case 'Bases':
      // Bases publicadas recientemente: la convocatoria vendrá pronto
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
      // OPE: informativa, convocatorias pueden tardar meses/años
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
      // Anuncios y resoluciones: plazos de 10-15 días hábiles
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
      // Publicación genérica
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

// Consultar el sumario de un día específico (XML)
async function fetchDaySummary(dateStr) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  const url = `${BOE_BASE}/datosabiertos/api/boe/sumario/${dateStr}`;
  
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!r.ok) return [];
    
    const xml = await r.text();
    const results = [];
    
    // Buscar todos los items en el XML
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
      
      // Filtrar solo publicaciones relacionadas con bomberos
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
    // Silenciar errores de días sin sumario
    return [];
  }
}

// ─── Vite plugin: maneja /api/boe-search en modo desarrollo ──────────────────

function boeDevPlugin() {
  return {
    name: 'boe-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] || '';
        if (urlPath !== '/api/boe-search') return next();
        
        console.log('[boe-api-dev] Procesando petición BOE');
        try {
          // Obtener sumarios del último año (365 días laborables)
          console.log('[boe-api-dev] Consultando sumarios del BOE (último año)...');
          const dates = getRecentDates(365);
          
          // Consultar en lotes de 15 para balance velocidad/carga
          const batchSize = 15;
          const summaryResults = [];
          
          // Procesar TODOS los días sin límite ni parada temprana
          for (let i = 0; i < dates.length; i += batchSize) {
            const batch = dates.slice(i, i + batchSize);
            const batchPromises = batch.map(d => fetchDaySummary(d));
            const batchResults = await Promise.all(batchPromises);
            summaryResults.push(...batchResults.flat());
            
            // Log de progreso cada 50 días procesados
            if ((i + batchSize) % 50 === 0 || i + batchSize >= dates.length) {
              console.log(`[boe-api-dev] Procesados ${Math.min(i + batchSize, dates.length)}/${dates.length} días, encontrados ${summaryResults.length} resultados`);
            }
          }
          
          console.log(`[boe-api-dev] Sumarios: ${summaryResults.length} resultados relacionados con bomberos`);
          
          // Eliminar duplicados por ID y añadir estado de plazo
          const seen = new Set();
          const merged = [];
          for (const item of summaryResults) {
            if (item.id && !seen.has(item.id)) {
              seen.add(item.id);
              
              // Calcular estado del plazo
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
          
          // Ordenar por prioridad (mayor primero) y luego por fecha más reciente
          // No filtrar - mostrar todos los resultados con su estado de plazo
          merged.sort((a, b) => {
            // Primero por prioridad (los que están en plazo primero)
            if (b.prioridad !== a.prioridad) {
              return b.prioridad - a.prioridad;
            }
            // Si misma prioridad, por fecha más reciente
            return b.fechaISO.localeCompare(a.fechaISO);
          });
          
          console.log(`[boe-api-dev] Total resultados: ${merged.length}`);
          
          res.writeHead(200, {'Content-Type':'application/json;charset=utf-8'});
          res.end(JSON.stringify({
            ok: true, 
            total: merged.length,
            results: merged,
            fuente: 'BOE — www.boe.es (API Datos Abiertos)', 
            timestamp: new Date().toISOString(),
            nota: 'Convocatorias ordenadas por relevancia (en plazo primero)'
          }));
        } catch(e) {
          console.log('[boe-api-dev] Error:', e.message);
          res.writeHead(500, {'Content-Type':'application/json'});
          res.end(JSON.stringify({ok:false, error:e.message}));
        }
      });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react(), boeDevPlugin()],
  publicDir: 'public',
  server: {
    fs: {
      deny: ['.env', '.env.*', '**/api/**'],
    },
  },
  optimizeDeps: {
    exclude: ['api'],
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separar librerías pesadas
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react'],
          'vendor-crypto': ['bcryptjs', 'node-forge', 'jsrsasign'],
          // Separar servicios pesados
          'services': [
            './src/services/emailNotificationService.ts',
            './src/services/telegramNotificationService.ts',
            './src/services/analyticsService.ts',
          ],
        },
      },
    },
  },
});

