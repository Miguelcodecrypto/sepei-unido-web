import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Ban, Unlock, Eye, EyeOff, AlertTriangle, CheckCircle, Globe, Clock, Key, Filter, Download } from 'lucide-react';
import { 
  getRecentLoginAttempts, 
  getBlockedIPs, 
  getSecurityStats, 
  unblockIP,
  LoginAttemptRecord,
  SecurityStats
} from '../services/adminSecurityService';

export default function SecurityPanel() {
  const [attempts, setAttempts] = useState<LoginAttemptRecord[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<Array<{
    id: string;
    ip_address: string;
    reason: string;
    blocked_at: string;
    blocked_until: string | null;
  }>>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [filter, setFilter] = useState<'all' | 'failed' | 'success'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attemptsData, blockedData, statsData] = await Promise.all([
        getRecentLoginAttempts(100),
        getBlockedIPs(),
        getSecurityStats()
      ]);
      setAttempts(attemptsData);
      setBlockedIPs(blockedData);
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando datos de seguridad:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUnblock = async (ip: string) => {
    if (confirm(`¿Desbloquear la IP ${ip}?`)) {
      const success = await unblockIP(ip);
      if (success) {
        await loadData();
      }
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAttempts = attempts.filter(attempt => {
    if (filter === 'all') return true;
    if (filter === 'failed') return !attempt.success;
    if (filter === 'success') return attempt.success;
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Fecha', 'IP', 'Contraseña Intentada', 'Éxito', 'Intentos', 'User Agent', 'País', 'Ciudad'];
    const rows = attempts.map(a => [
      new Date(a.created_at).toLocaleString('es-ES'),
      a.ip_address,
      a.attempted_password,
      a.success ? 'Sí' : 'No',
      a.attempt_number.toString(),
      a.user_agent,
      a.country || '',
      a.city || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando datos de seguridad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-orange-500" />
          <h2 className="text-2xl font-bold text-white">Panel de Seguridad</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="text-3xl font-black text-white">{stats.total_attempts}</div>
            <div className="text-gray-400 text-sm">Total Intentos</div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
            <div className="text-3xl font-black text-red-400">{stats.failed_attempts_24h}</div>
            <div className="text-gray-400 text-sm">Fallidos (24h)</div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30">
            <div className="text-3xl font-black text-green-400">{stats.successful_attempts_24h}</div>
            <div className="text-gray-400 text-sm">Exitosos (24h)</div>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
            <div className="text-3xl font-black text-blue-400">{stats.unique_ips_24h}</div>
            <div className="text-gray-400 text-sm">IPs Únicas (24h)</div>
          </div>
          <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30">
            <div className="text-3xl font-black text-amber-400">{stats.blocked_ips}</div>
            <div className="text-gray-400 text-sm">IPs Bloqueadas</div>
          </div>
        </div>
      )}

      {/* Suspicious IPs Alert */}
      {stats?.suspicious_ips && stats.suspicious_ips.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-amber-400">IPs Sospechosas (3+ intentos fallidos en 24h)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.suspicious_ips.map((item, idx) => (
              <div key={idx} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <code className="text-amber-300">{item.ip}</code>
                  <div className="text-xs text-gray-500">{item.attempts} intentos</div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(item.last_attempt).toLocaleTimeString('es-ES')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked IPs */}
      {blockedIPs.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-red-400">IPs Bloqueadas ({blockedIPs.length})</h3>
          </div>
          <div className="space-y-2">
            {blockedIPs.map(blocked => (
              <div key={blocked.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <code className="text-red-300">{blocked.ip_address}</code>
                  <div className="text-xs text-gray-500">{blocked.reason}</div>
                  <div className="text-xs text-gray-600">
                    {blocked.blocked_until 
                      ? `Hasta: ${new Date(blocked.blocked_until).toLocaleString('es-ES')}`
                      : 'Bloqueo permanente'
                    }
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(blocked.ip_address)}
                  className="flex items-center gap-1 px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition"
                >
                  <Unlock className="w-4 h-4" />
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Login Attempts Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-orange-500" />
            Historial de Intentos de Acceso
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'failed' | 'success')}
                className="bg-slate-700 text-white text-sm px-3 py-1 rounded-lg border border-slate-600"
              >
                <option value="all">Todos</option>
                <option value="failed">Solo Fallidos</option>
                <option value="success">Solo Exitosos</option>
              </select>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left p-3 text-gray-400 font-semibold text-sm">Fecha/Hora</th>
                <th className="text-left p-3 text-gray-400 font-semibold text-sm">IP</th>
                <th className="text-left p-3 text-gray-400 font-semibold text-sm">Contraseña</th>
                <th className="text-center p-3 text-gray-400 font-semibold text-sm">Estado</th>
                <th className="text-center p-3 text-gray-400 font-semibold text-sm">Intento #</th>
                <th className="text-left p-3 text-gray-400 font-semibold text-sm">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No hay intentos de acceso registrados
                  </td>
                </tr>
              ) : (
                filteredAttempts.map(attempt => (
                  <tr key={attempt.id} className={`hover:bg-slate-700/30 ${!attempt.success ? 'bg-red-500/5' : ''}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {new Date(attempt.created_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="p-3">
                      <code className="text-blue-300 text-sm bg-slate-900/50 px-2 py-1 rounded">
                        {attempt.ip_address}
                      </code>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <code className={`text-sm ${showPasswords[attempt.id] ? 'text-amber-300' : 'text-gray-500'}`}>
                          {showPasswords[attempt.id] ? attempt.attempted_password : '••••••••'}
                        </code>
                        <button
                          onClick={() => togglePasswordVisibility(attempt.id)}
                          className="text-gray-500 hover:text-white transition"
                          title={showPasswords[attempt.id] ? 'Ocultar' : 'Mostrar'}
                        >
                          {showPasswords[attempt.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {attempt.success ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          Éxito
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Fallido
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-bold ${attempt.attempt_number >= 5 ? 'text-red-400' : 'text-gray-400'}`}>
                        {attempt.attempt_number}
                      </span>
                    </td>
                    <td className="p-3">
                      {attempt.country || attempt.city ? (
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <Globe className="w-4 h-4" />
                          {[attempt.city, attempt.country].filter(Boolean).join(', ')}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-900/30 border-t border-slate-700 text-center text-gray-500 text-sm">
          Mostrando {filteredAttempts.length} de {attempts.length} registros
        </div>
      </div>
    </div>
  );
}
