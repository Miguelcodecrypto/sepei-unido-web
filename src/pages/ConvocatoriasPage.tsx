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
  Lock,
  ArrowLeft,
  Loader2,
  X,
  Info,
  SlidersHorizontal,
  LogIn,
  UserCheck,
} from 'lucide-react';
import { PROVINCIAS_ES, detectProvincia, getProvinciaColor, type Provincia } from '../utils/provincias';
import { getCurrentUser, type SessionUser } from '../services/sessionService';

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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConvocatoriasPage() {
  // Estado de autenticación de usuario registrado
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

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

  // ── Verificar autenticación de usuario ─────────────────────────────────────

  useEffect(() => {
    async function checkUserAuth() {
      setCheckingAuth(true);
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (e) {
        console.error('Error verificando autenticación:', e);
        setCurrentUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkUserAuth();
  }, []);

  // ── Carga de datos ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!currentUser) return; // Solo cargar si hay usuario autenticado
    
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      // Timeout de 90 segundos para móviles con conexión lenta
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
      const resp = await fetch('/api/boe-search', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      clearTimeout(timeoutId);
      
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}${errorText ? `: ${errorText}` : ''}`);
      }
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
      // Mejorar mensajes de error para el usuario
      let errorMsg = 'Error desconocido';
      if (e.name === 'AbortError') {
        errorMsg = 'La conexión tardó demasiado. Intenta de nuevo.';
      } else if (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')) {
        errorMsg = 'Error de conexión. Verifica tu conexión a internet.';
      } else if (e.message) {
        errorMsg = e.message;
      }
      setError(errorMsg);
      console.error('[BOE Search Error]', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Cargar datos cuando el usuario esté autenticado
  useEffect(() => {
    if (currentUser && !checkingAuth) {
      fetchData();
    }
  }, [currentUser, checkingAuth, fetchData]);

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

  // ─────────────────────────────────────────────────────────────────────────────

  // Pantalla de carga mientras se verifica autenticación
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Pantalla de acceso restringido para usuarios no autenticados
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        {/* Header mínimo */}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/60 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </a>
          </div>
        </header>

        {/* Contenido de acceso restringido */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10 text-orange-400" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h1>
              <p className="text-gray-400">
                El buscador de convocatorias del BOE está disponible solo para usuarios registrados de SEPEI UNIDO.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">¿Ya tienes cuenta?</p>
                  <p className="text-gray-500 text-xs">Inicia sesión desde la página principal</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">¿Eres bombero del SEPEI?</p>
                  <p className="text-gray-500 text-xs">Regístrate para acceder a todas las funcionalidades</p>
                </div>
              </div>
            </div>

            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-xl font-semibold transition-all"
            >
              <LogIn className="w-5 h-5" />
              Ir a Iniciar Sesión
            </a>
          </div>
        </div>
      </div>
    );
  }

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
    </div>
  );
}

// ─── Tarjeta de resultado ────────────────────────────────────────────────────

interface ResultCardProps {
  item: EnrichedResult;
  expanded: boolean;
  onToggle: () => void;
}

function ResultCard({ item, expanded, onToggle }: ResultCardProps) {
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
          </div>
        </div>
      )}
    </article>
  );
}
