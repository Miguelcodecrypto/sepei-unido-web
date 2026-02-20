/**
 * Script de debug para verificar coincidencias de la plantilla
 * Ejecutar en la consola del navegador para ver qué está fallando
 */

import { plantillaOficialSEPEI, normalizeText, buscarEnPlantillaOficial } from './plantillaOficialSEPEI';

// Función para debug - mostrar todas las comparaciones
export function debugComparacion(nombre: string, apellidos?: string) {
  console.log('='.repeat(60));
  console.log(`🔍 Buscando: "${nombre}" "${apellidos || ''}"`);
  console.log('='.repeat(60));
  
  const nombreNorm = normalizeText(nombre);
  const apellidosNorm = apellidos ? normalizeText(apellidos) : '';
  
  console.log(`   Normalizado: "${nombreNorm}" "${apellidosNorm}"`);
  
  const coincidencias: Array<{trabajador: typeof plantillaOficialSEPEI[0], similitud: number}> = [];
  
  for (const trabajador of plantillaOficialSEPEI) {
    const nombreOficialNorm = normalizeText(trabajador.nombre);
    const apellidosOficialNorm = normalizeText(trabajador.apellidos);
    
    // Verificar si hay alguna palabra en común
    const palabrasUsuario = `${nombreNorm} ${apellidosNorm}`.split(' ').filter(p => p.length > 2);
    const palabrasOficial = `${nombreOficialNorm} ${apellidosOficialNorm}`.split(' ').filter(p => p.length > 2);
    
    const palabrasComunes = palabrasUsuario.filter(p => 
      palabrasOficial.some(po => po.includes(p) || p.includes(po))
    );
    
    if (palabrasComunes.length > 0) {
      const similitud = palabrasComunes.length / Math.max(palabrasUsuario.length, palabrasOficial.length);
      coincidencias.push({ trabajador, similitud });
    }
  }
  
  // Ordenar por similitud
  coincidencias.sort((a, b) => b.similitud - a.similitud);
  
  console.log(`\n📋 Posibles coincidencias (${coincidencias.length}):`);
  coincidencias.slice(0, 5).forEach((c, i) => {
    console.log(`   ${i+1}. ${c.trabajador.nombre} ${c.trabajador.apellidos} (${c.trabajador.destino}) - Similitud: ${(c.similitud * 100).toFixed(0)}%`);
  });
  
  const resultado = buscarEnPlantillaOficial(nombre, apellidos);
  console.log(`\n✅ Resultado final:`, resultado.encontrado ? `Encontrado: ${resultado.coincidencia?.nombre} ${resultado.coincidencia?.apellidos}` : 'NO ENCONTRADO');
  
  return resultado;
}

// Exportar la plantilla para inspección
export function verPlantilla() {
  console.log('📋 Plantilla oficial SEPEI:');
  console.log(`   Total: ${plantillaOficialSEPEI.length} trabajadores`);
  
  const porDestino: Record<string, string[]> = {};
  plantillaOficialSEPEI.forEach(t => {
    if (!porDestino[t.destino]) porDestino[t.destino] = [];
    porDestino[t.destino].push(`${t.nombre} ${t.apellidos}`);
  });
  
  Object.entries(porDestino).forEach(([destino, trabajadores]) => {
    console.log(`\n🏢 ${destino} (${trabajadores.length}):`);
    trabajadores.forEach(t => console.log(`   - ${t}`));
  });
}

// Buscar por apellido parcial
export function buscarPorApellido(apellido: string) {
  const apellidoNorm = normalizeText(apellido);
  const encontrados = plantillaOficialSEPEI.filter(t => 
    normalizeText(t.apellidos).includes(apellidoNorm)
  );
  
  console.log(`🔍 Buscando apellido "${apellido}":`);
  encontrados.forEach(t => {
    console.log(`   - ${t.nombre} ${t.apellidos} (${t.destino})`);
  });
  
  return encontrados;
}
