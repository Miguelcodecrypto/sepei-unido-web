// Sección "Usuarios": barra de trabajo de una línea + tabla densa.
//
// La tabla se mantiene en todos los tamaños (también en móvil, donde se
// desplaza en horizontal) porque una lista de tarjetas gastaba ~240px por
// usuario: con 128 usuarios eran unos 30.000px de scroll. Para que el
// desplazamiento lateral no desoriente, la columna de identidad queda fija a la
// izquierda y la cabecera fija arriba.
import React, { useMemo, useState } from 'react';
import {
  CheckCircle, AlertTriangle, UserX, XCircle, Key, Eye, EyeOff, Trash2,
  Download, Search, MessageCircle, Info,
} from 'lucide-react';
import { EstadoPlantilla } from '../../data/plantillaOficialSEPEI';
import { calcularActividad, esActivo, TramoActividad, DIAS_DORMIDO } from '../../utils/actividad';
import { UserConEstado } from './types';
import { UserDetailsPanel } from './UserDetailsPanel';
import { RowActionsMenu } from './RowActionsMenu';

interface Props {
  usuarios: UserConEstado[];
  conteoEstados: Record<EstadoPlantilla, number>;
  usuariosConTelegram: number;
  filtroPlantilla: 'todos' | EstadoPlantilla;
  onFiltroChange: (f: 'todos' | EstadoPlantilla) => void;
  onExport: () => void;
  onToggleVoto: (id: string, autorizadoActual: boolean, nombre: string) => void;
  onResetPassword: (id: string, nombre: string, email: string) => void;
  onDelete: (id: string, nombre: string) => void;
}

const FILTROS: { id: 'todos' | EstadoPlantilla; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'en_plantilla', label: 'En plantilla' },
  { id: 'cambios_detectados', label: 'Con cambios' },
  { id: 'no_en_plantilla', label: 'No en plantilla' },
];

const ESTADO_META: Record<EstadoPlantilla, { Icon: React.ComponentType<{ className?: string }>; color: string; barra: string; texto: string }> = {
  en_plantilla: { Icon: CheckCircle, color: 'text-green-400', barra: 'bg-green-500', texto: 'En plantilla oficial' },
  cambios_detectados: { Icon: AlertTriangle, color: 'text-amber-400', barra: 'bg-amber-500', texto: 'Cambios detectados respecto a la plantilla' },
  no_en_plantilla: { Icon: UserX, color: 'text-red-400', barra: 'bg-red-500', texto: 'No aparece en la plantilla oficial' },
};

// Rampa de un solo eje (verde → amarillo-verde → ámbar → rojo): se lee como un
// gradiente de "recién entrado" a "lleva meses". Va desaturada y siempre con el
// texto al lado ("6 d") porque el color por sí solo ni es accesible ni distingue
// nada: en esta misma fila ya hay un verde/ámbar/rojo, el del estado en plantilla.
// Lo que separa los dos sistemas es la forma —barra e icono a la izquierda contra
// chip en su columna—, no el tono.
const TRAMO_META: Record<TramoActividad, { label: string; chip: string }> = {
  hoy: { label: 'Hoy', chip: 'bg-emerald-500/15 text-emerald-300' },
  semana: { label: 'Esta semana', chip: 'bg-lime-500/15 text-lime-300' },
  mes: { label: 'Este mes', chip: 'bg-amber-500/15 text-amber-300' },
  dormido: { label: `Más de ${DIAS_DORMIDO} días`, chip: 'bg-rose-500/15 text-rose-300' },
  sin_datos: { label: 'Sin registro', chip: 'bg-slate-700/50 text-slate-400' },
};

const TRAMOS: TramoActividad[] = ['hoy', 'semana', 'mes', 'dormido', 'sin_datos'];

export function UsersSection({
  usuarios, conteoEstados, usuariosConTelegram, filtroPlantilla,
  onFiltroChange, onExport, onToggleVoto, onResetPassword, onDelete,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroActividad, setFiltroActividad] = useState<'todos' | TramoActividad>('todos');
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null);

  // El tramo se calcula una vez por usuario y lo usan a la vez la celda, el filtro
  // y el recuento de activos: si cada uno lo calculase por su cuenta acabarían
  // discrepando en el borde de cada umbral.
  const conActividad = useMemo(
    () => usuarios.map((u) => ({ ...u, actividad: calcularActividad(u.lastlogin) })),
    [usuarios]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return conActividad.filter((u) => {
      if (filtroActividad !== 'todos' && u.actividad.tramo !== filtroActividad) return false;
      if (!q) return true;
      return [u.nombre, u.apellidos, u.email, u.dni, u.telefono, u.parque_sepei]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(q));
    });
  }, [conActividad, busqueda, filtroActividad]);

  const conteoActividad = useMemo(() => {
    const conteo: Record<TramoActividad, number> = { hoy: 0, semana: 0, mes: 0, dormido: 0, sin_datos: 0 };
    conActividad.forEach((u) => { conteo[u.actividad.tramo]++; });
    return conteo;
  }, [conActividad]);

  const total = usuarios.length;
  const porcentajeTelegram = total > 0 ? Math.round((usuariosConTelegram / total) * 100) : 0;
  const activos = conActividad.filter((u) => esActivo(u.actividad.tramo)).length;
  const porcentajeActivos = total > 0 ? Math.round((activos / total) * 100) : 0;

  const contarFiltro = (id: 'todos' | EstadoPlantilla) => (id === 'todos' ? total : conteoEstados[id]);

  return (
    <div className="space-y-4">
      {/* Barra de trabajo */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email, DNI o parque…"
            aria-label="Buscar usuarios"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60"
          />
        </div>

        {/* Filtro: desplegable en móvil, botones en pantallas anchas */}
        <select
          value={filtroPlantilla}
          onChange={(e) => onFiltroChange(e.target.value as 'todos' | EstadoPlantilla)}
          aria-label="Filtrar por estado en plantilla oficial"
          className="md:hidden px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500/60"
        >
          {FILTROS.map((f) => (
            <option key={f.id} value={f.id}>{`${f.label} (${contarFiltro(f.id)})`}</option>
          ))}
        </select>

        <div className="hidden md:flex items-center gap-1 p-1 bg-slate-900 border border-slate-700 rounded-lg">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFiltroChange(f.id)}
              aria-pressed={filtroPlantilla === f.id}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${
                filtroPlantilla === f.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label} <span className="tabular-nums text-slate-500">{contarFiltro(f.id)}</span>
            </button>
          ))}
        </div>

        {/* Filtro por último acceso: desplegable en todos los tamaños, porque cinco
            tramos en botones no caben junto a los de plantilla sin romper la línea. */}
        <select
          value={filtroActividad}
          onChange={(e) => setFiltroActividad(e.target.value as 'todos' | TramoActividad)}
          aria-label="Filtrar por último acceso"
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500/60"
        >
          <option value="todos">{`Cualquier acceso (${total})`}</option>
          {TRAMOS.map((t) => (
            <option key={t} value={t}>{`${TRAMO_META[t].label} (${conteoActividad[t]})`}</option>
          ))}
        </select>

        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 hover:text-white text-slate-300 rounded-lg text-sm font-semibold transition"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </div>

      {/* Métricas en una línea */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
        <span className="text-white font-semibold tabular-nums">{total}</span> usuarios registrados
        <span className="text-slate-600">·</span>
        <span className="text-[#0088cc] font-semibold tabular-nums">{usuariosConTelegram}</span> con Telegram ({porcentajeTelegram}%)
        <span className="text-slate-600">·</span>
        <span className="text-white font-semibold tabular-nums">{activos}</span> han entrado este mes ({porcentajeActivos}%)
        {busqueda && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-white font-semibold tabular-nums">{visibles.length}</span> coinciden con la búsqueda
          </>
        )}
        <span
          className="inline-flex items-center gap-1 text-slate-500"
          title="La barra y el icono de la izquierda de cada fila indican si el usuario aparece en la plantilla oficial del SEPEI: verde, en plantilla; ámbar, con cambios; rojo, no aparece. El color de «Último acceso» es independiente."
        >
          <Info className="w-3.5 h-3.5" />
          <span className="sr-only">Significado de los colores de estado</span>
        </span>
      </p>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {visibles.length === 0 ? (
          <p className="p-10 text-center text-slate-400">
            {busqueda ? `Ningún usuario coincide con «${busqueda}»` : 'No hay usuarios con estos filtros'}
          </p>
        ) : (
          <div className="overflow-auto lg:max-h-[calc(100vh-13rem)]">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                <tr className="text-left text-slate-300">
                  <th scope="col" className="sticky left-0 z-30 bg-slate-800 px-3 py-2.5 font-semibold whitespace-nowrap">Usuario</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap">Parque</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap">Último acceso</th>
                  <th scope="col" className="hidden xl:table-cell px-3 py-2.5 font-semibold whitespace-nowrap">DNI</th>
                  <th scope="col" className="hidden xl:table-cell px-3 py-2.5 font-semibold whitespace-nowrap">Teléfono</th>
                  <th scope="col" className="hidden md:table-cell px-3 py-2.5 font-semibold whitespace-nowrap">Registro</th>
                  <th scope="col" className="hidden lg:table-cell px-3 py-2.5 font-semibold text-center whitespace-nowrap">Telegram</th>
                  <th scope="col" className="px-3 pr-12 py-2.5 font-semibold text-center whitespace-nowrap">Voto</th>
                  <th scope="col" className="sticky right-0 z-30 bg-slate-800 px-2 py-2.5 font-semibold text-right whitespace-nowrap"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visibles.map((user) => {
                  const meta = ESTADO_META[user.estadoPlantilla];
                  const abierto = detalleAbierto === user.id;
                  const nombreCompleto = `${user.nombre} ${user.apellidos || ''}`.trim();

                  return (
                    <React.Fragment key={user.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        {/* Identidad: fija al desplazar en horizontal */}
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-slate-900 px-3 py-2 text-left font-normal max-w-[200px] sm:max-w-[280px]"
                        >
                          <span className={`absolute left-0 top-0 bottom-0 w-1 ${meta.barra}`} aria-hidden="true" />
                          <span className="flex items-center gap-2">
                            <meta.Icon className={`w-4 h-4 shrink-0 ${meta.color}`} aria-label={meta.texto} />
                            <span className="min-w-0">
                              <span className="block text-white font-semibold truncate">{nombreCompleto}</span>
                              <span className="block text-slate-400 text-xs truncate">{user.email}</span>
                            </span>
                          </span>
                        </th>

                        <td className="px-3 py-2 whitespace-nowrap">
                          {user.parque_sepei ? (
                            <span className="px-2 py-0.5 bg-orange-500/15 text-orange-300 rounded text-xs font-medium">{user.parque_sepei}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium tabular-nums ${TRAMO_META[user.actividad.tramo].chip}`}
                            title={user.actividad.absoluto ? `${user.actividad.texto} · ${user.actividad.absoluto}` : user.actividad.texto}
                          >
                            <span aria-hidden="true">{user.actividad.corto}</span>
                            <span className="sr-only">{`Último acceso: ${user.actividad.texto}`}</span>
                          </span>
                        </td>
                        <td className="hidden xl:table-cell px-3 py-2 text-slate-300 whitespace-nowrap tabular-nums">{user.dni || '—'}</td>
                        <td className="hidden xl:table-cell px-3 py-2 text-slate-300 whitespace-nowrap tabular-nums">{user.telefono || '—'}</td>
                        <td className="hidden md:table-cell px-3 py-2 text-slate-400 whitespace-nowrap tabular-nums">
                          {new Date(user.fecha_registro).toLocaleDateString('es-ES')}
                        </td>
                        <td className="hidden lg:table-cell px-3 py-2 text-center">
                          <MessageCircle
                            className={`w-4 h-4 mx-auto ${user.telegram_chat_id ? 'text-[#0088cc]' : 'text-slate-700'}`}
                            aria-label={user.telegram_chat_id ? `Telegram vinculado${user.telegram_username ? ` (@${user.telegram_username})` : ''}` : 'Sin Telegram'}
                          />
                        </td>
                        <td className="px-3 pr-12 py-2 text-center">
                          {user.autorizado_votar ? (
                            <CheckCircle className="w-4 h-4 mx-auto text-green-400" aria-label="Autorizado a votar" />
                          ) : (
                            <XCircle className="w-4 h-4 mx-auto text-slate-600" aria-label="Sin autorización de voto" />
                          )}
                        </td>
                        <td className="sticky right-0 z-10 bg-slate-900 px-2 py-2 text-right">
                          <RowActionsMenu
                            label={`Acciones de ${nombreCompleto}`}
                            actions={[
                              {
                                label: abierto ? 'Ocultar ficha' : 'Ver ficha completa',
                                Icon: abierto ? EyeOff : Eye,
                                onSelect: () => setDetalleAbierto(abierto ? null : user.id),
                              },
                              {
                                label: user.autorizado_votar ? 'Retirar el voto' : 'Autorizar el voto',
                                Icon: user.autorizado_votar ? XCircle : CheckCircle,
                                onSelect: () => onToggleVoto(user.id, user.autorizado_votar || false, user.nombre),
                              },
                              {
                                label: 'Resetear contraseña',
                                Icon: Key,
                                onSelect: () => onResetPassword(user.id, user.nombre, user.email),
                                tone: 'warning',
                              },
                              {
                                label: 'Eliminar usuario',
                                Icon: Trash2,
                                onSelect: () => onDelete(user.id, user.nombre),
                                tone: 'danger',
                              },
                            ]}
                          />
                        </td>
                      </tr>

                      {abierto && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={9} className="px-3 sm:px-4 py-4">
                            <UserDetailsPanel user={user} />
                          </td>
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
