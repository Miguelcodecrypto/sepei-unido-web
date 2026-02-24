import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
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
  CheckCircle,
  Loader2,
  X,
  Copy,
  Flame,
  SlidersHorizontal,
} from 'lucide-react';
import { PROVINCIAS_ES, detectProvincia, getProvinciaColor, type Provincia } from '../utils/provincias';
import { createAnnouncement } from '../services/announcementDatabase';

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

export default function BOEConvocatoriasAdmin() {
  const [rawResults, setRawResults] = useState<EnrichedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [totalBOE, setTotalBOE] = useState(0);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>('Todas');
  const [showFilters, setShowFilters] = useState(false);

  // Paginación
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Expandir tarjeta
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal crear noticia
  const [noticiaModal, setNoticiaModal] = useState<EnrichedResult | null>(null);
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
  }, [fetchData]);

  // ── Filtrado local ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let data = rawResults;

    if (tipoFiltro !== 'Todos') {
      data = data.filter(r => r.tipo === tipoFiltro);
    }

    if (provinciaFiltro !== 'Todas') {
      data = data.filter(r => r.provincia === provinciaFiltro);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      data = data.filter(r =>
        r.titulo.toLowerCase().includes(q) ||
        r.departamento.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }

    return data;
  }, [rawResults, tipoFiltro, provinciaFiltro, searchText]);

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  // Provincias disponibles en los resultados
  const provinciasDisponibles = useMemo(() => {
    const set = new Set<Provincia>();
    rawResults.forEach(r => set.add(r.provincia));
    return Array.from(set).sort();
  }, [rawResults]);

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
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            Convocatorias BOE — Crear Noticias
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Busca convocatorias de bomberos en el BOE y crea noticias para el sitio web
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Info */}
      {lastFetch && (
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>📊 {totalBOE} publicaciones encontradas</span>
          <span>🕒 Última consulta: {lastFetch}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por título, entidad o ID..."
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* Tipo */}
          <select
            value={tipoFiltro}
            onChange={e => { setTipoFiltro(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50"
          >
            {TIPOS_FILTER.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Provincia */}
          <select
            value={provinciaFiltro}
            onChange={e => { setProvinciaFiltro(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="Todas">Todas las provincias</option>
            {provinciasDisponibles.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Resultados */}
      {loading && rawResults.length === 0 ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Consultando el BOE...</p>
        </div>
      ) : (
        <>
          {filtered.length === 0 && rawResults.length > 0 && (
            <div className="text-center py-10 text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Sin resultados para este filtro</p>
            </div>
          )}

          {filtered.length === 0 && rawResults.length === 0 && !loading && (
            <div className="text-center py-10 text-gray-400">
              <Flame className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No hay publicaciones disponibles</p>
              <p className="text-sm mt-1">Pulsa "Actualizar" para consultar el BOE</p>
            </div>
          )}

          {/* Lista de resultados */}
          {paginated.length > 0 && (
            <div className="space-y-3">
              {paginated.map(item => {
                const s = TIPO_STYLES[item.tipo] ?? TIPO_STYLES['Publicación'];
                const isExpanded = expandedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-800/40 border ${s.border} rounded-xl overflow-hidden transition-all`}
                  >
                    {/* Cabecera */}
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-800/60 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${s.badge}`}>
                              {item.tipo}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {item.fecha}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `${getProvinciaColor(item.provincia)}20`,
                                color: getProvinciaColor(item.provincia),
                                borderColor: `${getProvinciaColor(item.provincia)}40`,
                              }}
                            >
                              📍 {item.provincia}
                            </span>
                          </div>
                          <p className="text-white text-sm font-medium line-clamp-2">{item.titulo}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); setNoticiaModal(item); setNewsSuccess(false); setNewsError(''); }}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                          >
                            <Newspaper className="w-3.5 h-3.5" />
                            Crear Noticia
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contenido expandido */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-slate-700/50 mt-0">
                        <div className="pt-3 space-y-3">
                          <p className="text-gray-300 text-sm">{item.titulo}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                            <span className="font-mono">{item.id}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={item.urlHtm}
                              target="_blank"
                              rel="noopener noreferrer"
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/40 text-gray-300 rounded-lg text-xs font-medium transition-all"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Descargar PDF
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mostrar más */}
              {paginated.length < filtered.length && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-5 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 text-gray-300 rounded-xl text-sm font-medium transition-all"
                  >
                    <ChevronDown className="w-4 h-4 inline mr-2" />
                    Mostrar más ({filtered.length - paginated.length} restantes)
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Modal: Crear Noticia ──────────────────────────────────────────────── */}
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
                      disabled={creatingNews}
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
                      Ve a la sección "Anuncios" para revisarla y publicarla.
                    </p>
                  </div>
                  <button
                    onClick={resetNoticiaModal}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-gray-300 rounded-xl text-sm font-medium transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
