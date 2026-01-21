import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  TrendingUp, 
  Clock, 
  FileText, 
  Link2, 
  GraduationCap, 
  Newspaper, 
  Award,
  BarChart3,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { getInterinosAnalytics, getInterinosContentStats } from '../services/analyticsService';

interface InterinosAnalytics {
  totalVisits: number;
  uniqueUsers: number;
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  averageTimeSeconds: number;
  topUsers: Array<{ user_id: string; user_name: string; interactions: number }>;
  visitsByDay: Array<{ date: string; visits: number }>;
  documentDownloads: number;
  linkClicks: number;
  courseViews: number;
}

interface ContentStats {
  totalDocuments: number;
  totalCourses: number;
  totalLinks: number;
  totalNews: number;
  totalOposiciones: number;
  documentsByCategory: Record<string, number>;
}

export default function InterinosAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<InterinosAnalytics | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, contentData] = await Promise.all([
        getInterinosAnalytics(period),
        getInterinosContentStats()
      ]);
      setAnalytics(analyticsData);
      setContentStats(contentData);
    } catch (error) {
      console.error('Error cargando datos de analytics:', error);
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-orange-500" />
          <div>
            <h2 className="text-2xl font-bold text-white">Métricas de Interinos</h2>
            <p className="text-gray-400 text-sm">Estadísticas de uso y contenido de la sección</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Selector de período */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  period === days
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
          
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-6 rounded-2xl border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">
              Últimos {period} días
            </span>
          </div>
          <div className="text-4xl font-black text-white mb-1">
            {analytics?.totalVisits || 0}
          </div>
          <div className="text-blue-300 text-sm font-semibold">Visitas Totales</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-6 rounded-2xl border border-green-500/30">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-green-400" />
            <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
              Autenticados
            </span>
          </div>
          <div className="text-4xl font-black text-white mb-1">
            {analytics?.uniqueUsers || 0}
          </div>
          <div className="text-green-300 text-sm font-semibold">Usuarios Únicos</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-6 rounded-2xl border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-4xl font-black text-white mb-1">
            {analytics?.totalInteractions || 0}
          </div>
          <div className="text-purple-300 text-sm font-semibold">Interacciones</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-6 rounded-2xl border border-orange-500/30">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
          <div className="text-4xl font-black text-white mb-1">
            {formatTime(analytics?.averageTimeSeconds || 0)}
          </div>
          <div className="text-orange-300 text-sm font-semibold">Tiempo Promedio</div>
        </div>
      </div>

      {/* Estadísticas de contenido */}
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6 text-orange-400" />
          Contenido Publicado
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/60 p-4 rounded-xl text-center">
            <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{contentStats?.totalDocuments || 0}</div>
            <div className="text-gray-400 text-xs">Bibliografía</div>
          </div>
          
          <div className="bg-slate-900/60 p-4 rounded-xl text-center">
            <GraduationCap className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{contentStats?.totalCourses || 0}</div>
            <div className="text-gray-400 text-xs">Cursos</div>
          </div>
          
          <div className="bg-slate-900/60 p-4 rounded-xl text-center">
            <Link2 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{contentStats?.totalLinks || 0}</div>
            <div className="text-gray-400 text-xs">Enlaces</div>
          </div>
          
          <div className="bg-slate-900/60 p-4 rounded-xl text-center">
            <Newspaper className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{contentStats?.totalNews || 0}</div>
            <div className="text-gray-400 text-xs">Noticias</div>
          </div>
          
          <div className="bg-slate-900/60 p-4 rounded-xl text-center">
            <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{contentStats?.totalOposiciones || 0}</div>
            <div className="text-gray-400 text-xs">Oposiciones</div>
          </div>
        </div>
      </div>

      {/* Grid de métricas detalladas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usuarios más activos */}
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-green-400" />
            Usuarios Más Activos
          </h3>
          
          {analytics?.topUsers && analytics.topUsers.length > 0 ? (
            <div className="space-y-3">
              {analytics.topUsers.map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gray-400 text-gray-900' :
                      index === 2 ? 'bg-orange-600 text-orange-100' :
                      'bg-slate-700 text-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{user.user_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-bold">{user.interactions}</span>
                    <span className="text-gray-500 text-xs">interacciones</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Sin datos de usuarios aún</p>
            </div>
          )}
        </div>

        {/* Tipos de interacción */}
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Tipos de Interacción
          </h3>
          
          {analytics?.interactionsByType && Object.keys(analytics.interactionsByType).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(analytics.interactionsByType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([type, count]) => {
                  const total = analytics.totalInteractions || 1;
                  const percentage = Math.round((count / total) * 100);
                  
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 capitalize">
                          {type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Sin interacciones registradas</p>
            </div>
          )}
        </div>
      </div>

      {/* Actividad por día */}
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-cyan-400" />
          Actividad por Día
        </h3>
        
        {analytics?.visitsByDay && analytics.visitsByDay.length > 0 ? (
          <div className="flex items-end gap-1 h-40">
            {analytics.visitsByDay.slice(0, 30).reverse().map((day, index) => {
              const maxVisits = Math.max(...analytics.visitsByDay.map(d => d.visits)) || 1;
              const height = (day.visits / maxVisits) * 100;
              
              return (
                <div
                  key={day.date}
                  className="flex-1 group relative"
                  title={`${day.date}: ${day.visits} visitas`}
                >
                  <div
                    className="bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all hover:from-cyan-500 hover:to-cyan-300"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                    {new Date(day.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}: {day.visits}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Sin datos de actividad</p>
          </div>
        )}
        
        <div className="flex justify-between mt-4 text-xs text-gray-500">
          <span>Hace {period} días</span>
          <span>Hoy</span>
        </div>
      </div>

      {/* Métricas de engagement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 text-center">
          <FileText className="w-10 h-10 text-blue-400 mx-auto mb-3" />
          <div className="text-3xl font-bold text-white mb-1">
            {analytics?.documentDownloads || 0}
          </div>
          <div className="text-gray-400 text-sm">Documentos Consultados</div>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 text-center">
          <Link2 className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <div className="text-3xl font-bold text-white mb-1">
            {analytics?.linkClicks || 0}
          </div>
          <div className="text-gray-400 text-sm">Enlaces Visitados</div>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 text-center">
          <GraduationCap className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <div className="text-3xl font-bold text-white mb-1">
            {analytics?.courseViews || 0}
          </div>
          <div className="text-gray-400 text-sm">Cursos Visualizados</div>
        </div>
      </div>
    </div>
  );
}
