/**
 * ============================================================================
 * PLANTILLA OFICIAL DE TRABAJADORES DEL SEPEI - SISTEMA DE VERIFICACIÓN
 * ============================================================================
 * 
 * Este archivo gestiona la comparación entre usuarios registrados y la 
 * plantilla oficial del SEPEI.
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  CÓMO ACTUALIZAR LA PLANTILLA DE PERSONAL                                 ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  1. Abrir el archivo: src/data/plantilla-sepei.json                       ║
 * ║                                                                           ║
 * ║  2. El JSON está organizado por DESTINOS (parques de bomberos):           ║
 * ║     - "Central de Comunicaciones"                                         ║
 * ║     - "Parque Comarcal de Almansa"                                        ║
 * ║     - "Parque Comarcal de Hellín"                                         ║
 * ║     - "Parque Comarcal de Alcaraz"                                        ║
 * ║     - "Parque Comarcal de Villarrobledo"                                  ║
 * ║     - "Parque Comarcal de La Roda"                                        ║
 * ║     - "Parque Comarcal de Casas Ibáñez"                                   ║
 * ║     - "Central de Jefatura"                                               ║
 * ║                                                                           ║
 * ║  3. Cada trabajador tiene estos campos:                                   ║
 * ║     { "nombre": "Juan", "apellidos": "García López", "categoria": "MCB" } ║
 * ║                                                                           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  OPERACIONES COMUNES:                                                     ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  📥 AÑADIR nuevo trabajador:                                              ║
 * ║     Agregar un objeto al array del destino correspondiente                ║
 * ║     Ejemplo: { "nombre": "Pedro", "apellidos": "López", "categoria": "MCB"}║
 * ║                                                                           ║
 * ║  🗑️ DAR DE BAJA trabajador (interino que se va):                          ║
 * ║     Eliminar/borrar el objeto del trabajador del array                    ║
 * ║                                                                           ║
 * ║  🔄 CAMBIAR DE DESTINO (traslado de parque):                              ║
 * ║     1. Copiar el objeto del trabajador                                    ║
 * ║     2. Pegarlo en el array del nuevo destino                              ║
 * ║     3. Eliminar del destino anterior                                      ║
 * ║                                                                           ║
 * ║  ✏️ CAMBIAR CATEGORÍA:                                                     ║
 * ║     Modificar el campo "categoria" del trabajador                         ║
 * ║     Categorías: OACI, MCB, Cabo, Bombero de inventario, etc.              ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * NOTA: Los cambios en el JSON se reflejan automáticamente tras recargar la app
 * 
 * ============================================================================
 */

import plantillaData from './plantilla-sepei.json';

// ============================================================================
// TIPOS
// ============================================================================

export interface TrabajadorOficial {
  nombre: string;
  apellidos: string;
  destino: string;
  categoria: string;
}

export type EstadoPlantilla = 'en_plantilla' | 'cambios_detectados' | 'no_en_plantilla';

export interface ResultadoBusqueda {
  encontrado: boolean;
  coincidencia?: TrabajadorOficial;
  similitud?: number;
}

export interface EstadoPlantillaResult {
  estado: EstadoPlantilla;
  detalles?: TrabajadorOficial;
  diferencias?: { campo: string; valor: string; valorOficial: string }[];
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================

/**
 * Convierte el JSON organizado por destinos a un array plano de trabajadores
 */
function cargarPlantilla(): TrabajadorOficial[] {
  const trabajadores: TrabajadorOficial[] = [];
  const destinos = plantillaData.destinos as Record<string, Array<{nombre: string; apellidos: string; categoria: string}>>;
  
  for (const [destino, empleados] of Object.entries(destinos)) {
    for (const empleado of empleados) {
      trabajadores.push({
        nombre: empleado.nombre,
        apellidos: empleado.apellidos,
        destino: destino,
        categoria: empleado.categoria
      });
    }
  }
  
  return trabajadores;
}

// Plantilla cargada (se actualiza automáticamente al importar)
export const plantillaOficialSEPEI: TrabajadorOficial[] = cargarPlantilla();

// ============================================================================
// FUNCIONES DE CONSULTA
// ============================================================================

/**
 * Obtiene la metadata de la plantilla (versión, fecha, etc.)
 */
export function getPlantillaMetadata() {
  return plantillaData._metadata;
}

/**
 * Obtiene la lista de destinos disponibles
 */
export function getDestinos(): string[] {
  return Object.keys(plantillaData.destinos);
}

/**
 * Obtiene trabajadores filtrados por destino
 */
export function getTrabajadoresPorDestino(destino: string): TrabajadorOficial[] {
  return plantillaOficialSEPEI.filter(t => t.destino === destino);
}

/**
 * Obtiene estadísticas de la plantilla
 */
export function getEstadisticasPlantilla() {
  const destinos = getDestinos();
  const stats: Record<string, number> = {};
  
  for (const destino of destinos) {
    stats[destino] = getTrabajadoresPorDestino(destino).length;
  }
  
  return {
    totalTrabajadores: plantillaOficialSEPEI.length,
    porDestino: stats,
    fechaActualizacion: plantillaData._metadata.fechaActualizacion
  };
}

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN Y COMPARACIÓN
// ============================================================================

/**
 * Normaliza texto para comparaciones:
 * - Convierte a minúsculas
 * - Elimina acentos (á->a, é->e, etc.)
 * - Elimina caracteres especiales (comas, puntos, guiones)
 * - Normaliza espacios múltiples
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  let normalized = text
    .toLowerCase()                          // Minúsculas primero
    .replace(/ñ/gi, 'n')                    // Reemplazar ñ ANTES de NFD (case insensitive)
    .replace(/Ñ/g, 'n')                     // Por si acaso
    .normalize('NFD')                        // Descomponer caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '')        // Eliminar diacríticos (acentos)
    .replace(/[,.\-_'"´`]/g, ' ')           // Comas, puntos y similares -> espacio
    .replace(/[^a-z0-9\s]/g, '')            // Eliminar cualquier otro caracter especial
    .replace(/\s+/g, ' ')                    // Múltiples espacios -> uno solo
    .trim();
  
  return normalized;
}

/**
 * Extrae todas las "palabras significativas" de un texto (mínimo 2 caracteres)
 */
function extraerPalabras(texto: string): string[] {
  return normalizeText(texto)
    .split(' ')
    .filter(p => p.length >= 2)
    .sort(); // Ordenar para comparaciones consistentes
}

/**
 * Calcula la distancia de Levenshtein entre dos strings (ediciones mínimas)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // eliminación
          dp[i][j - 1] + 1,     // inserción
          dp[i - 1][j - 1] + 1  // sustitución
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calcula similitud entre dos strings usando Levenshtein (0-1)
 */
function calcularSimilitudLevenshtein(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const distancia = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  
  return 1 - (distancia / maxLen);
}

/**
 * Calcula similitud entre dos strings (0-1)
 */
function calcularSimilitud(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Verificar si uno contiene al otro
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.95;
  }
  
  // Verificar palabras en común
  const palabras1 = s1.split(' ').filter(p => p.length > 1);
  const palabras2 = s2.split(' ').filter(p => p.length > 1);
  
  let palabrasCoincidentes = 0;
  for (const p1 of palabras1) {
    for (const p2 of palabras2) {
      // Coincidencia exacta o muy similar (permite 1-2 errores tipográficos)
      if (p1 === p2 || p1.includes(p2) || p2.includes(p1)) {
        palabrasCoincidentes++;
        break;
      }
      // Permitir errores tipográficos para palabras largas
      if (p1.length >= 4 && p2.length >= 4) {
        const similitudPalabra = calcularSimilitudLevenshtein(p1, p2);
        if (similitudPalabra >= 0.75) {
          palabrasCoincidentes++;
          break;
        }
      }
    }
  }
  
  return palabrasCoincidentes / Math.max(palabras1.length, palabras2.length);
}

// ============================================================================
// FUNCIONES DE BÚSQUEDA Y VERIFICACIÓN
// ============================================================================

/**
 * Busca un trabajador en la plantilla oficial por nombre y apellidos
 * Algoritmo mejorado que tolera:
 * - Errores tipográficos
 * - Nombres en diferente orden
 * - Apellidos con/sin comas
 * - Variaciones en acentos
 */
export function buscarEnPlantillaOficial(nombre: string, apellidos?: string): ResultadoBusqueda {
  const nombreNorm = normalizeText(nombre);
  const apellidosNorm = apellidos ? normalizeText(apellidos) : '';
  
  // Crear todas las palabras del nombre del usuario (sin importar orden)
  const todasPalabrasUsuario = `${nombreNorm} ${apellidosNorm}`.split(' ').filter(p => p.length > 1);
  
  let mejorCoincidencia: TrabajadorOficial | undefined;
  let mejorSimilitud = 0;
  
  for (const trabajador of plantillaOficialSEPEI) {
    const nombreOficialNorm = normalizeText(trabajador.nombre);
    // Limpiar apellidos: quitar comas y normalizar
    const apellidosOficialNorm = normalizeText(trabajador.apellidos.replace(/,/g, ' '));
    
    const todasPalabrasOficial = `${nombreOficialNorm} ${apellidosOficialNorm}`.split(' ').filter(p => p.length > 1);
    
    // ========== MÉTODO 1: Coincidencia por palabras ==========
    let palabrasCoincidentes = 0;
    const palabrasUsadas = new Set<number>();
    
    for (const palabraUsuario of todasPalabrasUsuario) {
      for (let i = 0; i < todasPalabrasOficial.length; i++) {
        if (palabrasUsadas.has(i)) continue;
        
        const palabraOficial = todasPalabrasOficial[i];
        
        // Coincidencia exacta
        if (palabraUsuario === palabraOficial) {
          palabrasCoincidentes++;
          palabrasUsadas.add(i);
          break;
        }
        
        // Una palabra contiene a la otra
        if (palabraUsuario.includes(palabraOficial) || palabraOficial.includes(palabraUsuario)) {
          palabrasCoincidentes += 0.9;
          palabrasUsadas.add(i);
          break;
        }
        
        // Similitud Levenshtein para detectar typos (solo palabras largas)
        if (palabraUsuario.length >= 3 && palabraOficial.length >= 3) {
          const similitud = calcularSimilitudLevenshtein(palabraUsuario, palabraOficial);
          if (similitud >= 0.7) {
            palabrasCoincidentes += similitud;
            palabrasUsadas.add(i);
            break;
          }
        }
      }
    }
    
    // Calcular score basado en palabras coincidentes
    const totalPalabras = Math.max(todasPalabrasUsuario.length, todasPalabrasOficial.length);
    const similitudPalabras = totalPalabras > 0 ? palabrasCoincidentes / totalPalabras : 0;
    
    // ========== MÉTODO 2: Coincidencia de primer apellido ==========
    const primerApellidoUsuario = apellidosNorm.split(' ')[0];
    const primerApellidoOficial = apellidosOficialNorm.split(' ')[0];
    
    let similitudPrimerApellido = 0;
    if (primerApellidoUsuario && primerApellidoOficial) {
      similitudPrimerApellido = calcularSimilitudLevenshtein(primerApellidoUsuario, primerApellidoOficial);
    }
    
    // ========== MÉTODO 3: Coincidencia de nombre ==========
    const similitudNombre = calcularSimilitudLevenshtein(nombreNorm, nombreOficialNorm);
    
    // ========== Calcular similitud final ==========
    // Usar el mejor de los métodos
    let similitudFinal = Math.max(
      similitudPalabras,
      (similitudNombre * 0.4 + similitudPrimerApellido * 0.6)
    );
    
    // Bonus si nombre y primer apellido coinciden bien
    if (similitudNombre >= 0.8 && similitudPrimerApellido >= 0.8) {
      similitudFinal = Math.max(similitudFinal, 0.95);
    }
    
    // Coincidencia exacta de nombre y primer apellido
    if (nombreNorm === nombreOficialNorm && primerApellidoUsuario === primerApellidoOficial) {
      return {
        encontrado: true,
        coincidencia: trabajador,
        similitud: 1
      };
    }
    
    // Guardar mejor coincidencia
    if (similitudFinal > mejorSimilitud) {
      mejorSimilitud = similitudFinal;
      mejorCoincidencia = trabajador;
    }
  }
  
  // Umbral más bajo (0.55) para permitir más coincidencias
  if (mejorCoincidencia && mejorSimilitud >= 0.55) {
    return {
      encontrado: true,
      coincidencia: mejorCoincidencia,
      similitud: mejorSimilitud
    };
  }
  
  return { encontrado: false };
}

/**
 * Obtiene el estado de un usuario respecto a la plantilla oficial
 * 
 * Estados posibles:
 * - en_plantilla: El usuario está en la plantilla y sus datos coinciden
 * - cambios_detectados: El usuario está pero hay diferencias (ej: cambio de destino)
 * - no_en_plantilla: El usuario NO aparece en la plantilla oficial
 */
export function getEstadoPlantilla(
  nombre: string, 
  apellidos?: string,
  destino?: string
): EstadoPlantillaResult {
  const resultado = buscarEnPlantillaOficial(nombre, apellidos);
  
  if (!resultado.encontrado || !resultado.coincidencia) {
    return { estado: 'no_en_plantilla' };
  }
  
  // Verificar si hay cambios en el destino
  const diferencias: { campo: string; valor: string; valorOficial: string }[] = [];
  
  if (destino && resultado.coincidencia) {
    const destinoNorm = normalizeText(destino);
    const destinoOficialNorm = normalizeText(resultado.coincidencia.destino);
    
    // Comparar destinos de forma más flexible
    const destinoCoincide = destinoNorm.includes(destinoOficialNorm) || 
                           destinoOficialNorm.includes(destinoNorm) ||
                           destinoNorm === destinoOficialNorm;
    
    if (!destinoCoincide) {
      diferencias.push({
        campo: 'destino',
        valor: destino,
        valorOficial: resultado.coincidencia.destino
      });
    }
  }
  
  if (diferencias.length > 0) {
    return { 
      estado: 'cambios_detectados', 
      detalles: resultado.coincidencia,
      diferencias 
    };
  }
  
  return { 
    estado: 'en_plantilla', 
    detalles: resultado.coincidencia 
  };
}

// ============================================================================
// COLORES PARA LA UI
// ============================================================================

export const COLORES_ESTADO_PLANTILLA = {
  en_plantilla: {
    bg: 'bg-green-500/5',
    border: 'border-l-green-500',
    text: 'text-green-400',
    badge: '✓ En plantilla'
  },
  cambios_detectados: {
    bg: 'bg-amber-500/10',
    border: 'border-l-amber-500',
    text: 'text-amber-400',
    badge: '⚠️ Cambios detectados'
  },
  no_en_plantilla: {
    bg: 'bg-red-500/10',
    border: 'border-l-red-500',
    text: 'text-red-400',
    badge: '❌ No en plantilla'
  }
};

// ============================================================================
// FUNCIONES DE DEBUG
// ============================================================================

/**
 * Muestra información de debug de la plantilla en consola
 */
export function debugPlantilla() {
  console.log('📋 Plantilla SEPEI cargada:');
  console.log(`   Total trabajadores: ${plantillaOficialSEPEI.length}`);
  console.log(`   Fecha actualización: ${plantillaData._metadata.fechaActualizacion}`);
  console.log('   Distribución por destino:');
  const stats = getEstadisticasPlantilla();
  for (const [destino, count] of Object.entries(stats.porDestino)) {
    console.log(`     - ${destino}: ${count}`);
  }
}

/**
 * DEBUG: Función para probar la búsqueda de un usuario específico
 * Úsala en la consola del navegador: debugBusqueda("Juan", "García López")
 */
export function debugBusqueda(nombre: string, apellidos?: string) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 DEBUG BÚSQUEDA DE USUARIO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📝 Input original:     nombre="${nombre}" apellidos="${apellidos || ''}"`);
  
  const nombreNorm = normalizeText(nombre);
  const apellidosNorm = apellidos ? normalizeText(apellidos) : '';
  console.log(`📝 Normalizado:        nombre="${nombreNorm}" apellidos="${apellidosNorm}"`);
  
  const palabrasUsuario = `${nombreNorm} ${apellidosNorm}`.split(' ').filter(p => p.length > 1);
  console.log(`📝 Palabras usuario:   [${palabrasUsuario.join(', ')}]`);
  
  console.log('\n🔎 Buscando coincidencias en plantilla...\n');
  
  const candidatos: { trabajador: TrabajadorOficial; similitud: number; detalles: string }[] = [];
  
  for (const trabajador of plantillaOficialSEPEI) {
    const nombreOficialNorm = normalizeText(trabajador.nombre);
    const apellidosOficialNorm = normalizeText(trabajador.apellidos.replace(/,/g, ' '));
    const palabrasOficial = `${nombreOficialNorm} ${apellidosOficialNorm}`.split(' ').filter(p => p.length > 1);
    
    // Contar coincidencias
    let coincidencias = 0;
    const detallesCoincidencia: string[] = [];
    
    for (const pu of palabrasUsuario) {
      for (const po of palabrasOficial) {
        if (pu === po) {
          coincidencias++;
          detallesCoincidencia.push(`"${pu}" = "${po}" (exacto)`);
          break;
        }
        const sim = calcularSimilitudLevenshtein(pu, po);
        if (sim >= 0.7) {
          coincidencias += sim;
          detallesCoincidencia.push(`"${pu}" ≈ "${po}" (${(sim*100).toFixed(0)}%)`);
          break;
        }
      }
    }
    
    const similitud = coincidencias / Math.max(palabrasUsuario.length, palabrasOficial.length);
    
    if (similitud >= 0.3) { // Mostrar candidatos con al menos algo de similitud
      candidatos.push({
        trabajador,
        similitud,
        detalles: detallesCoincidencia.join(', ')
      });
    }
  }
  
  // Ordenar por similitud
  candidatos.sort((a, b) => b.similitud - a.similitud);
  
  console.log(`📊 Encontrados ${candidatos.length} candidatos potenciales:\n`);
  
  for (const c of candidatos.slice(0, 10)) {
    const estado = c.similitud >= 0.55 ? '✅ COINCIDE' : '❌ Descartado';
    console.log(`${estado} [${(c.similitud*100).toFixed(0)}%] ${c.trabajador.nombre} ${c.trabajador.apellidos}`);
    console.log(`   Destino: ${c.trabajador.destino}`);
    console.log(`   Coincidencias: ${c.detalles}`);
    console.log('');
  }
  
  // Resultado final
  const resultado = buscarEnPlantillaOficial(nombre, apellidos);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 RESULTADO FINAL:');
  if (resultado.encontrado) {
    console.log(`   ✅ ENCONTRADO con similitud ${((resultado.similitud || 0)*100).toFixed(0)}%`);
    console.log(`   👤 ${resultado.coincidencia?.nombre} ${resultado.coincidencia?.apellidos}`);
    console.log(`   📍 ${resultado.coincidencia?.destino}`);
  } else {
    console.log('   ❌ NO ENCONTRADO en la plantilla');
  }
  console.log('═══════════════════════════════════════════════════════════');
  
  return resultado;
}

// Hacer disponible en window para uso en consola
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).debugBusqueda = debugBusqueda;
  (window as unknown as Record<string, unknown>).debugPlantilla = debugPlantilla;
  (window as unknown as Record<string, unknown>).plantillaSEPEI = plantillaOficialSEPEI;
}
