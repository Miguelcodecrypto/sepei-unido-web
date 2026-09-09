// Estructura del panel de administración: barra lateral fija en escritorio,
// menú lateral desplegable en móvil y barra superior compacta. Sustituye a la
// fila de 10 pestañas, que en móvil solo dejaba ver dos y en escritorio ocupaba
// dos filas enteras.
import { useEffect, useRef, useState } from 'react';
import { Clock, LogOut, Menu, X, Flame } from 'lucide-react';

export interface ShellSection<T extends string> {
  id: T;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Contador opcional junto al nombre (usuarios, sugerencias…). */
  badge?: number;
}

interface Props<T extends string> {
  sections: ShellSection<T>[];
  active: T;
  onChange: (id: T) => void;
  sessionMinutes: number;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AdminShell<T extends string>({ sections, active, onChange, sessionMinutes, onLogout, children }: Props<T>) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const seccion = sections.find((s) => s.id === active);
  const cierreRef = useRef<HTMLButtonElement>(null);

  // El menú móvil es modal: bloquea el scroll de fondo y se cierra con Escape.
  useEffect(() => {
    if (!menuAbierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cierreRef.current?.focus();
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAbierto(false);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener('keydown', alTeclear);
    };
  }, [menuAbierto]);

  const Navegacion = ({ enMovil }: { enMovil: boolean }) => (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Secciones del panel">
      {sections.map(({ id, label, Icon, badge }) => {
        const activa = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              onChange(id);
              if (enMovil) setMenuAbierto(false);
            }}
            aria-current={activa ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
              activa ? 'bg-orange-500/15 text-orange-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">{label}</span>
            {badge !== undefined && (
              <span className={`ml-auto text-xs font-bold tabular-nums ${activa ? 'text-orange-400/80' : 'text-slate-500'}`}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const Marca = () => (
    <div className="flex items-center gap-2 px-4 h-14 shrink-0 border-b border-slate-800">
      <Flame className="w-5 h-5 text-orange-500 shrink-0" />
      <span className="font-black text-white tracking-tight">SEPEI UNIDO</span>
      <span className="text-[11px] font-semibold text-slate-500 uppercase">Admin</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Barra lateral fija (escritorio) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-slate-900 border-r border-slate-800 z-40">
        <Marca />
        <Navegacion enMovil={false} />
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Menú lateral (móvil) */}
      {menuAbierto && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú de secciones">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMenuAbierto(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pr-2">
              <Marca />
              <button
                ref={cierreRef}
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Navegacion enMovil />
            <div className="p-3 border-t border-slate-800">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Barra superior compacta y fija */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-3 sm:px-6 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú de secciones"
            className="lg:hidden p-2 -ml-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-white truncate">{seccion?.label ?? 'Panel'}</h1>

          <div className="ml-auto flex items-center gap-2">
            <span
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              title="Tiempo restante de la sesión de administrador"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {sessionMinutes}m
            </span>
            <button
              onClick={onLogout}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="px-3 sm:px-6 py-4 sm:py-6">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
