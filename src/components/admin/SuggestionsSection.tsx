// Sección "Sugerencias": misma densidad y mismos patrones que la de usuarios
// (identidad fija a la izquierda, acciones fijas a la derecha, ficha desplegable).
import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Trash2, Download, Search, Lightbulb } from 'lucide-react';
import { Suggestion } from './types';
import { RowActionsMenu } from './RowActionsMenu';

interface Props {
  suggestions: Suggestion[];
  onExport: () => void;
  onClear: () => void;
  onDelete: (id: string, asunto: string) => void;
  renderDetalle: (suggestion: Suggestion) => React.ReactNode;
}

export function SuggestionsSection({ suggestions, onExport, onClear, onDelete, renderDetalle }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) =>
      [s.nombre, s.apellidos, s.email, s.asunto, s.lugarTrabajo, s.categoria]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(q))
    );
  }, [suggestions, busqueda]);

  if (suggestions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Lightbulb className="w-12 h-12 text-slate-700 mx-auto mb-3" />
        <p className="text-slate-300">No hay sugerencias aún</p>
        <p className="text-slate-500 text-sm mt-1">Las propuestas de los compañeros aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por persona, asunto o parque…"
            aria-label="Buscar sugerencias"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60"
          />
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 hover:text-white text-slate-300 rounded-lg text-sm font-semibold transition"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-2 bg-red-600/10 border border-red-600/40 text-red-300 hover:bg-red-600/20 rounded-lg text-sm font-semibold transition"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Limpiar</span>
        </button>
      </div>

      <p className="text-sm text-slate-400">
        <span className="text-white font-semibold tabular-nums">{suggestions.length}</span> propuestas recibidas
        {busqueda && (
          <>
            <span className="text-slate-600 mx-2">·</span>
            <span className="text-white font-semibold tabular-nums">{visibles.length}</span> coinciden con la búsqueda
          </>
        )}
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {visibles.length === 0 ? (
          <p className="p-10 text-center text-slate-400">Ninguna propuesta coincide con «{busqueda}»</p>
        ) : (
          <div className="overflow-auto lg:max-h-[calc(100vh-13rem)]">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                <tr className="text-left text-slate-300">
                  <th scope="col" className="sticky left-0 z-30 bg-slate-800 px-3 py-2.5 font-semibold whitespace-nowrap w-[46%] sm:w-[30%] lg:w-[24%]">Persona</th>
                  <th scope="col" className="hidden sm:table-cell px-3 py-2.5 font-semibold whitespace-nowrap w-[14%] lg:w-[11%]">Categoría</th>
                  <th scope="col" className="hidden lg:table-cell px-3 py-2.5 font-semibold whitespace-nowrap w-[12%]">Parque</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap">Asunto</th>
                  <th scope="col" className="hidden md:table-cell px-3 pr-4 py-2.5 font-semibold whitespace-nowrap w-[104px]">Fecha</th>
                  <th scope="col" className="sticky right-0 z-30 bg-slate-800 px-2 py-2.5 font-semibold text-right w-[52px]"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visibles.map((s) => {
                  const abierto = detalleAbierto === s.id;
                  const persona = `${s.nombre} ${s.apellidos}`.trim();
                  return (
                    <React.Fragment key={s.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <th scope="row" className="sticky left-0 z-10 bg-slate-900 px-3 py-2 text-left font-normal max-w-[200px] sm:max-w-[260px]">
                          <span className="block text-white font-semibold truncate">{persona}</span>
                          <span className="block text-slate-400 text-xs truncate">{s.email}</span>
                        </th>
                        <td className="hidden sm:table-cell px-3 py-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded text-xs font-medium">
                            {s.categoria.charAt(0).toUpperCase() + s.categoria.slice(1)}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-3 py-2 text-slate-300 whitespace-nowrap">{s.lugarTrabajo}</td>
                        <td className="px-3 py-2 text-slate-200 truncate" title={s.asunto}>{s.asunto}</td>
                        <td className="hidden md:table-cell px-3 pr-4 py-2 text-slate-400 whitespace-nowrap tabular-nums">
                          {new Date(s.fechaRegistro).toLocaleDateString('es-ES')}
                        </td>
                        <td className="sticky right-0 z-10 bg-slate-900 px-2 py-2 text-right">
                          <RowActionsMenu
                            label={`Acciones de la propuesta de ${persona}`}
                            actions={[
                              {
                                label: abierto ? 'Ocultar propuesta' : 'Ver propuesta completa',
                                Icon: abierto ? EyeOff : Eye,
                                onSelect: () => setDetalleAbierto(abierto ? null : s.id),
                              },
                              {
                                label: 'Eliminar propuesta',
                                Icon: Trash2,
                                onSelect: () => onDelete(s.id, s.asunto),
                                tone: 'danger',
                              },
                            ]}
                          />
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={6} className="px-3 sm:px-4 py-4">{renderDetalle(s)}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
