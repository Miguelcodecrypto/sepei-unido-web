import { useEffect, useState } from 'react';
import { MailX, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * Baja de un contacto externo, desde el enlace que lleva su correo.
 *
 * 🔑 Abrir esta página NO da de baja a nadie: solo pregunta. Gmail, Safe Links y
 * los antivirus corporativos visitan los enlaces de los correos para escanearlos,
 * así que un enlace que ejecutara la baja daría de baja a gente que nunca lo
 * pidió. La baja ocurre cuando alguien pulsa el botón, y las dos llamadas al
 * servidor son POST porque los escáneres hacen GET.
 */
type Estado =
  | { fase: 'cargando' }
  | { fase: 'preguntando'; email: string }
  | { fase: 'enviando'; email: string }
  | { fase: 'hecho'; email: string }
  | { fase: 'error'; mensaje: string };

export default function BajaCorreos() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    if (!token) {
      setEstado({ fase: 'error', mensaje: 'El enlace no es válido. Comprueba que lo has copiado entero.' });
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/send-email?action=unsubscribe-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const datos = await res.json();

        if (!res.ok) {
          setEstado({
            fase: 'error',
            mensaje: datos?.error || 'No hemos podido comprobar el enlace. Inténtalo de nuevo más tarde.',
          });
          return;
        }

        // Quien ya se dio de baja y vuelve a pulsar merece ver que está hecho,
        // no un formulario que le haga dudar.
        setEstado(datos.yaDeBaja ? { fase: 'hecho', email: datos.email } : { fase: 'preguntando', email: datos.email });
      } catch {
        setEstado({ fase: 'error', mensaje: 'No hemos podido conectar. Comprueba tu conexión e inténtalo de nuevo.' });
      }
    })();
  }, [token]);

  const confirmarBaja = async () => {
    if (estado.fase !== 'preguntando') return;
    const email = estado.email;
    setEstado({ fase: 'enviando', email });

    try {
      const res = await fetch('/api/send-email?action=unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const datos = await res.json();

      if (!res.ok) {
        setEstado({ fase: 'error', mensaje: datos?.error || 'No hemos podido completar la baja.' });
        return;
      }
      setEstado({ fase: 'hecho', email });
    } catch {
      setEstado({ fase: 'error', mensaje: 'No hemos podido conectar. Inténtalo de nuevo más tarde.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800/60 bg-slate-900/95">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Ir a SEPEI UNIDO</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 text-center space-y-5">
          {estado.fase === 'cargando' && (
            <>
              <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 text-sm">Comprobando el enlace…</p>
            </>
          )}

          {(estado.fase === 'preguntando' || estado.fase === 'enviando') && (
            <>
              <div className="w-16 h-16 bg-orange-500/15 rounded-2xl flex items-center justify-center mx-auto">
                <MailX className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold mb-2">¿Dejar de recibir nuestros correos?</h1>
                <p className="text-sm text-gray-400">
                  Vas a dar de baja a <span className="text-white font-semibold break-all">{estado.email}</span>. No
                  volveremos a escribir a esta dirección.
                </p>
              </div>
              <button
                onClick={confirmarBaja}
                disabled={estado.fase === 'enviando'}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
              >
                {estado.fase === 'enviando' ? 'Dando de baja…' : 'Confirmar la baja'}
              </button>
              <p className="text-xs text-gray-500">
                Si has llegado aquí sin querer, cierra esta página: no se hará ningún cambio.
              </p>
            </>
          )}

          {estado.fase === 'hecho' && (
            <>
              <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold mb-2">Baja confirmada</h1>
                <p className="text-sm text-gray-400">
                  No volveremos a enviar correos a{' '}
                  <span className="text-white font-semibold break-all">{estado.email}</span>.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Si algún día quieres volver a recibirlos, escríbenos a{' '}
                <a href="mailto:sepeiunido@gmail.com" className="text-orange-400 hover:underline">sepeiunido@gmail.com</a>.
              </p>
            </>
          )}

          {estado.fase === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold mb-2">No hemos podido hacerlo</h1>
                <p className="text-sm text-gray-400">{estado.mensaje}</p>
              </div>
              <p className="text-xs text-gray-500">
                Escríbenos a{' '}
                <a href="mailto:sepeiunido@gmail.com" className="text-orange-400 hover:underline">sepeiunido@gmail.com</a>{' '}
                y te damos de baja a mano.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
