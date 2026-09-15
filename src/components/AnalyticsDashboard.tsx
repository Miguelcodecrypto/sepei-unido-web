import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, TrendingUp, Calendar, Activity } from 'lucide-react';
import { getAnalyticsSummary, getSectionInteractions, getTopActiveUsers } from '../services/analyticsService';

interface AnalyticsDashboardProps {
  onClose?: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    totalVisits: number;
    uniqueUsers: number;
    authenticatedVisits: number;
    anonymousVisits: number;
    uniqueSessions: number;
    pageViews: number;
    visitsByDay: Array<{ date: string; visits: number }>;
  }>({
    totalVisits: 0,
    uniqueUsers: 0,
    authenticatedVisits: 0,
    anonymousVisits: 0,
    uniqueSessions: 0,
    pageViews: 0,
    visitsByDay: []
  });
  const [sectionStats, setSectionStats] = useState({
    announcements: 0,
    voting: 0,
    suggestions: 0,
    admin: 0
  });
  const [topUsers, setTopUsers] = useState<Array<{
    user_id: string;
    user_name: string;
    user_email: string;
    total_interactions: number;
    last_interaction: string;
  }>>([]);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [summaryData, sectionsData, usersData] = await Promise.all([
        getAnalyticsSummary(timeRange),
        getSectionInteractions(timeRange),
        getTopActiveUsers(10)
      ]);

      setSummary(summaryData);
      setSectionStats(sectionsData);
      setTopUsers(usersData);
    } catch (error) {
      console.error('Error cargando analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    color: string;
    /**
     * Qué mide la cifra, en una línea y a la vista.
     *
     * Va escrito, no en un tooltip: estas cinco cifras mezclan dos unidades
     * distintas (eventos y personas) y puestas en fila invitan a compararlas o
     * sumarlas. Lo que evita el error es leerlo sin tener que descubrirlo.
     */
    descripcion: string;
  }

  const StatCard = ({ icon: Icon, label, value, color, descripcion }: StatCardProps) => (
    <div className="bg-slate-800/90 rounded-xl border-2 border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
      </div>
      <p className="text-gray-300 text-sm font-semibold">{label}</p>
      <p className="text-slate-500 text-xs mt-1 leading-snug">{descripcion}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-xl">Cargando estadísticas...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <p className="text-slate-400 text-sm">Estadísticas de visitas e interacciones</p>
          
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {/* Selector de rango de tiempo */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-4 py-2 bg-slate-800 text-white border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
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

        {/* Las cinco cifras miden dos cosas distintas y antes iban en una sola fila de
            cinco, sin decirlo: tres son EVENTOS (cuántas veces se ha entrado) y dos son
            PERSONAS O SESIONES (cuántos han entrado). Separarlas en dos bloques evita que
            se lean como una serie comparable, que es lo que invitaba a hacer. */}
        <section className="mb-8" aria-labelledby="titulo-visitas">
          <div className="mb-3">
            <h2 id="titulo-visitas" className="text-lg font-bold text-white">Visitas</h2>
            <p className="text-slate-400 text-sm">
              Cuántas veces se ha entrado. Una visita es <strong className="text-slate-300">una carga
              de la web</strong>: moverse entre secciones no suma, porque la página no se recarga.
              El total es la suma de las otras dos.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={Eye}
              label="Total de visitas"
              value={summary.totalVisits.toLocaleString()}
              color="bg-blue-600"
              descripcion="Todas las cargas de la web en el periodo"
            />
            <StatCard
              icon={Activity}
              label="Visitas autenticadas"
              value={summary.authenticatedVisits.toLocaleString()}
              color="bg-purple-600"
              descripcion="Cargas con la sesión ya iniciada"
            />
            <StatCard
              icon={TrendingUp}
              label="Visitas anónimas"
              value={summary.anonymousVisits.toLocaleString()}
              color="bg-orange-600"
              descripcion="Cargas de quien no había iniciado sesión"
            />
          </div>
        </section>

        <section className="mb-8" aria-labelledby="titulo-quien">
          <div className="mb-3">
            <h2 id="titulo-quien" className="text-lg font-bold text-white">Quién</h2>
            <p className="text-slate-400 text-sm">
              Cuántos han entrado, no cuántas veces. ⚠{' '}Los visitantes anónimos son{' '}
              <strong className="text-slate-300">sesiones de navegador</strong>, no personas
              únicas: la cuenta se reinicia al cerrar la pestaña, así que quien vuelve otro día
              suma otra vez. Sin cookies persistentes ni IP —que no se guarda, a propósito— es
              lo más fino que se puede medir, y siempre por exceso.
            </p>
          </div>
          {/* Tres columnas con solo dos tarjetas, a propósito: así tienen el mismo ancho
              que las del bloque de arriba. Con `md:grid-cols-2` salían mucho más anchas y
              parecían más importantes que las visitas, que no lo son. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={Users}
              label="Usuarios identificados"
              value={summary.uniqueUsers.toLocaleString()}
              color="bg-green-600"
              descripcion="Personas distintas con sesión iniciada (sin repetir)"
            />
            <StatCard
              icon={Users}
              label="Visitantes anónimos"
              value={summary.uniqueSessions.toLocaleString()}
              color="bg-gray-600"
              descripcion="Sesiones distintas sin identificar — estimación por exceso"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Interacciones por Sección */}
          <div className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Interacciones por Sección
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">📰 Anuncios</span>
                  <span className="text-white font-bold">{sectionStats.announcements}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{
                      width: `${(sectionStats.announcements / (sectionStats.announcements + sectionStats.voting + sectionStats.suggestions + sectionStats.admin || 1)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">🗳️ Votaciones</span>
                  <span className="text-white font-bold">{sectionStats.voting}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{
                      width: `${(sectionStats.voting / (sectionStats.announcements + sectionStats.voting + sectionStats.suggestions + sectionStats.admin || 1)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">💡 Sugerencias</span>
                  <span className="text-white font-bold">{sectionStats.suggestions}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-purple-500 h-3 rounded-full transition-all"
                    style={{
                      width: `${(sectionStats.suggestions / (sectionStats.announcements + sectionStats.voting + sectionStats.suggestions + sectionStats.admin || 1)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">⚙️ Admin</span>
                  <span className="text-white font-bold">{sectionStats.admin}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-orange-500 h-3 rounded-full transition-all"
                    style={{
                      width: `${(sectionStats.admin / (sectionStats.announcements + sectionStats.voting + sectionStats.suggestions + sectionStats.admin || 1)) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Usuarios Más Activos */}
          <div className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Usuarios Más Activos
            </h2>
            
            <div className="space-y-3">
              {topUsers.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No hay datos de usuarios aún
                </p>
              ) : (
                topUsers.map((user, index) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.user_name}</p>
                        <p className="text-gray-400 text-sm">{user.user_email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{user.total_interactions}</p>
                      <p className="text-gray-400 text-xs">interacciones</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
