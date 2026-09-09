// Menú de acciones por fila (botón "⋯"). Se pinta con createPortal sobre el body
// porque la tabla vive dentro de un contenedor con overflow y un menú absoluto
// quedaría recortado por él.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface RowAction {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  /** Resalta la acción en rojo (borrados) o en ámbar (avisos). */
  tone?: 'default' | 'danger' | 'warning';
}

interface Props {
  actions: RowAction[];
  /** Texto para lectores de pantalla: "Acciones de Juan Pérez". */
  label: string;
}

export function RowActionsMenu({ actions, label }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!abierto || !botonRef.current) return;
    const r = botonRef.current.getBoundingClientRect();
    const ancho = 232;
    const alto = actions.length * 40 + 12;
    // Se ancla al botón, pero sin salirse de la ventana por abajo ni por la derecha.
    const top = r.bottom + alto > window.innerHeight ? Math.max(8, r.top - alto) : r.bottom + 6;
    const left = Math.min(Math.max(8, r.right - ancho), window.innerWidth - ancho - 8);
    setPos({ top, left });
  }, [abierto, actions.length]);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || botonRef.current?.contains(e.target as Node)) return;
      setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    // Si se desplaza la tabla, el menú dejaría de estar junto a su fila.
    const alDesplazar = () => setAbierto(false);
    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alTeclear);
    window.addEventListener('scroll', alDesplazar, true);
    window.addEventListener('resize', alDesplazar);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alTeclear);
      window.removeEventListener('scroll', alDesplazar, true);
      window.removeEventListener('resize', alDesplazar);
    };
  }, [abierto]);

  const colorDe = (tone: RowAction['tone']) =>
    tone === 'danger' ? 'text-red-300 hover:bg-red-500/15' : tone === 'warning' ? 'text-amber-300 hover:bg-amber-500/15' : 'text-slate-200 hover:bg-slate-700';

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={label}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {abierto && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: pos.top, left: pos.left, width: 232 }}
              className="fixed z-[60] py-1.5 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl"
            >
              {actions.map((a) => (
                <button
                  key={a.label}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setAbierto(false);
                    a.onSelect();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-left transition ${colorDe(a.tone)}`}
                >
                  <a.Icon className="w-4 h-4 shrink-0" />
                  {a.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
