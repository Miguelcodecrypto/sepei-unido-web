/**
 * Utilidad de detección de provincias españolas
 * para el motor de búsqueda de convocatorias BOE
 */

// ─── Lista completa de las 52 provincias ─────────────────────────────────────

export const PROVINCIAS_ES = [
  'A Coruña',
  'Álava',
  'Albacete',
  'Alicante',
  'Almería',
  'Asturias',
  'Ávila',
  'Badajoz',
  'Illes Balears',
  'Barcelona',
  'Burgos',
  'Cáceres',
  'Cádiz',
  'Cantabria',
  'Castellón',
  'Ceuta',
  'Ciudad Real',
  'Córdoba',
  'Cuenca',
  'Girona',
  'Granada',
  'Guadalajara',
  'Gipuzkoa',
  'Huelva',
  'Huesca',
  'Jaén',
  'La Rioja',
  'Las Palmas',
  'León',
  'Lleida',
  'Lugo',
  'Madrid',
  'Málaga',
  'Melilla',
  'Murcia',
  'Navarra',
  'Ourense',
  'Palencia',
  'Pontevedra',
  'Salamanca',
  'S.C. Tenerife',
  'Segovia',
  'Sevilla',
  'Soria',
  'Tarragona',
  'Teruel',
  'Toledo',
  'Valencia',
  'Valladolid',
  'Bizkaia',
  'Zamora',
  'Zaragoza',
] as const;

export type Provincia = typeof PROVINCIAS_ES[number] | 'Sin clasificar';

// ─── Mapa municipio/entidad → provincia ──────────────────────────────────────
// Incluye capitales de provincia, municipios con parques de bomberos relevantes
// y denominaciones habituales en los títulos del BOE.

const MUNICIPIO_A_PROVINCIA: Record<string, Provincia> = {
  // ── A Coruña ──────────────────────────────────────────────────────────────
  'A Coruña': 'A Coruña', 'La Coruña': 'A Coruña', 'Coruña': 'A Coruña',
  'Santiago de Compostela': 'A Coruña', 'Ferrol': 'A Coruña',

  // ── Álava ─────────────────────────────────────────────────────────────────
  'Vitoria': 'Álava', 'Vitoria-Gasteiz': 'Álava', 'Gasteiz': 'Álava', 'Álava': 'Álava',

  // ── Albacete ──────────────────────────────────────────────────────────────
  'Albacete': 'Albacete', 'Hellín': 'Albacete', 'Almansa': 'Albacete',
  'Villarrobledo': 'Albacete', 'Caudete': 'Albacete', 'La Roda': 'Albacete',
  'Diputación de Albacete': 'Albacete',

  // ── Alicante ──────────────────────────────────────────────────────────────
  'Alicante': 'Alicante', 'Elche': 'Alicante', 'Torrevieja': 'Alicante',
  'Orihuela': 'Alicante', 'Benidorm': 'Alicante', 'Elda': 'Alicante',
  'Alcoy': 'Alicante', 'Alcoi': 'Alicante', 'Villena': 'Alicante',
  'Crevillent': 'Alicante', 'Sant Vicent del Raspeig': 'Alicante',
  'Mutxamel': 'Alicante', 'Santa Pola': 'Alicante', 'Petrer': 'Alicante',

  // ── Almería ───────────────────────────────────────────────────────────────
  'Almería': 'Almería', 'El Ejido': 'Almería', 'Roquetas de Mar': 'Almería',
  'Vícar': 'Almería', 'Níjar': 'Almería', 'Adra': 'Almería',

  // ── Asturias ──────────────────────────────────────────────────────────────
  'Oviedo': 'Asturias', 'Gijón': 'Asturias', 'Avilés': 'Asturias',
  'Siero': 'Asturias', 'Langreo': 'Asturias', 'Mieres': 'Asturias',
  'Asturias': 'Asturias', 'Principado de Asturias': 'Asturias',

  // ── Ávila ─────────────────────────────────────────────────────────────────
  'Ávila': 'Ávila',

  // ── Badajoz ───────────────────────────────────────────────────────────────
  'Badajoz': 'Badajoz', 'Mérida': 'Badajoz', 'Don Benito': 'Badajoz',
  'Villanueva de la Serena': 'Badajoz', 'Almendralejo': 'Badajoz',

  // ── Illes Balears ─────────────────────────────────────────────────────────
  'Palma': 'Illes Balears', 'Palma de Mallorca': 'Illes Balears',
  'Ibiza': 'Illes Balears', 'Eivissa': 'Illes Balears', 'Menorca': 'Illes Balears',
  'Maó': 'Illes Balears', 'Mahón': 'Illes Balears', 'Illes Balears': 'Illes Balears',
  'Islas Baleares': 'Illes Balears',

  // ── Barcelona ─────────────────────────────────────────────────────────────
  'Barcelona': 'Barcelona', 'Badalona': 'Barcelona', 'Hospitalet de Llobregat': 'Barcelona',
  "L'Hospitalet de Llobregat": 'Barcelona', 'Terrassa': 'Barcelona', 'Sabadell': 'Barcelona',
  'Mataró': 'Barcelona', 'Santa Coloma de Gramenet': 'Barcelona',
  'Cornellà de Llobregat': 'Barcelona', 'Sant Boi de Llobregat': 'Barcelona',
  'El Prat de Llobregat': 'Barcelona', 'Mollet del Vallès': 'Barcelona',
  'Rubí': 'Barcelona', 'Vilanova i la Geltrú': 'Barcelona', 'Castelldefels': 'Barcelona',
  'Granollers': 'Barcelona', 'Manresa': 'Barcelona', 'Vic': 'Barcelona',
  'Cerdanyola del Vallès': 'Barcelona', 'Sant Cugat del Vallès': 'Barcelona',

  // ── Burgos ────────────────────────────────────────────────────────────────
  'Burgos': 'Burgos', 'Miranda de Ebro': 'Burgos',

  // ── Cáceres ───────────────────────────────────────────────────────────────
  'Cáceres': 'Cáceres', 'Plasencia': 'Cáceres',

  // ── Cádiz ─────────────────────────────────────────────────────────────────
  'Cádiz': 'Cádiz', 'Jerez de la Frontera': 'Cádiz', 'Algeciras': 'Cádiz',
  'El Puerto de Santa María': 'Cádiz', 'San Fernando': 'Cádiz',
  'Chiclana de la Frontera': 'Cádiz', 'La Línea de la Concepción': 'Cádiz',
  'Sanlúcar de Barrameda': 'Cádiz', 'Rota': 'Cádiz', 'Puerto Real': 'Cádiz',

  // ── Cantabria ─────────────────────────────────────────────────────────────
  'Santander': 'Cantabria', 'Torrelavega': 'Cantabria', 'Cantabria': 'Cantabria',

  // ── Castellón ─────────────────────────────────────────────────────────────
  'Castellón de la Plana': 'Castellón', 'Castellón': 'Castellón',
  'Vila-real': 'Castellón', 'Burriana': 'Castellón', 'Vinaròs': 'Castellón',

  // ── Ceuta ─────────────────────────────────────────────────────────────────
  'Ceuta': 'Ceuta',

  // ── Ciudad Real ───────────────────────────────────────────────────────────
  'Ciudad Real': 'Ciudad Real', 'Puertollano': 'Ciudad Real',
  'Alcázar de San Juan': 'Ciudad Real', 'Tomelloso': 'Ciudad Real',

  // ── Córdoba ───────────────────────────────────────────────────────────────
  'Córdoba': 'Córdoba', 'Lucena': 'Córdoba', 'Montilla': 'Córdoba',
  'Cabra': 'Córdoba', 'Priego de Córdoba': 'Córdoba', 'Peñarroya-Pueblonuevo': 'Córdoba',

  // ── Cuenca ────────────────────────────────────────────────────────────────
  'Cuenca': 'Cuenca',

  // ── Girona ────────────────────────────────────────────────────────────────
  'Girona': 'Girona', 'Gerona': 'Girona', 'Figueres': 'Girona', 'Olot': 'Girona',
  'Salt': 'Girona', 'Blanes': 'Girona',

  // ── Granada ───────────────────────────────────────────────────────────────
  'Granada': 'Granada', 'Motril': 'Granada', 'Almuñécar': 'Granada',
  'Loja': 'Granada', 'Baza': 'Granada', 'Guadix': 'Granada',

  // ── Guadalajara ───────────────────────────────────────────────────────────
  'Guadalajara': 'Guadalajara',

  // ── Gipuzkoa ──────────────────────────────────────────────────────────────
  'San Sebastián': 'Gipuzkoa', 'Donostia': 'Gipuzkoa', 'Gipuzkoa': 'Gipuzkoa',
  'Guipúzcoa': 'Gipuzkoa', 'Irun': 'Gipuzkoa', 'Errenteria': 'Gipuzkoa',

  // ── Huelva ────────────────────────────────────────────────────────────────
  'Huelva': 'Huelva', 'Lepe': 'Huelva', 'Isla Cristina': 'Huelva',

  // ── Huesca ────────────────────────────────────────────────────────────────
  'Huesca': 'Huesca', 'Monzón': 'Huesca', 'Barbastro': 'Huesca',

  // ── Jaén ──────────────────────────────────────────────────────────────────
  'Jaén': 'Jaén', 'Linares': 'Jaén', 'Úbeda': 'Jaén', 'Baeza': 'Jaén',
  'Andújar': 'Jaén', 'Martos': 'Jaén',

  // ── La Rioja ──────────────────────────────────────────────────────────────
  'Logroño': 'La Rioja', 'La Rioja': 'La Rioja', 'Rioja': 'La Rioja',

  // ── Las Palmas ────────────────────────────────────────────────────────────
  'Las Palmas de Gran Canaria': 'Las Palmas', 'Las Palmas': 'Las Palmas',
  'Telde': 'Las Palmas', 'Arrecife': 'Las Palmas', 'Puerto del Rosario': 'Las Palmas',

  // ── León ──────────────────────────────────────────────────────────────────
  'León': 'León', 'Ponferrada': 'León', 'San Andrés del Rabanedo': 'León',

  // ── Lleida ────────────────────────────────────────────────────────────────
  'Lleida': 'Lleida', 'Lérida': 'Lleida',

  // ── Lugo ──────────────────────────────────────────────────────────────────
  'Lugo': 'Lugo',

  // ── Madrid ────────────────────────────────────────────────────────────────
  'Madrid': 'Madrid', 'Alcalá de Henares': 'Madrid', 'Leganés': 'Madrid',
  'Getafe': 'Madrid', 'Alcobendas': 'Madrid', 'Alcorcón': 'Madrid',
  'Fuenlabrada': 'Madrid', 'Móstoles': 'Madrid', 'Parla': 'Madrid',
  'Torrejón de Ardoz': 'Madrid', 'Pozuelo de Alarcón': 'Madrid',
  'Coslada': 'Madrid', 'Rivas-Vaciamadrid': 'Madrid', 'Las Rozas': 'Madrid',
  'Majadahonda': 'Madrid', 'Pinto': 'Madrid', 'Collado Villalba': 'Madrid',
  'Valdemoro': 'Madrid', 'Tres Cantos': 'Madrid', 'Boadilla del Monte': 'Madrid',
  'San Sebastián de los Reyes': 'Madrid', 'Aranjuez': 'Madrid',
  'Colmenar Viejo': 'Madrid', 'Arganda del Rey': 'Madrid', 'El Escorial': 'Madrid',
  'Comunidad de Madrid': 'Madrid',

  // ── Málaga ────────────────────────────────────────────────────────────────
  'Málaga': 'Málaga', 'Marbella': 'Málaga', 'Fuengirola': 'Málaga',
  'Vélez-Málaga': 'Málaga', 'Antequera': 'Málaga', 'Nerja': 'Málaga',
  'Torremolinos': 'Málaga', 'Benalmádena': 'Málaga', 'Mijas': 'Málaga',
  'Ronda': 'Málaga', 'Estepona': 'Málaga', 'Alhaurín de la Torre': 'Málaga',
  'Coin': 'Málaga',

  // ── Melilla ───────────────────────────────────────────────────────────────
  'Melilla': 'Melilla',

  // ── Murcia ────────────────────────────────────────────────────────────────
  'Murcia': 'Murcia', 'Cartagena': 'Murcia', 'Lorca': 'Murcia',
  'Molina de Segura': 'Murcia', 'Alcantarilla': 'Murcia', 'Yecla': 'Murcia',
  'Jumilla': 'Murcia', 'Cieza': 'Murcia', 'Mazarrón': 'Murcia',
  'San Javier': 'Murcia', 'Torre-Pacheco': 'Murcia', 'Águilas': 'Murcia',
  'Región de Murcia': 'Murcia',

  // ── Navarra ───────────────────────────────────────────────────────────────
  'Pamplona': 'Navarra', 'Iruña': 'Navarra', 'Navarra': 'Navarra',
  'Tudela': 'Navarra', 'Barañáin': 'Navarra',

  // ── Ourense ───────────────────────────────────────────────────────────────
  'Ourense': 'Ourense', 'Orense': 'Ourense',

  // ── Palencia ──────────────────────────────────────────────────────────────
  'Palencia': 'Palencia',

  // ── Pontevedra ────────────────────────────────────────────────────────────
  'Pontevedra': 'Pontevedra', 'Vigo': 'Pontevedra', 'Vilagarcía de Arousa': 'Pontevedra',
  'Redondela': 'Pontevedra',

  // ── Salamanca ─────────────────────────────────────────────────────────────
  'Salamanca': 'Salamanca',

  // ── Santa Cruz de Tenerife ────────────────────────────────────────────────
  'Santa Cruz de Tenerife': 'S.C. Tenerife', 'La Laguna': 'S.C. Tenerife',
  'Tenerife': 'S.C. Tenerife', 'Arona': 'S.C. Tenerife',
  'San Cristóbal de La Laguna': 'S.C. Tenerife',

  // ── Segovia ───────────────────────────────────────────────────────────────
  'Segovia': 'Segovia',

  // ── Sevilla ───────────────────────────────────────────────────────────────
  'Sevilla': 'Sevilla', 'Dos Hermanas': 'Sevilla', 'Alcalá de Guadaíra': 'Sevilla',
  'Utrera': 'Sevilla', 'Écija': 'Sevilla', 'Camas': 'Sevilla',
  'Mairena del Aljarafe': 'Sevilla', 'La Rinconada': 'Sevilla',
  'Lebrija': 'Sevilla', 'Morón de la Frontera': 'Sevilla',

  // ── Soria ─────────────────────────────────────────────────────────────────
  'Soria': 'Soria',

  // ── Tarragona ─────────────────────────────────────────────────────────────
  'Tarragona': 'Tarragona', 'Reus': 'Tarragona', 'Tortosa': 'Tarragona',
  'Salou': 'Tarragona', 'Cambrils': 'Tarragona',

  // ── Teruel ────────────────────────────────────────────────────────────────
  'Teruel': 'Teruel', 'Alcañiz': 'Teruel',

  // ── Toledo ────────────────────────────────────────────────────────────────
  'Toledo': 'Toledo', 'Talavera de la Reina': 'Toledo', 'Illescas': 'Toledo',

  // ── Valencia ──────────────────────────────────────────────────────────────
  'Valencia': 'Valencia', 'Torrent': 'Valencia', 'Gandia': 'Valencia',
  'Sagunto': 'Valencia', 'Paterna': 'Valencia', 'Burjassot': 'Valencia',
  'Mislata': 'Valencia', 'Manises': 'Valencia', 'Quart de Poblet': 'Valencia',
  'Aldaia': 'Valencia', 'Alzira': 'Valencia', 'Catarroja': 'Valencia',
  'Xàtiva': 'Valencia', 'Ontinyent': 'Valencia',

  // ── Valladolid ────────────────────────────────────────────────────────────
  'Valladolid': 'Valladolid', 'Laguna de Duero': 'Valladolid',

  // ── Bizkaia ───────────────────────────────────────────────────────────────
  'Bilbao': 'Bizkaia', 'Barakaldo': 'Bizkaia', 'Getxo': 'Bizkaia',
  'Bizkaia': 'Bizkaia', 'Vizcaya': 'Bizkaia', 'Basauri': 'Bizkaia',
  'Leioa': 'Bizkaia', 'Santurtzi': 'Bizkaia', 'Sestao': 'Bizkaia',

  // ── Zamora ────────────────────────────────────────────────────────────────
  'Zamora': 'Zamora',

  // ── Zaragoza ──────────────────────────────────────────────────────────────
  'Zaragoza': 'Zaragoza', 'Calatayud': 'Zaragoza', 'Ejea de los Caballeros': 'Zaragoza',
  'Utebo': 'Zaragoza',
};

// ─── Alias de provincias para detectar por nombre directo ────────────────────

const PROVINCIA_ALIASES: Record<string, Provincia> = {
  'a coruña': 'A Coruña', 'la coruña': 'A Coruña', 'coruña': 'A Coruña',
  'álava': 'Álava', 'alava': 'Álava', 'araba': 'Álava',
  'albacete': 'Albacete',
  'alicante': 'Alicante', 'alacant': 'Alicante',
  'almería': 'Almería', 'almeria': 'Almería',
  'asturias': 'Asturias', 'principado de asturias': 'Asturias',
  'ávila': 'Ávila', 'avila': 'Ávila',
  'badajoz': 'Badajoz',
  'balears': 'Illes Balears', 'baleares': 'Illes Balears', 'illes balears': 'Illes Balears',
  'barcelona': 'Barcelona',
  'burgos': 'Burgos',
  'cáceres': 'Cáceres', 'caceres': 'Cáceres',
  'cádiz': 'Cádiz', 'cadiz': 'Cádiz',
  'cantabria': 'Cantabria',
  'castellón': 'Castellón', 'castellon': 'Castellón', 'castelló': 'Castellón',
  'ceuta': 'Ceuta',
  'ciudad real': 'Ciudad Real',
  'córdoba': 'Córdoba', 'cordoba': 'Córdoba',
  'cuenca': 'Cuenca',
  'girona': 'Girona', 'gerona': 'Girona',
  'granada': 'Granada',
  'guadalajara': 'Guadalajara',
  'gipuzkoa': 'Gipuzkoa', 'guipúzcoa': 'Gipuzkoa', 'guipuzcoa': 'Gipuzkoa',
  'huelva': 'Huelva',
  'huesca': 'Huesca',
  'jaén': 'Jaén', 'jaen': 'Jaén',
  'la rioja': 'La Rioja', 'rioja': 'La Rioja',
  'las palmas': 'Las Palmas', 'gran canaria': 'Las Palmas',
  'león': 'León', 'leon': 'León',
  'lleida': 'Lleida', 'lérida': 'Lleida', 'lerida': 'Lleida',
  'lugo': 'Lugo',
  'madrid': 'Madrid', 'comunidad de madrid': 'Madrid',
  'málaga': 'Málaga', 'malaga': 'Málaga',
  'melilla': 'Melilla',
  'murcia': 'Murcia', 'región de murcia': 'Murcia',
  'navarra': 'Navarra', 'nafarroa': 'Navarra',
  'ourense': 'Ourense', 'orense': 'Ourense',
  'palencia': 'Palencia',
  'pontevedra': 'Pontevedra',
  'salamanca': 'Salamanca',
  'santa cruz de tenerife': 'S.C. Tenerife', 'tenerife': 'S.C. Tenerife',
  'segovia': 'Segovia',
  'sevilla': 'Sevilla',
  'soria': 'Soria',
  'tarragona': 'Tarragona',
  'teruel': 'Teruel',
  'toledo': 'Toledo',
  'valencia': 'Valencia', 'valència': 'Valencia',
  'valladolid': 'Valladolid',
  'bizkaia': 'Bizkaia', 'vizcaya': 'Bizkaia',
  'zamora': 'Zamora',
  'zaragoza': 'Zaragoza',
};

// ─── Función principal de detección ──────────────────────────────────────────

export function detectProvincia(titulo: string, departamento?: string): Provincia {
  const text = `${titulo} ${departamento ?? ''}`;
  const lower = text.toLowerCase();

  // 1. Buscar "Diputación (Provincial/Foral) de X" → mapear a provincia
  const dipM = lower.match(/diputaci[oó]n\s+(?:provincial\s+|foral\s+)?de\s+([a-záéíóúüñ\s\-]{2,40}?)(?:\.|,|\s{2}|$)/i);
  if (dipM) {
    const candidate = dipM[1].trim().toLowerCase();
    if (PROVINCIA_ALIASES[candidate]) return PROVINCIA_ALIASES[candidate];
  }

  // 2. Buscar "Ayuntamiento de X" → mapear municipio a provincia
  const aytoM = lower.match(/ayuntamiento\s+de\s+([a-záéíóúüñ\s\-']{2,50}?)(?:\.|,|\s{2}|$)/i);
  if (aytoM) {
    const city = aytoM[1].trim();
    // Capitalizar primera letra de cada palabra para buscar en el mapa
    const cityTitle = city.replace(/\b\w/g, l => l.toUpperCase());
    if (MUNICIPIO_A_PROVINCIA[cityTitle]) return MUNICIPIO_A_PROVINCIA[cityTitle];
    // Buscar con alias en minúsculas
    if (PROVINCIA_ALIASES[city.toLowerCase()]) return PROVINCIA_ALIASES[city.toLowerCase()];
  }

  // 3. Buscar "Mancomunidad/Consorcio de Bomberos de X"
  const consM = lower.match(/(?:mancomunidad|consorcio)\s+(?:de\s+)?(?:bomberos\s+(?:de|del?)\s+)?([a-záéíóúüñ\s\-]{2,40}?)(?:\.|,|\s{2}|$)/i);
  if (consM) {
    const candidate = consM[1].trim().toLowerCase();
    if (PROVINCIA_ALIASES[candidate]) return PROVINCIA_ALIASES[candidate];
  }

  // 4. Buscar nombre de provincia directamente en el texto (alias)
  // Ordenar por longitud desc para evitar coincidencias parciales
  const sortedAliases = Object.keys(PROVINCIA_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    if (lower.includes(alias)) return PROVINCIA_ALIASES[alias];
  }

  // 5. Buscar cualquier municipio del mapa en el texto
  const sortedMunicipios = Object.keys(MUNICIPIO_A_PROVINCIA).sort((a, b) => b.length - a.length);
  for (const municipio of sortedMunicipios) {
    if (lower.includes(municipio.toLowerCase())) return MUNICIPIO_A_PROVINCIA[municipio];
  }

  return 'Sin clasificar';
}

// ─── Colores por provincia (para badges) ─────────────────────────────────────

const PROVINCE_COLORS: Partial<Record<Provincia, string>> = {
  'Madrid': 'bg-red-900/40 text-red-300 border-red-500/40',
  'Barcelona': 'bg-blue-900/40 text-blue-300 border-blue-500/40',
  'Valencia': 'bg-orange-900/40 text-orange-300 border-orange-500/40',
  'Sevilla': 'bg-yellow-900/40 text-yellow-300 border-yellow-500/40',
  'Málaga': 'bg-teal-900/40 text-teal-300 border-teal-500/40',
  'Albacete': 'bg-amber-900/40 text-amber-300 border-amber-500/40',
};

export function getProvinciaColor(provincia: Provincia): string {
  return PROVINCE_COLORS[provincia] ?? 'bg-slate-800/50 text-slate-300 border-slate-600/40';
}
