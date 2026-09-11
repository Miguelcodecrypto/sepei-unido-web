import React, { useState, useEffect } from 'react';
import { useNotifications } from './ui/NotificationProvider';
import { BarChart3, CheckCircle, Calendar, Users, AlertCircle } from 'lucide-react';
import {
  getVotacionesActivas,
  getVotacionesPublicadas,
  emitirVoto,
  getResultadosVotacion,
  VotacionCompleta,
  ResultadoVotacion
} from '../services/votingDatabase';
import { getCurrentUser } from '../services/sessionService';
import { calcularTiempoRestante } from '../utils/tiempoRestante';
import { trackInteraction, createSectionTimeTracker } from '../services/analyticsService';

interface VotingBoardProps {
  onLoginRequired?: () => void;
  /**
   * Pinta una sola votación: la del enlace directo de los correos y de Telegram
   * (`/votacion/<id>`). Cambia también de dónde se leen los datos — las
   * publicadas en vez de solo las activas —, porque el aviso de resultados llega
   * cuando la votación ya ha cerrado y ese enlace tiene que seguir abriéndola.
   */
  soloVotacionId?: string;
  /** Cuántas votaciones han quedado en pantalla tras cargar. El contenedor lo
   *  usa para no repetir un "volver" que el propio tablero ya está ofreciendo. */
  onCargado?: (cantidad: number) => void;
}

const VotingBoard: React.FC<VotingBoardProps> = ({ onLoginRequired, soloVotacionId, onCargado }) => {
  const { notify, alert } = useNotifications();
  const [votaciones, setVotaciones] = useState<VotacionCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [votando, setVotando] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string[] }>({});
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>({});
  const [resultados, setResultados] = useState<{ [key: string]: ResultadoVotacion[] }>({});

  useEffect(() => {
    loadVotaciones();
    
    // Rastrear visita a la sección de votaciones
    trackInteraction('voting', 'view_voting');
    
    // Iniciar seguimiento de tiempo en la sección
    const cleanup = createSectionTimeTracker('voting');
    return cleanup;
  }, []);

  const loadVotaciones = async () => {
    setLoading(true);
    const data = soloVotacionId
      ? (await getVotacionesPublicadas()).filter(v => v.id === soloVotacionId)
      : await getVotacionesActivas();
    setVotaciones(data);
    
    // Cargar resultados para votaciones con resultados públicos
    const newResultados: { [key: string]: ResultadoVotacion[] } = {};
    for (const votacion of data) {
      if (votacion.resultados_publicos) {
        const results = await getResultadosVotacion(votacion.id);
        newResultados[votacion.id] = results;
      }
    }
    setResultados(newResultados);
    setLoading(false);
    onCargado?.(data.length);
  };

  const handleOptionSelect = (votacionId: string, opcionId: string, multipleRespuestas: boolean) => {
    if (multipleRespuestas) {
      // Toggle opción en votación múltiple
      const current = selectedOptions[votacionId] || [];
      if (current.includes(opcionId)) {
        setSelectedOptions({
          ...selectedOptions,
          [votacionId]: current.filter(id => id !== opcionId)
        });
      } else {
        setSelectedOptions({
          ...selectedOptions,
          [votacionId]: [...current, opcionId]
        });
      }
    } else {
      // Selección única
      setSelectedOptions({
        ...selectedOptions,
        [votacionId]: [opcionId]
      });
    }
  };

  const handleVotar = async (votacionId: string) => {
    // Verificar autenticación usando el sistema de sesiones
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      if (onLoginRequired) {
        onLoginRequired();
      } else {
        notify.info('Debes iniciar sesión para votar');
      }
      return;
    }

    const opciones = selectedOptions[votacionId];
    if (!opciones || opciones.length === 0) {
      notify.info('Debes seleccionar al menos una opción');
      return;
    }

    setVotando(votacionId);
    const resultado = await emitirVoto(votacionId, opciones);

    if (resultado.ok) {
      notify.success('¡Voto registrado correctamente!');
      
      // Rastrear voto exitoso
      await trackInteraction('voting', 'cast_vote', votacionId, { 
        opciones_count: opciones.length 
      });
      
      // Recargar votaciones para actualizar el estado
      await loadVotaciones();
      // Limpiar selección
      const newSelected = { ...selectedOptions };
      delete newSelected[votacionId];
      setSelectedOptions(newSelected);
      
      // Si los resultados son públicos, cargarlos
      const votacion = votaciones.find(v => v.id === votacionId);
      if (votacion?.resultados_publicos) {
        const results = await getResultadosVotacion(votacionId);
        setResultados({ ...resultados, [votacionId]: results });
        setShowResults({ ...showResults, [votacionId]: true });
      }
    } else if (resultado.status === 401) {
      // La sesión caducó entre abrir la página y votar: no es un rechazo del voto,
      // se arregla volviendo a entrar. El voto no se ha registrado.
      notify.info('Tu sesión ha caducado. Vuelve a iniciar sesión para votar.');
      if (onLoginRequired) onLoginRequired();
    } else {
      // Un diálogo, no un toast: el votante tiene que leer el motivo para saber qué
      // hacer. Un aviso que se va solo no vale aquí.
      await alert({
        title: 'No se ha podido registrar el voto',
        message: `${resultado.motivo}\n\nSi crees que es un error, contacta con el administrador.`,
      });
      // El servidor sabe algo que esta pantalla no: que ya había un voto suyo. Se
      // recarga para que deje de ofrecer votar y muestre "Ya votaste".
      if (resultado.status === 409) await loadVotaciones();
    }
    
    setVotando(null);
  };

  const toggleResults = async (votacionId: string) => {
    if (!showResults[votacionId] && !resultados[votacionId]) {
      const results = await getResultadosVotacion(votacionId);
      setResultados({ ...resultados, [votacionId]: results });
    }
    setShowResults({
      ...showResults,
      [votacionId]: !showResults[votacionId]
    });
  };

  const getTipoIcon = (tipo: string) => {
    const icons = {
      votacion: '🗳️',
      encuesta: '📊',
      referendum: '⚖️'
    };
    return icons[tipo as keyof typeof icons] || '📋';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (votaciones.length === 0) {
    // Un enlace que no lleva a ninguna votación necesita decir otra cosa que la
    // portada sin votaciones abiertas: quien llega aquí viene de un correo suyo.
    return (
      <div className="text-center py-8 md:py-16 bg-slate-800/30 rounded-xl md:rounded-2xl border border-slate-700 px-4">
        <BarChart3 className="w-12 h-12 md:w-20 md:h-20 text-gray-500 mx-auto mb-3 md:mb-4" />
        <h3 className="text-lg md:text-2xl font-bold text-white mb-2">
          {soloVotacionId ? 'Esta votación ya no está disponible' : 'No hay votaciones activas'}
        </h3>
        <p className="text-sm md:text-base text-gray-400">
          {soloVotacionId
            ? 'Puede que se haya retirado o que el enlace no sea correcto.'
            : 'Vuelve pronto para participar en futuras votaciones'}
        </p>
        {soloVotacionId && (
          <a
            href="/#votaciones-section"
            className="inline-block mt-5 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
          >
            Ver las votaciones abiertas
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {!soloVotacionId && (
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-3 md:mb-4">
          Votaciones Activas
        </h2>
        <p className="text-gray-300 text-sm md:text-lg max-w-3xl mx-auto px-2">
          Participa en las decisiones del movimiento. Tu voz cuenta.
        </p>
      </div>
      )}

      <div className="grid gap-6 md:gap-8">
        {votaciones.map((votacion) => {
          const yaVoto = votacion.usuario_ya_voto;
          // `published` trae `estado`; `active` no, porque allí todas están abiertas.
          const abierta = votacion.estado ? votacion.estado === 'activa' : true;
          const puedeVotar = !yaVoto && abierta;
          const selected = selectedOptions[votacion.id] || [];
          const mostrarResultados = showResults[votacion.id] && votacion.resultados_publicos;
          const resultadosVotacion = resultados[votacion.id] || [];

          return (
            <div
              key={votacion.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden border border-orange-500/20"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-4 md:p-6 border-b border-orange-500/30">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-2xl md:text-4xl">{getTipoIcon(votacion.tipo)}</span>
                    <div>
                      <h3 className="text-lg md:text-2xl font-bold text-white">{votacion.titulo}</h3>
                      <p className="text-orange-400 text-xs md:text-sm font-semibold uppercase">
                        {votacion.tipo}
                      </p>
                    </div>
                  </div>
                  
                  {yaVoto && (
                    <div className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-green-500/20 border border-green-500/50 rounded-full">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                      <span className="text-xs md:text-base text-green-400 font-semibold">Ya votaste</span>
                    </div>
                  )}
                </div>

                {votacion.descripcion && (
                  <p className="text-sm md:text-base text-gray-300 mb-3 md:mb-4">{votacion.descripcion}</p>
                )}

                <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>{calcularTiempoRestante(votacion.fecha_fin).texto}</span>
                  </div>
                  {votacion.multiple_respuestas && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full">
                      <AlertCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 font-semibold">Respuesta múltiple</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Opciones de votación */}
              {puedeVotar && (
                <div className="p-4 md:p-6 space-y-2 md:space-y-3">
                  <h4 className="text-white font-bold text-sm md:text-lg mb-3 md:mb-4">
                    {votacion.multiple_respuestas ? 'Selecciona una o más opciones:' : 'Selecciona una opción:'}
                  </h4>
                  
                  {votacion.opciones.map((opcion) => {
                    const isSelected = selected.includes(opcion.id);
                    return (
                      <label
                        key={opcion.id}
                        className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-orange-500/30 to-red-500/30 border-2 border-orange-500'
                            : 'bg-slate-800/50 border-2 border-slate-700 hover:border-orange-500/50'
                        }`}
                      >
                        <input
                          type={votacion.multiple_respuestas ? 'checkbox' : 'radio'}
                          name={`votacion-${votacion.id}`}
                          checked={isSelected}
                          onChange={() => handleOptionSelect(votacion.id, opcion.id, votacion.multiple_respuestas)}
                          className="w-4 h-4 md:w-5 md:h-5 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm md:text-base text-white font-medium flex-1">{opcion.texto}</span>
                      </label>
                    );
                  })}

                  <button
                    onClick={() => handleVotar(votacion.id)}
                    disabled={selected.length === 0 || votando === votacion.id}
                    className="w-full mt-6 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-bold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {votando === votacion.id ? 'Registrando voto...' : 'Votar'}
                  </button>
                </div>
              )}

              {/* Llegar tarde (o pronto) tiene que explicarse: si no, la papeleta
                  aparece sin opciones y parece rota. */}
              {!abierta && !yaVoto && (
                <div className="p-4 md:p-6 text-center text-sm md:text-base text-gray-300">
                  {votacion.estado === 'programada'
                    ? 'Esta votación todavía no está abierta.'
                    : 'Esta votación ya ha finalizado, no se pueden emitir más votos.'}
                </div>
              )}

              {/* Resultados */}
              {votacion.resultados_publicos && (
                <div className="p-6 border-t border-slate-700">
                  <button
                    onClick={() => toggleResults(votacion.id)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors mb-4"
                  >
                    <BarChart3 className="w-5 h-5" />
                    {mostrarResultados ? 'Ocultar Resultados' : 'Ver Resultados'}
                  </button>

                  {mostrarResultados && (
                    <div className="space-y-4 mt-4">
                      {resultadosVotacion.map((resultado) => (
                        <div key={resultado.opcion_id} className="space-y-2">
                          <div className="flex justify-between text-white">
                            <span className="font-medium">{resultado.texto}</span>
                            <span className="font-bold text-orange-400">
                              {resultado.porcentaje}%
                            </span>
                          </div>
                          <div className="relative w-full bg-slate-700 rounded-full h-6 overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-1000 flex items-center justify-end pr-2"
                              style={{ width: `${resultado.porcentaje}%` }}
                            >
                              {resultado.porcentaje > 10 && (
                                <span className="text-white text-xs font-bold">
                                  {resultado.porcentaje}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje de ya votó */}
              {yaVoto && !votacion.resultados_publicos && (
                <div className="p-6 border-t border-slate-700 text-center">
                  <p className="text-gray-300">
                    Gracias por tu participación. Los resultados se publicarán al finalizar la votación.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotingBoard;
