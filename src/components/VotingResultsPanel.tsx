import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Award, Calendar } from 'lucide-react';
import { getVotacionesPublicadas } from '../services/votingDatabase';

interface Votacion {
  id: string;
  titulo: string;
  descripcion?: string;
  opciones: string[];
  fecha_inicio: string;
  fecha_fin: string;
  resultados_publicos: boolean;
  estado?: 'activa' | 'finalizada' | 'programada';
  votos?: Array<{
    opcion: string;
    votos: number;
  }>;
  total_votos?: number;
  usuario_voto?: boolean;
  requiere_autorizacion?: boolean;
}

interface VotingResultsPanelProps {
  onClose?: () => void;
}

const VotingResultsPanel: React.FC<VotingResultsPanelProps> = ({ onClose }) => {
  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'activa' | 'finalizada'>('todas');

  useEffect(() => {
    loadVotaciones();
  }, []);

  const loadVotaciones = async () => {
    setLoading(true);
    try {
      const data = await getVotacionesPublicadas();
      setVotaciones(data);
    } catch (error) {
      console.error('Error cargando votaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVotaciones = filter === 'todas' 
    ? votaciones 
    : votaciones.filter(v => v.estado === filter);

  const getWinningOption = (votacion: Votacion) => {
    if (!votacion.votos || votacion.votos.length === 0) return null;
    return votacion.votos.reduce((max, current) => 
      current.votos > max.votos ? current : max
    );
  };

  const getParticipationRate = (votacion: Votacion) => {
    // Esto es estimado, idealmente necesitarías el total de usuarios elegibles
    return votacion.total_votos || 0;
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activa':
        return 'bg-green-600';
      case 'finalizada':
        return 'bg-gray-600';
      case 'programada':
        return 'bg-blue-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'activa':
        return 'Activa';
      case 'finalizada':
        return 'Finalizada';
      case 'programada':
        return 'Programada';
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-xl">Cargando resultados...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🗳️ Resultados de Votaciones
            </h1>
            <p className="text-gray-400">
              Visualización completa de todas las votaciones
            </p>
          </div>
          
          <div className="flex gap-4">
            {/* Filtros */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-slate-800 text-white border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas</option>
              <option value="activa">Activas</option>
              <option value="finalizada">Finalizadas</option>
            </select>

            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white border-2 border-slate-700 rounded-lg hover:bg-slate-700 transition"
              >
                Volver
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/90 rounded-xl border-2 border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-lg bg-blue-600">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{votaciones.length}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Votaciones</p>
          </div>

          <div className="bg-slate-800/90 rounded-xl border-2 border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-lg bg-green-600">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">
                {votaciones.filter(v => v.estado === 'activa').length}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Votaciones Activas</p>
          </div>

          <div className="bg-slate-800/90 rounded-xl border-2 border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-lg bg-purple-600">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">
                {votaciones.reduce((sum, v) => sum + (v.total_votos || 0), 0)}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Total Votos Emitidos</p>
          </div>
        </div>

        {/* Votaciones List */}
        <div className="space-y-6">
          {filteredVotaciones.length === 0 ? (
            <div className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 p-12 text-center">
              <p className="text-gray-400 text-lg">
                No hay votaciones {filter !== 'todas' ? `${filter}s` : ''} disponibles
              </p>
            </div>
          ) : (
            filteredVotaciones.map((votacion) => {
              const winningOption = getWinningOption(votacion);
              const totalVotos = votacion.total_votos || 0;

              return (
                <div
                  key={votacion.id}
                  className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 p-6 hover:border-blue-500/50 transition"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">
                          {votacion.titulo}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(votacion.estado || 'programada')}`}>
                          {getStatusText(votacion.estado || 'programada')}
                        </span>
                      </div>
                      <p className="text-gray-400 mb-3">{votacion.descripcion}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Inicio: {new Date(votacion.fecha_inicio).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Fin: {new Date(votacion.fecha_fin).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {totalVotos} votos
                        </span>
                      </div>
                    </div>

                    {winningOption && (
                      <div className="bg-yellow-600/20 border-2 border-yellow-600 rounded-lg p-4 ml-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-5 h-5 text-yellow-500" />
                          <span className="text-yellow-500 font-bold text-sm">GANADORA</span>
                        </div>
                        <p className="text-white font-bold">{winningOption.opcion}</p>
                        <p className="text-yellow-400 text-sm">
                          {winningOption.votos} votos ({totalVotos > 0 ? Math.round((winningOption.votos / totalVotos) * 100) : 0}%)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Results */}
                  <div className="space-y-3">
                    {votacion.votos && votacion.votos.length > 0 ? (
                      votacion.votos.map((opcion, index) => {
                        const porcentaje = totalVotos > 0 ? (opcion.votos / totalVotos) * 100 : 0;
                        const isWinning = winningOption && opcion.opcion === winningOption.opcion;

                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`font-medium ${isWinning ? 'text-yellow-400' : 'text-gray-300'}`}>
                                {opcion.opcion}
                              </span>
                              <span className={`font-bold ${isWinning ? 'text-yellow-400' : 'text-white'}`}>
                                {opcion.votos} votos ({porcentaje.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  isWinning ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${porcentaje}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-400 text-center py-4">
                        No hay votos registrados aún
                      </p>
                    )}
                  </div>

                  {/* Footer Info */}
                  <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">
                      Resultados {votacion.resultados_publicos ? '🔓 Públicos' : '🔒 Privados'}
                    </span>
                    <span className="text-gray-400 text-sm">
                      Participación: {getParticipationRate(votacion)} usuarios
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default VotingResultsPanel;
