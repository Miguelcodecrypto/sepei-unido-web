import React, { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, Calendar, Users, AlertCircle } from 'lucide-react';
import {
  getVotacionesActivas,
  emitirVoto,
  getResultadosVotacion,
  VotacionCompleta,
  ResultadoVotacion
} from '../services/votingDatabase';
import { getCurrentUser } from '../services/sessionService';
import { trackInteraction, useTrackSectionTime } from '../services/analyticsService';

interface VotingBoardProps {
  onLoginRequired?: () => void;
}

const VotingBoard: React.FC<VotingBoardProps> = ({ onLoginRequired }) => {
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
    const cleanup = useTrackSectionTime('voting');
    return cleanup;
  }, []);

  const loadVotaciones = async () => {
    setLoading(true);
    const data = await getVotacionesActivas();
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
        alert('Debes iniciar sesión para votar');
      }
      return;
    }

    const opciones = selectedOptions[votacionId];
    if (!opciones || opciones.length === 0) {
      alert('Debes seleccionar al menos una opción');
      return;
    }

    setVotando(votacionId);
    const success = await emitirVoto(votacionId, opciones);
    
    if (success) {
      alert('¡Voto registrado correctamente!');
      
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
    } else {
      // Mensajes de error más específicos
      alert('❌ Error al registrar el voto.\n\nPosibles causas:\n• Ya has votado en esta votación\n• No estás autorizado por el administrador\n• La votación ha finalizado\n\nContacta con el administrador si el problema persiste.');
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

  const getTiempoRestante = (fechaFin: string) => {
    const now = new Date();
    const fin = new Date(fechaFin);
    const diff = fin.getTime() - now.getTime();
    
    if (diff <= 0) return 'Finalizada';
    
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (dias > 0) return `${dias} día${dias > 1 ? 's' : ''} restantes`;
    if (horas > 0) return `${horas} hora${horas > 1 ? 's' : ''} restantes`;
    return 'Menos de 1 hora';
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
    return (
      <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700">
        <BarChart3 className="w-20 h-20 text-gray-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">No hay votaciones activas</h3>
        <p className="text-gray-400">Vuelve pronto para participar en futuras votaciones</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-4">
          Votaciones Activas
        </h2>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Participa en las decisiones del movimiento. Tu voz cuenta.
        </p>
      </div>

      <div className="grid gap-8">
        {votaciones.map((votacion) => {
          const yaVoto = votacion.usuario_ya_voto;
          const puedeVotar = !yaVoto;
          const selected = selectedOptions[votacion.id] || [];
          const mostrarResultados = showResults[votacion.id] && votacion.resultados_publicos;
          const resultadosVotacion = resultados[votacion.id] || [];

          return (
            <div
              key={votacion.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-orange-500/20"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-6 border-b border-orange-500/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getTipoIcon(votacion.tipo)}</span>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{votacion.titulo}</h3>
                      <p className="text-orange-400 text-sm font-semibold uppercase">
                        {votacion.tipo}
                      </p>
                    </div>
                  </div>
                  
                  {yaVoto && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-semibold">Ya votaste</span>
                    </div>
                  )}
                </div>

                {votacion.descripcion && (
                  <p className="text-gray-300 mb-4">{votacion.descripcion}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>{getTiempoRestante(votacion.fecha_fin)}</span>
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
                <div className="p-6 space-y-3">
                  <h4 className="text-white font-bold text-lg mb-4">
                    {votacion.multiple_respuestas ? 'Selecciona una o más opciones:' : 'Selecciona una opción:'}
                  </h4>
                  
                  {votacion.opciones.map((opcion) => {
                    const isSelected = selected.includes(opcion.id);
                    return (
                      <label
                        key={opcion.id}
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
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
                          className="w-5 h-5 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-white font-medium flex-1">{opcion.texto}</span>
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
