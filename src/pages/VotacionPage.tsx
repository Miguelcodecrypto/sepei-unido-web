/**
 * Página de una votación concreta: `/votacion/<id>`.
 *
 * Es el destino de los enlaces de los correos y de Telegram. Antes apuntaban a
 * `https://www.sepeiunido.org/#voting`, un ancla que no existe en ninguna página,
 * así que quien pulsaba "Votar ahora" aterrizaba en lo alto de la portada y tenía
 * que buscar la votación bajando a mano.
 *
 * No es un sitio donde se vote de forma distinta: monta el mismo `VotingBoard`
 * con la papeleta ya delante. El voto sigue emitiéndose contra `/api/voting` con
 * la sesión del usuario, que es lo que hace que el voto sea suyo y no de quien
 * tenga el enlace.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Flame, ArrowLeft, LogIn, UserCheck, LogOut } from 'lucide-react';
import VotingBoard from '../components/VotingBoard';
import { UserLogin } from '../components/UserLogin';
import { getCurrentUser, invalidateSession, type SessionUser } from '../services/sessionService';

const VotacionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [usuario, setUsuario] = useState<SessionUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  // Cambiarla remonta el tablero: tras iniciar sesión hay que volver a pedir la
  // votación, que ahora sí dirá si esta persona ya había votado.
  const [sesionKey, setSesionKey] = useState(0);
  // Cuando no hay papeleta, el propio tablero ya ofrece ir a las votaciones
  // abiertas: repetir el enlace justo debajo sobra.
  const [hayPapeleta, setHayPapeleta] = useState(true);

  useEffect(() => {
    document.title = 'Votación · SEPEI UNIDO';
    getCurrentUser().then(setUsuario);
  }, [sesionKey]);

  // El aviso de "ficha a medias" no se pinta aquí a propósito: es cosa de la
  // portada, y quien viene a votar desde un correo no debería encontrarse un
  // formulario de datos personales delante de la papeleta.
  const handleLoginSuccess = () => {
    setShowLogin(false);
    setSesionKey(k => k + 1);
  };

  /**
   * El enlace del correo no lleva identidad a propósito (reenviarlo no debe ceder
   * el voto), así que quien contesta es la sesión guardada en el navegador, que
   * dura 7 días. Si alguien abre su aviso en un móvil o un ordenador donde había
   * otra sesión, la papeleta le habla de esa otra persona: puede decirle "ya
   * votaste" sin que él haya votado. Pasó el 2026-09-15. Por eso la identidad se
   * ve entera arriba y se puede cambiar desde aquí, sin ir a buscar el menú de la
   * portada.
   */
  const handleCambiarCuenta = async () => {
    await invalidateSession();
    setUsuario(null);
    setSesionKey(k => k + 1);
    setShowLogin(true);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-3 min-w-0">
            <Flame className="w-8 h-8 text-orange-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-black leading-tight truncate">SEPEI UNIDO</p>
              <p className="text-orange-400 text-xs font-semibold truncate">Diputación de Albacete</p>
            </div>
          </a>

          {usuario ? (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="min-w-0 text-right">
                <p className="flex items-center justify-end gap-1.5 text-sm text-green-400 font-semibold">
                  <UserCheck className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate max-w-[9rem] sm:max-w-[14rem]">
                    {[usuario.nombre, usuario.apellidos].filter(Boolean).join(' ')}
                  </span>
                </p>
                <p className="text-xs text-gray-400 truncate max-w-[9rem] sm:max-w-[14rem]">{usuario.email}</p>
              </div>
              <button
                onClick={handleCambiarCuenta}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                title="Cerrar esta sesión y entrar con otra cuenta"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">No soy yo</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Quien llega sin sesión puede leer la papeleta entera; identificarse solo
            hace falta para emitir el voto. */}
        {usuario ? (
          <p className="mb-6 text-sm text-gray-400 text-center">
            Estás votando como <span className="text-gray-200 font-semibold">{[usuario.nombre, usuario.apellidos].filter(Boolean).join(' ')}</span>.
            {' '}Si este aviso era para otra persona,{' '}
            <button onClick={handleCambiarCuenta} className="text-orange-400 hover:text-orange-300 underline font-semibold">
              entra con su cuenta
            </button>.
          </p>
        ) : (
          <p className="mb-6 text-sm text-gray-400 text-center">
            Para votar tendrás que iniciar sesión con tu DNI.
          </p>
        )}

        <VotingBoard
          key={sesionKey}
          soloVotacionId={id}
          onLoginRequired={() => setShowLogin(true)}
          onCargado={cantidad => setHayPapeleta(cantidad > 0)}
        />

        {hayPapeleta && (
          <div className="mt-10 text-center">
            <a
              href="/#votaciones-section"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-orange-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver todas las votaciones
            </a>
          </div>
        )}
      </main>

      {showLogin && (
        <UserLogin
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => setShowLogin(false)}
        />
      )}
    </div>
  );
};

export default VotacionPage;
