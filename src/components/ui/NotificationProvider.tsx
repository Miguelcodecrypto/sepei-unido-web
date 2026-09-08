/**
 * Notificaciones in-app: sustituyen a `alert()` y `confirm()` nativos.
 *
 * Dos primitivas, según lo que el mensaje pida del usuario:
 *
 *  - `notify.success/error/info(...)` → un toast. Para confirmar que algo salió
 *    bien o mal sin cortar lo que el usuario esté haciendo.
 *  - `confirm(...)` y `alert(...)` → un diálogo modal, y devuelven una promesa.
 *    Para lo que exige una decisión (borrados) o una lectura atenta (una
 *    contraseña temporal que hay que copiar). `alert()` nativo se sustituye por
 *    esto, no por un toast, cuando perder el mensaje tendría coste.
 *
 * Accesibilidad: `alert()` y `confirm()` nativos son accesibles de fábrica —
 * bloquean, anuncian y gestionan el foco. Reemplazarlos por `<div>`s es un
 * downgrade si no se replica eso, así que aquí:
 *  - los toasts viven en dos regiones live, `polite` para éxito/info y
 *    `assertive` para errores;
 *  - los errores NO se auto-cierran: un lector de pantalla puede ir por detrás,
 *    y un error que desaparece solo es un error que no se ha leído;
 *  - el diálogo es `role="alertdialog"` con `aria-modal`, atrapa el foco, se
 *    cancela con Escape y devuelve el foco a donde estaba al cerrarse.
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface DialogOptions {
  title: string;
  message: string;
  /** Texto del botón que confirma. Por defecto "Aceptar". */
  confirmLabel?: string;
  /** Texto del botón que cancela. Por defecto "Cancelar". Ignorado en `alert`. */
  cancelLabel?: string;
  /** `danger` pinta de rojo el botón de confirmar: borrados y demás irreversibles. */
  variant?: 'danger' | 'default';
  /**
   * Un dato que el usuario tiene que llevarse, no solo leer (una contraseña
   * temporal, por ejemplo). Se muestra en monoespaciada y con botón de copiar,
   * porque seleccionar texto a mano dentro de un modal es incómodo y falla.
   */
  copyable?: { label: string; value: string };
}

interface DialogState extends DialogOptions {
  /** Un solo botón (alert) o dos (confirm). */
  kind: 'alert' | 'confirm';
  resolve: (value: boolean) => void;
}

interface NotificationsApi {
  notify: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  /** Devuelve true si el usuario confirma, false si cancela o pulsa Escape. */
  confirm: (options: DialogOptions) => Promise<boolean>;
  /** Resuelve cuando el usuario cierra el aviso. */
  alert: (options: Omit<DialogOptions, 'cancelLabel'>) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsApi | null>(null);

export const useNotifications = (): NotificationsApi => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de <NotificationProvider>');
  }
  return ctx;
};

const TOAST_DURACION_MS = 5000;

// Clases completas, nunca interpoladas: Tailwind escanea el código fuente y una
// clase construida en runtime no llegaría al CSS compilado.
const ESTILO_TOAST: Record<ToastVariant, { caja: string; icono: React.ReactNode }> = {
  success: {
    caja: 'bg-slate-900 border-green-500/50',
    icono: <CheckCircle className="w-5 h-5 text-green-400 shrink-0" aria-hidden="true" />,
  },
  error: {
    caja: 'bg-slate-900 border-red-500/50',
    icono: <XCircle className="w-5 h-5 text-red-400 shrink-0" aria-hidden="true" />,
  },
  info: {
    caja: 'bg-slate-900 border-blue-500/50',
    icono: <Info className="w-5 h-5 text-blue-400 shrink-0" aria-hidden="true" />,
  },
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const siguienteId = useRef(1);

  const cerrarToast = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  const añadirToast = useCallback((variant: ToastVariant, message: string) => {
    const id = siguienteId.current++;
    setToasts((actuales) => [...actuales, { id, variant, message }]);
    // Los errores se quedan hasta que el usuario los cierre.
    if (variant !== 'error') {
      window.setTimeout(() => cerrarToast(id), TOAST_DURACION_MS);
    }
  }, [cerrarToast]);

  const api = useMemo<NotificationsApi>(() => ({
    notify: {
      success: (message) => añadirToast('success', message),
      error: (message) => añadirToast('error', message),
      info: (message) => añadirToast('info', message),
    },
    confirm: (options) => new Promise<boolean>((resolve) => {
      setDialog({ ...options, kind: 'confirm', resolve });
    }),
    alert: (options) => new Promise<void>((resolve) => {
      setDialog({ ...options, kind: 'alert', resolve: () => resolve() });
    }),
  }), [añadirToast]);

  const responder = useCallback((valor: boolean) => {
    setDialog((actual) => {
      actual?.resolve(valor);
      return null;
    });
  }, []);

  return (
    <NotificationsContext.Provider value={api}>
      {children}
      <ToastRegion toasts={toasts} onClose={cerrarToast} />
      {dialog && <Dialog state={dialog} onResponder={responder} />}
    </NotificationsContext.Provider>
  );
};

// ---- Toasts ----------------------------------------------------------------

const ToastRegion: React.FC<{ toasts: Toast[]; onClose: (id: number) => void }> = ({ toasts, onClose }) => {
  if (typeof document === 'undefined') return null;

  const errores = toasts.filter((t) => t.variant === 'error');
  const resto = toasts.filter((t) => t.variant !== 'error');

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))] pointer-events-none">
      {/* Dos regiones: los errores interrumpen al lector de pantalla, el resto espera turno. */}
      <div aria-live="assertive" aria-atomic="false" className="flex flex-col gap-2">
        {errores.map((t) => <ToastItem key={t.id} toast={t} onClose={onClose} />)}
      </div>
      <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-2">
        {resto.map((t) => <ToastItem key={t.id} toast={t} onClose={onClose} />)}
      </div>
    </div>,
    document.body
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: (id: number) => void }> = ({ toast, onClose }) => {
  const estilo = ESTILO_TOAST[toast.variant];
  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-2 shadow-2xl ${estilo.caja}`}
    >
      {estilo.icono}
      {/* whitespace-pre-line: varios mensajes traen saltos de línea del alert() original. */}
      <p className="flex-1 text-sm text-white whitespace-pre-line break-words">{toast.message}</p>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Cerrar notificación"
        className="p-1 -m-1 text-gray-400 hover:text-white hover:bg-slate-700 rounded transition shrink-0"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

// ---- Diálogo ---------------------------------------------------------------

const CampoCopiable: React.FC<{ dato: { label: string; value: string } }> = ({ dato }) => {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(dato.value);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin portapapeles (contexto no seguro o permiso denegado): el valor sigue
      // visible y seleccionable, que es lo que importa.
      setCopiado(false);
    }
  };

  return (
    <div className="mb-2">
      <span className="block text-xs text-gray-400 mb-1">{dato.label}</span>
      <div className="flex items-center gap-2 p-3 bg-slate-950 border-2 border-slate-700 rounded-xl">
        <code className="flex-1 text-sm text-orange-300 break-all select-all">{dato.value}</code>
        <button
          type="button"
          onClick={copiar}
          className="px-3 py-1 text-xs rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-700 transition shrink-0"
        >
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {/* El cambio a "Copiado" es visual; esto lo anuncia a un lector de pantalla. */}
      <span aria-live="polite" className="sr-only">{copiado ? 'Copiado al portapapeles' : ''}</span>
    </div>
  );
};

const Dialog: React.FC<{ state: DialogState; onResponder: (valor: boolean) => void }> = ({ state, onResponder }) => {
  const cajaRef = useRef<HTMLDivElement>(null);
  const botonInicialRef = useRef<HTMLButtonElement>(null);
  const focoPrevioRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    focoPrevioRef.current = document.activeElement as HTMLElement | null;
    botonInicialRef.current?.focus();
    // Devolver el foco a donde estaba: si no, se pierde al principio de la página.
    return () => focoPrevioRef.current?.focus?.();
  }, []);

  useEffect(() => {
    const alPulsarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onResponder(false);
        return;
      }
      if (e.key !== 'Tab' || !cajaRef.current) return;
      // Focus trap: el tabulador no debe salirse del diálogo mientras esté abierto.
      const focusables = cajaRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alPulsarTecla);
    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [onResponder]);

  if (typeof document === 'undefined') return null;

  const esDestructivo = state.variant === 'danger';
  const esConfirmacion = state.kind === 'confirm';

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onResponder(false); }}
    >
      <div
        ref={cajaRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-mensaje"
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-slate-700 shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          {esDestructivo
            ? <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" aria-hidden="true" />
            : <Info className="w-6 h-6 text-orange-400 shrink-0" aria-hidden="true" />}
          <h2 id="dialogo-titulo" className="text-lg font-bold text-white">{state.title}</h2>
        </div>

        <p id="dialogo-mensaje" className="text-sm text-gray-300 whitespace-pre-line break-words mb-4">
          {state.message}
        </p>

        {state.copyable && <CampoCopiable dato={state.copyable} />}

        <div className="flex gap-3 justify-end mt-6">
          {esConfirmacion && (
            <button
              type="button"
              // En un borrado, el foco entra en Cancelar: que un Enter de más no borre nada.
              ref={esDestructivo ? botonInicialRef : undefined}
              onClick={() => onResponder(false)}
              className="px-4 py-2 rounded-xl border-2 border-slate-600 text-gray-300 hover:bg-slate-700 transition"
            >
              {state.cancelLabel || 'Cancelar'}
            </button>
          )}
          <button
            type="button"
            ref={esDestructivo && esConfirmacion ? undefined : botonInicialRef}
            onClick={() => onResponder(true)}
            className={esDestructivo
              ? 'px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition'
              : 'px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition'}
          >
            {state.confirmLabel || 'Aceptar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
