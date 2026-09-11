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
import { Flame, ArrowLeft, LogIn, UserCheck } from 'lucide-react';
import VotingBoard from '../components/VotingBoard';
import { UserLogin } from '../components/UserLogin';
import { getCurrentUser, type SessionUser } from '../services/sessionService';

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
            <span className="flex items-center gap-2 text-sm text-green-400 font-semibold">
              <UserCheck className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[10rem]">{usuario.nombre}</span>
            </span>
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
        {!usuario && (
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
