import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  Search,
  ExternalLink,
  FileText,
  RefreshCw,
  AlertCircle,
  Filter,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Building2,
  Newspaper,
  Lock,
  CheckCircle,
  ArrowLeft,
  Loader2,
  X,
  Info,
  SlidersHorizontal,
  Copy,
} from 'lucide-react';
import { PROVINCIAS_ES, detectProvincia, getProvinciaColor, type Provincia } from '../utils/provincias';
import { createAnnouncement } from '../services/announcementDatabase';
import { login, isAuthenticated } from '../services/authService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BoeResult {
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

interface EnrichedResult extends BoeResult {
  provincia: Provincia;
}

// ─── Configuración de tipos ───────────────────────────────────────────────────

const TIPO_STYLES: Record<string, { badge: string; border: string; bg: string }> = {
  OPE:          { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', border: 'border-emerald-500/30', bg: 'bg-emerald-900/10' },
  Convocatoria: { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',   border: 'border-orange-500/30',  bg: 'bg-orange-900/10'  },
  Bases:        { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',          border: 'border-blue-500/30',    bg: 'bg-blue-900/10'    },
  Resultado:    { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',    border: 'border-purple-500/30',  bg: 'bg-purple-900/10'  },
  Resolución:   { badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',   border: 'border-yellow-500/30',  bg: 'bg-yellow-900/10'  },
  Anuncio:      { badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',             border: 'border-sky-500/30',     bg: 'bg-sky-900/10'     },
  Publicación:  { badge: 'bg-slate-500/20 text-slate-300 border-slate-600/40',       border: 'border-slate-600/30',   bg: 'bg-slate-800/30'   },
};

const TIPOS_FILTER = ['Todos', 'OPE', 'Convocatoria', 'Bases', 'Resultado', 'Resolución', 'Anuncio'];

// ─── Generador de contenido de noticia ───────────────────────────────────────

function generarNoticiaContent(item: EnrichedResult): { titulo: string; contenido: string } {
  const entidad = item.departamento || item.titulo.split('.')[0]?.trim() || 'Entidad desconocida';
  const localidad = item.provincia !== 'Sin clasificar' ? ` – ${item.provincia}` : '';
  const tipoLabel = item.tipo === 'OPE' ? 'OPE (Oferta de Empleo Público)' : item.tipo;

  const titulo = `${item.tipo === 'OPE' ? '📋 OPE' : '🔥 Convocatoria'} Bombero${localidad}`;

  const contenido = `El BOE ha publicado el **${item.fecha}** la siguiente ${tipoLabel.toLowerCase()}:

---

**${item.titulo}**

---

📋 **Tipo:** ${tipoLabel}
🏛️ **Entidad:** ${entidad}
📅 **Fecha publicación BOE:** ${item.fecha}
📍 **Provincia estimada:** ${item.provincia}

🔗 **[Ver publicación completa en el BOE](${item.urlHtm})**
${item.urlPdf ? `📄 **[Descargar PDF oficial](${item.urlPdf})**` : ''}

> 📌 *Referencia BOE: ${item.id}*

---

*Esta información ha sido importada automáticamente desde el motor de búsqueda BOE de SEPEI UNIDO. Se recomienda verificar los plazos y requisitos en la publicación oficial.*`;

  return { titulo, contenido };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConvocatoriasPage() {
  const [rawResults, setRawResults] = useState<EnrichedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [totalBOE, setTotalBOE] = useState(0);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>('Todas');
  const [anioFiltro, setAnioFiltro] = useState<string>('Todos');
  const [showFilters, setShowFilters] = useState(false);

  // Paginación
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  // Expandir tarjeta
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal crear noticia
  const [noticiaModal, setNoticiaModal] = useState<EnrichedResult | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [creatingNews, setCreatingNews] = useState(false);
  const [newsSuccess, setNewsSuccess] = useState(false);
  const [newsError, setNewsError] = useState('');

  // ── Carga de datos ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      const resp = await fetch('/api/boe-search');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (!data.ok) throw new Error(data.error || 'Error en la respuesta');

      // Enriquecer con provincia detectada
      const enriched: EnrichedResult[] = (data.results as BoeResult[]).map(item => ({
        ...item,
        provincia: detectProvincia(item.titulo, item.departamento),
      }));

      setRawResults(enriched);
      setTotalBOE(data.total);
      setLastFetch(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Comprobar si ya está autenticado como admin
    setAdminAuthed(isAuthenticated());
  }, [fetchData]);

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const años = useMemo(() => {
    const set = new Set(rawResults.map(r => String(r.anio)));
    return ['Todos', ...Array.from(set).sort((a, b) => Number(b) - Number(a))];
  }, [rawResults]);

  const provinciasConResultados = useMemo(() => {
    const set = new Set(rawResults.map(r => r.provincia));
    return ['Todas', ...PROVINCIAS_ES.filter(p => set.has(p)), ...(set.has('Sin clasificar') ? ['Sin clasificar'] : [])];
  }, [rawResults]);

  const filtered = useMemo(() => {
    return rawResults.filter(item => {
      if (tipoFiltro !== 'Todos' && item.tipo !== tipoFiltro) return false;
      if (provinciaFiltro !== 'Todas' && item.provincia !== provinciaFiltro) return false;
      if (anioFiltro !== 'Todos' && String(item.anio) !== anioFiltro) return false;
      if (searchText.trim()) {
        // Normalizar quitando acentos para búsqueda más flexible
        const normalize = (str: string) => str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const q = normalize(searchText);
        const titulo = normalize(item.titulo || '');
        const departamento = normalize(item.departamento || '');
        const provincia = normalize(item.provincia || '');
        if (!titulo.includes(q) && !departamento.includes(q) && !provincia.includes(q)) return false;
      }
      return true;
    });
  }, [rawResults, tipoFiltro, provinciaFiltro, anioFiltro, searchText]);

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  // Estadísticas por tipo
  const statsByTipo = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(r => { counts[r.tipo] = (counts[r.tipo] || 0) + 1; });
    return counts;
  }, [filtered]);

  // ── Auth admin ─────────────────────────────────────────────────────────────

  const handleAdminLogin = () => {
    const ok = login(adminPassword);
    if (ok) {
      setAdminAuthed(true);
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta');
    }
  };

  // ── Crear noticia ──────────────────────────────────────────────────────────

  const handleCrearNoticia = async (item: EnrichedResult) => {
    setCreatingNews(true);
    setNewsError('');
    setNewsSuccess(false);

    const { titulo, contenido } = generarNoticiaContent(item);
    const now = new Date().toISOString();

    const result = await createAnnouncement({
      titulo,
      contenido,
      categoria: 'noticia',
      publicado: false,
      destacado: false,
      fecha_publicacion: now,
      autor: 'BOE Search — SEPEI UNIDO',
    });

    if (result) {
      setNewsSuccess(true);
    } else {
      setNewsError('Error al crear la noticia. Inténtalo de nuevo.');
    }
    setCreatingNews(false);
  };

  const resetNoticiaModal = () => {
    setNoticiaModal(null);
    setNewsSuccess(false);
    setNewsError('');
    setAdminPassword('');
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── Cabecera ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/60 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
            </a>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="relative">
                <Flame className="w-8 h-8 text-orange-500" />
                <div className="absolute inset-0 bg-orange-500 blur-lg opacity-40" />
              </div>
              <div>
                <p className="text-white font-black text-base leading-none">SEPEI UNIDO</p>
                <p className="text-orange-400 text-xs font-semibold leading-none mt-0.5">Motor de Búsqueda BOE</p>
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3">
            {lastFetch && !loading && (
              <span className="hidden sm:inline text-gray-500 text-xs">
                Actualizado: {lastFetch}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Buscando…' : 'Actualizar'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/50 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-full uppercase tracking-wider">
              Datos Oficiales
            </span>
            <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">
              BOE — boe.es
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            Convocatorias de Bomberos en España
          </h1>
          <p className="text-gray-400 max-w-2xl text-base">
            Publicaciones oficiales del <span className="text-orange-400 font-semibold">Boletín Oficial del Estado</span> sobre
            oposiciones, OPEs y convocatorias de bomberos, organizadas por provincia.
          </p>

          {/* Info OPE */}
          <div className="mt-4 flex items-start gap-2 max-w-xl p-3 bg-emerald-900/20 border border-emerald-500/20 rounded-xl">
            <Info className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-emerald-300 text-sm">
              <strong>Las OPE</strong> son el primer aviso oficial de plazas convocadas próximamente.
              Búscalas en verde para anticiparte a las convocatorias.
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-6">

        {/* ── Controles de búsqueda ───────────────────────────────────────────── */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-4">

          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por municipio, provincia, entidad convocante…"
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 text-sm transition-all"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Fila de filtros rápidos */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Tipo */}
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_FILTER.map(tipo => {
                const s = tipo !== 'Todos' ? TIPO_STYLES[tipo] : null;
                const active = tipoFiltro === tipo;
                const count = tipo === 'Todos' ? filtered.length : (statsByTipo[tipo] ?? 0);
                return (
                  <button
                    key={tipo}
                    onClick={() => { setTipoFiltro(tipo); setPage(1); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? s ? `${s.badge}` : 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                        : 'bg-slate-800/60 border-slate-600/40 text-gray-400 hover:border-slate-500/60 hover:text-gray-300'
                    }`}
                  >
                    {tipo}{count > 0 && active && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Botón filtros avanzados */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                showFilters
                  ? 'bg-slate-700 border-slate-500 text-white'
                  : 'bg-slate-800/60 border-slate-600/40 text-gray-400 hover:text-gray-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros
              {(provinciaFiltro !== 'Todas' || anioFiltro !== 'Todos') && (
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
              )}
            </button>
          </div>

          {/* Filtros avanzados (provincia + año) */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-700/40">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={provinciaFiltro}
                  onChange={e => { setProvinciaFiltro(e.target.value); setPage(1); }}
                  className="bg-slate-900/80 border border-slate-600/50 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500/50 cursor-pointer"
                >
                  {provinciasConResultados.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={anioFiltro}
                  onChange={e => { setAnioFiltro(e.target.value); setPage(1); }}
                  className="bg-slate-900/80 border border-slate-600/50 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500/50 cursor-pointer"
                >
                  {años.map(a => (
                    <option key={a} value={a}>{a === 'Todos' ? 'Todos los años' : a}</option>
                  ))}
                </select>
              </div>

              {(provinciaFiltro !== 'Todas' || anioFiltro !== 'Todos') && (
                <button
                  onClick={() => { setProvinciaFiltro('Todas'); setAnioFiltro('Todos'); }}
                  className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Estado: cargando ───────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              <Flame className="absolute inset-0 m-auto w-7 h-7 text-orange-500 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Consultando el BOE…</p>
              <p className="text-gray-400 text-sm mt-1">Buscando convocatorias de bomberos en España</p>
            </div>
          </div>
        )}

        {/* ── Estado: error ──────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex items-start gap-3 p-5 bg-red-900/20 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold">No se pudo conectar con el BOE</p>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
              <button
                onClick={fetchData}
                className="mt-3 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg text-sm font-medium transition-all"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ── Resultados ────────────────────────────────────────────────────── */}
        {!loading && !error && (
          <>
            {/* Resumen */}
            {rawResults.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-bold">{filtered.length}</span> publicaciones encontradas
                  {totalBOE > 0 && <span className="text-gray-600"> ({totalBOE} del BOE)</span>}
                </p>

                {/* Mini stats por tipo */}
                <div className="flex flex-wrap gap-1.5 ml-auto">
                  {Object.entries(statsByTipo)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([tipo, count]) => {
                      const s = TIPO_STYLES[tipo];
                      return (
                        <span key={tipo} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${s?.badge ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                          {tipo}: {count}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Sin resultados */}
            {filtered.length === 0 && rawResults.length > 0 && (
              <div className="text-center py-14">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-white font-semibold">Sin resultados para este filtro</p>
                <p className="text-gray-500 text-sm mt-1">Prueba con otra provincia, tipo o año.</p>
              </div>
            )}

            {filtered.length === 0 && rawResults.length === 0 && !loading && (
              <div className="text-center py-14">
                <Flame className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-white font-semibold">No hay publicaciones disponibles</p>
                <p className="text-gray-500 text-sm mt-1">Pulsa "Actualizar" para consultar el BOE.</p>
              </div>
            )}

            {/* Grid de tarjetas */}
            {paginated.length > 0 && (
              <div className="space-y-2.5">
                {paginated.map(item => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onCrearNoticia={() => { setNoticiaModal(item); setNewsSuccess(false); setNewsError(''); }}
                  />
                ))}

                {paginated.length < filtered.length && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="px-6 py-3 bg-slate-800/70 hover:bg-slate-700/70 border border-slate-600/50 hover:border-orange-500/40 text-gray-300 hover:text-orange-300 rounded-xl text-sm font-medium transition-all"
                    >
                      <ChevronDown className="w-4 h-4 inline mr-2" />
                      Mostrar más ({filtered.length - paginated.length} restantes)
                    </button>
                  </div>
                )}

                <p className="text-center text-gray-600 text-xs pt-4">
                  Fuente:{' '}
                  <a href="https://www.boe.es" target="_blank" rel="noopener noreferrer"
                    className="text-orange-500/60 hover:text-orange-400 transition-colors">
                    Boletín Oficial del Estado (www.boe.es)
                  </a>
                  {' '}· Actualización diaria · Datos oficiales del Gobierno de España
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Modal: Crear Noticia SEPEI ────────────────────────────────────────── */}
      {noticiaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Crear Noticia SEPEI UNIDO</p>
                  <p className="text-gray-400 text-xs">La noticia se guardará como borrador para revisión</p>
                </div>
              </div>
              <button onClick={resetNoticiaModal} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Preview de la noticia */}
              {!newsSuccess && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-300">Publicación seleccionada:</p>
                    <div className={`p-4 rounded-xl border ${TIPO_STYLES[noticiaModal.tipo]?.bg ?? 'bg-slate-800/50'} ${TIPO_STYLES[noticiaModal.tipo]?.border ?? 'border-slate-600'}`}>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold border mb-2 ${TIPO_STYLES[noticiaModal.tipo]?.badge ?? ''}`}>
                        {noticiaModal.tipo}
                      </span>
                      <p className="text-white text-sm font-medium leading-snug">{noticiaModal.titulo}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                        <span>📅 {noticiaModal.fecha}</span>
                        <span>📍 {noticiaModal.provincia}</span>
                        <span className="text-gray-600">{noticiaModal.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Previsualización del contenido generado */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-300">Noticia generada automáticamente:</p>
                      <button
                        onClick={() => {
                          const { titulo, contenido } = generarNoticiaContent(noticiaModal);
                          navigator.clipboard.writeText(`${titulo}\n\n${contenido}`);
                        }}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar
                      </button>
                    </div>
                    <div className="bg-slate-950 border border-slate-700/50 rounded-xl p-4 text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {(() => { const { titulo, contenido } = generarNoticiaContent(noticiaModal); return `# ${titulo}\n\n${contenido}`; })()}
                    </div>
                  </div>

                  {/* Auth admin */}
                  {!adminAuthed ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Lock className="w-4 h-4 text-orange-400" />
                        <span>Introduce la contraseña de administrador para publicar</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Contraseña de administrador"
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                          className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                        />
                        <button
                          onClick={handleAdminLogin}
                          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-all"
                        >
                          Verificar
                        </button>
                      </div>
                      {authError && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{authError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                      <CheckCircle className="w-4 h-4" />
                      Administrador verificado. Listo para crear la noticia.
                    </div>
                  )}

                  {newsError && (
                    <p className="text-red-400 text-sm flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />{newsError}
                    </p>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={resetNoticiaModal}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-gray-300 rounded-xl text-sm font-medium transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleCrearNoticia(noticiaModal)}
                      disabled={!adminAuthed || creatingNews}
                      className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {creatingNews
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Creando…</>
                        : <><Newspaper className="w-4 h-4" />Crear Noticia (Borrador)</>
                      }
                    </button>
                  </div>
                </>
              )}

              {/* Éxito */}
              {newsSuccess && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">¡Noticia creada!</p>
                    <p className="text-gray-400 text-sm mt-1">
                      La noticia se ha guardado como <strong>borrador</strong>.<br />
                      Accede al panel de administración para revisarla y publicarla.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={resetNoticiaModal}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-gray-300 rounded-xl text-sm font-medium transition-all"
                    >
                      Cerrar
                    </button>
                    <a
                      href="/"
                      className="px-5 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 rounded-xl text-sm font-medium transition-all"
                    >
                      Ir al Panel Admin
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de resultado ────────────────────────────────────────────────────

interface ResultCardProps {
  item: EnrichedResult;
  expanded: boolean;
  onToggle: () => void;
  onCrearNoticia: () => void;
}

function ResultCard({ item, expanded, onToggle, onCrearNoticia }: ResultCardProps) {
  const s = TIPO_STYLES[item.tipo] ?? TIPO_STYLES['Publicación'];
  const provColor = getProvinciaColor(item.provincia);

  return (
    <article className={`border rounded-xl overflow-hidden transition-all duration-200 ${s.border} ${s.bg}`}>
      {/* Fila principal (siempre visible) */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
      >
        {/* Badges izquierda */}
        <div className="flex flex-col gap-1 shrink-0 pt-0.5">
          <span className={`px-2 py-0.5 rounded-md text-xs font-bold border text-center ${s.badge}`}>
            {item.tipo}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-xs border text-center ${provColor}`}>
            {item.provincia === 'Sin clasificar' ? '—' : item.provincia}
          </span>
        </div>

        {/* Título */}
        <p className={`flex-1 text-sm text-white font-medium leading-snug ${!expanded ? 'line-clamp-2' : ''}`}>
          {item.titulo}
        </p>

        {/* Fecha + chevron */}
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <span className="text-xs text-gray-400 whitespace-nowrap font-mono">{item.fecha}</span>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-500" />
            : <ChevronDown className="w-4 h-4 text-gray-500" />
          }
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-700/40 space-y-4">

          {/* Metadatos */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
            {item.departamento && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {item.departamento}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.provincia}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {item.fecha}
            </span>
            <span className="text-gray-600 font-mono">{item.id}</span>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
            <a
              href={item.urlHtm}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-medium transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver en BOE
            </a>

            {item.urlPdf && (
              <a
                href={item.urlPdf}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/40 text-gray-300 rounded-lg text-xs font-medium transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                Descargar PDF
              </a>
            )}

            <button
              onClick={e => { e.stopPropagation(); onCrearNoticia(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-medium transition-all ml-auto"
            >
              <Newspaper className="w-3.5 h-3.5" />
              Crear Noticia SEPEI
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
