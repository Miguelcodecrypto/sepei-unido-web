import React, { useState, useEffect, useMemo } from 'react';
import { Users, Download, Trash2, Eye, EyeOff, LogOut, Clock, Lightbulb, Megaphone, BarChart3, CheckCircle, XCircle, Key, TrendingUp, Award, Mail, BookOpen, AlertTriangle, UserX } from 'lucide-react';
import { getAllUsers, deleteUser, exportUsersToCSV, toggleVotingAuthorization, resetTempPassword } from '../services/userDatabase';
import { getAllSuggestions, deleteSuggestion, clearAllSuggestions, exportSuggestionsToCSV } from '../services/suggestionDatabase';
import { logout, getSessionTimeRemaining } from '../services/authService';
import { hashPassword } from '../services/passwordService';
import { trackInteraction, createSectionTimeTracker } from '../services/analyticsService';
import AnnouncementsManager from './AnnouncementsManager';
import VotingManager from './VotingManager';
import AnalyticsDashboard from './AnalyticsDashboard';
import VotingResultsPanel from './VotingResultsPanel';
import { ExternalEmailsManager } from './ExternalEmailsManager';
import InterinosManager from './InterinosManager';
import InterinosAnalyticsDashboard from './InterinosAnalyticsDashboard';
import { getEstadoPlantilla, EstadoPlantilla, COLORES_ESTADO_PLANTILLA } from '../data/plantillaOficialSEPEI';

interface User {
  id: string;
  nombre: string;
  apellidos?: string;
  dni?: string;
  email: string;
  telefono?: string;
  fechaRegistro: string;
  terminos_aceptados: boolean;
  fecha_aceptacion_terminos: string;
  version_terminos: string;
  certificado_nif?: string;
  certificado_thumbprint?: string;
  certificado_fecha_validacion?: string;
  certificado_valido?: boolean;
  autorizado_votar?: boolean;
}

interface Suggestion {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  categoria: 'bombero' | 'cabo' | 'sargento' | 'suboficial' | 'oficial';
  lugarTrabajo: 'Villarrobledo' | 'Hellín' | 'Almansa' | 'La Roda' | 'Alcaraz' | 'Molinicos' | 'Casas Ibáñez';
  asunto: string;
  descripcion: string;
  fechaRegistro: string;
}

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'suggestions' | 'announcements' | 'voting' | 'analytics' | 'results' | 'external-emails' | 'interinos'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSuggestions, setTotalSuggestions] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [filtroPlantilla, setFiltroPlantilla] = useState<'todos' | EstadoPlantilla>('todos');

  // Calcular estados de plantilla para cada usuario
  const usuariosConEstado = useMemo(() => {
    return users.map(user => {
      const estadoInfo = getEstadoPlantilla(user.nombre, user.apellidos);
      return {
        ...user,
        estadoPlantilla: estadoInfo.estado,
        detallesPlantilla: estadoInfo.detalles,
        diferenciasPlantilla: estadoInfo.diferencias
      };
    });
  }, [users]);

  // Filtrar usuarios según el filtro seleccionado
  const usuariosFiltrados = useMemo(() => {
    if (filtroPlantilla === 'todos') return usuariosConEstado;
    return usuariosConEstado.filter(u => u.estadoPlantilla === filtroPlantilla);
  }, [usuariosConEstado, filtroPlantilla]);

  // Contar usuarios por estado
  const conteoEstados = useMemo(() => {
    const conteo: Record<EstadoPlantilla, number> = { en_plantilla: 0, cambios_detectados: 0, no_en_plantilla: 0 };
    usuariosConEstado.forEach(u => {
      if (u.estadoPlantilla) {
        conteo[u.estadoPlantilla]++;
      }
    });
    return conteo;
  }, [usuariosConEstado]);

  useEffect(() => {
    loadUsers();
    loadSuggestions();
    
    // Rastrear acceso al panel de administrador
    trackInteraction('admin', 'view_admin_panel');
    
    // Iniciar seguimiento de tiempo en la sección
    const cleanup = createSectionTimeTracker('admin');
    
    // Actualizar tiempo de sesión cada minuto
    const interval = setInterval(() => {
      setSessionTime(getSessionTimeRemaining());
    }, 60000);
    
    // Mostrar tiempo inicial
    setSessionTime(getSessionTimeRemaining());
    
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const loadUsers = async () => {
    console.log('📥 Cargando usuarios desde Supabase...');
    const data = await getAllUsers();
    console.log('👥 Usuarios obtenidos:', data.length);
    
    // Mapear datos de Supabase (snake_case) a formato del componente (camelCase)
    const mappedData = data.map(user => {
      console.log(`Usuario ${user.nombre}: autorizado_votar =`, user.autorizado_votar);
      return {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        dni: user.dni,
        email: user.email,
        telefono: user.telefono,
        fechaRegistro: user.fecha_registro,
        terminos_aceptados: user.terminos_aceptados,
        fecha_aceptacion_terminos: user.fecha_aceptacion_terminos,
        version_terminos: user.version_terminos,
        certificado_nif: user.certificado_nif,
        certificado_thumbprint: user.certificado_thumbprint,
        certificado_fecha_validacion: user.certificado_fecha_validacion,
        certificado_valido: user.certificado_valido,
        autorizado_votar: user.autorizado_votar,
      };
    });
    
    console.log('✅ Usuarios mapeados, actualizando estado...');
    setUsers(mappedData);
    setTotalUsers(mappedData.length);
    console.log('✅ Estado actualizado');
  };

  const loadSuggestions = async () => {
    const data = await getAllSuggestions();
    // Mapear datos de Supabase (snake_case) a formato del componente (camelCase)
    const mappedData = data.map(suggestion => ({
      id: suggestion.id,
      nombre: suggestion.nombre,
      apellidos: suggestion.apellidos,
      email: suggestion.email,
      telefono: suggestion.telefono,
      categoria: suggestion.categoria,
      lugarTrabajo: suggestion.lugar_trabajo,
      asunto: suggestion.asunto,
      descripcion: suggestion.descripcion,
      fechaRegistro: suggestion.fecha_registro,
    }));
    setSuggestions(mappedData);
    setTotalSuggestions(mappedData.length);
  };

  const handleDeleteUser = async (id: string, nombre: string) => {
    if (confirm(`¿Eliminar a ${nombre}?`)) {
      await deleteUser(id);
      loadUsers();
    }
  };

  const handleDeleteSuggestion = async (id: string, asunto: string) => {
    if (confirm(`¿Eliminar la sugerencia "${asunto}"?`)) {
      await deleteSuggestion(id);
      loadSuggestions();
    }
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const handleExport = async () => {
    await exportUsersToCSV();
  };

  const toggleDetails = (id: string) => {
    setShowDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleClearSuggestions = async () => {
    if (confirm('¿Estás seguro de eliminar TODAS las sugerencias? Esta acción no se puede deshacer.')) {
      await clearAllSuggestions();
      loadSuggestions();
    }
  };

  const handleExportSuggestions = async () => {
    await exportSuggestionsToCSV();
  };

  const handleToggleVotingAuth = async (userId: string, currentStatus: boolean, userName: string) => {
    const action = currentStatus ? 'desautorizar' : 'autorizar';
    if (confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a ${userName} para votar?`)) {
      console.log(`🔄 Cambiando autorización para ${userName} (ID: ${userId})`);
      console.log(`Estado actual: ${currentStatus} -> Nuevo estado: ${!currentStatus}`);
      
      const success = await toggleVotingAuthorization(userId, !currentStatus);
      
      if (success) {
        console.log('✅ Autorización actualizada, recargando usuarios...');
        await loadUsers(); // Recargar lista de usuarios
        alert(`✅ ${userName} ${!currentStatus ? 'autorizado' : 'desautorizado'} correctamente`);
      } else {
        console.error('❌ Error al actualizar autorización');
        alert(`❌ Error al ${action} a ${userName}. Verifica la consola para más detalles.`);
      }
    }
  };

  const handleResetTempPassword = async (userId: string, userName: string, userEmail: string) => {
    // Generar contraseña temporal aleatoria
    const tempPassword = `Sepei${Math.floor(1000 + Math.random() * 9000)}!`;
    
    if (confirm(`¿Resetear contraseña temporal de ${userName}?\n\nNueva contraseña: ${tempPassword}\n\n⚠️ Anota esta contraseña, se la debes comunicar al usuario.`)) {
      const hashedPassword = await hashPassword(tempPassword);
      const success = await resetTempPassword(userId, tempPassword, hashedPassword);
      
      if (success) {
        await loadUsers();
        alert(`✅ Contraseña reseteada correctamente\n\nUsuario: ${userName}\nEmail: ${userEmail}\nContraseña temporal: ${tempPassword}\n\n⚠️ El usuario DEBE cambiar esta contraseña en su próximo login.`);
      } else {
        alert(`❌ Error al resetear contraseña. Verifica la consola.`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header con info de sesión */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-orange-500" />
              <h1 className="text-4xl font-black text-white">Panel de Administración</h1>
            </div>
            <p className="text-gray-400">Gestión de usuarios, sugerencias y propuestas</p>
          </div>
          
          {/* Sesión info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-semibold">{sessionTime}m</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-lg font-semibold transition"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-6 font-bold flex items-center gap-2 transition ${
              activeTab === 'users'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            Usuarios ({totalUsers})
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-4 px-6 font-bold flex items-center gap-2 transition ${
              activeTab === 'suggestions'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-5 h-5" />
            Sugerencias ({totalSuggestions})
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`pb-4 px-6 font-bold flex items-center gap-2 transition ${
              activeTab === 'announcements'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-5 h-5" />
            Anuncios
          </button>
          <button
            onClick={() => setActiveTab('voting')}
            className={`pb-4 px-6 font-bold flex items-center gap-2 transition ${
              activeTab === 'voting'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Votaciones
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-4 px-6 font-bold flex items-center gap-2 transition ${
              activeTab === 'analytics'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('interinos')}
            className={`pb-4 px-6 font-bold flex items-center gap-2 transition ${
              activeTab === 'interinos'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Interinos
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-4 px-6 font-bold flex items-center gap-2 transition ${
              activeTab === 'results'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Award className="w-5 h-5" />
            Resultados
          </button>
          <button
            onClick={() => setActiveTab('external-emails')}
            className={`pb-4 px-6 font-bold flex items-center gap-2 transition ${
              activeTab === 'external-emails'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mail className="w-5 h-5" />
            Emails Externos
          </button>
        </div>

        {/* Stats */}
        {activeTab !== 'announcements' && activeTab !== 'voting' && activeTab !== 'analytics' && activeTab !== 'results' && activeTab !== 'external-emails' && activeTab !== 'interinos' && (
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-orange-500/20 mb-8">
            <div className="text-center">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2">
                {activeTab === 'users' ? totalUsers : totalSuggestions}
              </div>
              <div className="text-gray-400 font-semibold">
                {activeTab === 'users' ? 'Usuarios Registrados' : 'Sugerencias Recibidas'}
              </div>
            </div>
          </div>
        )}

        {/* Filtros de Plantilla Oficial - Solo en pestaña usuarios */}
        {activeTab === 'users' && (
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-semibold text-sm">Filtrar por estado en plantilla oficial:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroPlantilla('todos')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                    filtroPlantilla === 'todos'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Todos ({totalUsers})
                </button>
                <button
                  onClick={() => setFiltroPlantilla('en_plantilla')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                    filtroPlantilla === 'en_plantilla'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  En plantilla ({conteoEstados.en_plantilla})
                </button>
                <button
                  onClick={() => setFiltroPlantilla('cambios_detectados')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                    filtroPlantilla === 'cambios_detectados'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Con cambios ({conteoEstados.cambios_detectados})
                </button>
                <button
                  onClick={() => setFiltroPlantilla('no_en_plantilla')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                    filtroPlantilla === 'no_en_plantilla'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  <UserX className="w-4 h-4" />
                  No en plantilla ({conteoEstados.no_en_plantilla})
                </button>
              </div>
            </div>
            {/* Leyenda de colores */}
            <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/50"></div>
                <span className="text-gray-400">En plantilla oficial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/50"></div>
                <span className="text-gray-400">Cambios detectados (destino, etc.)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50"></div>
                <span className="text-gray-400">No aparece en plantilla oficial</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {(activeTab === 'users' || activeTab === 'suggestions') && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={activeTab === 'users' ? handleExport : handleExportSuggestions}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
            >
              <Download className="w-5 h-5" />
              Exportar CSV
            </button>
            
            {activeTab === 'suggestions' && (
              <button
                onClick={handleClearSuggestions}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                <Trash2 className="w-5 h-5" />
                Limpiar Sugerencias
              </button>
            )}
          </div>
        )}

        {/* Users Table */}
        {activeTab === 'users' && (
        <div className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 overflow-hidden">
          {usuariosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-lg">
                {filtroPlantilla === 'todos' 
                  ? 'No hay usuarios registrados aún' 
                  : `No hay usuarios con el filtro "${filtroPlantilla === 'en_plantilla' ? 'En plantilla' : filtroPlantilla === 'cambios_detectados' ? 'Con cambios' : 'No en plantilla'}"`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/80 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-white font-semibold">Estado</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Nombre</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Apellidos</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">DNI</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Email</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Teléfono</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Fecha Registro</th>
                    <th className="px-6 py-4 text-center text-white font-semibold">Voto</th>
                    <th className="px-6 py-4 text-center text-white font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((user) => {
                    const colorEstado = user.estadoPlantilla === 'en_plantilla' 
                      ? 'border-l-4 border-l-green-500 bg-green-500/5'
                      : user.estadoPlantilla === 'cambios_detectados'
                      ? 'border-l-4 border-l-amber-500 bg-amber-500/10'
                      : 'border-l-4 border-l-red-500 bg-red-500/10';
                    
                    return (
                    <React.Fragment key={user.id}>
                      <tr className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition ${colorEstado}`}>
                        <td className="px-4 py-4">
                          {user.estadoPlantilla === 'en_plantilla' && (
                            <div className="flex items-center gap-1" title="En plantilla oficial">
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            </div>
                          )}
                          {user.estadoPlantilla === 'cambios_detectados' && (
                            <div className="flex items-center gap-1" title={`Cambios detectados: ${user.diferenciasPlantilla?.map((d: { campo: string; valor: string; valorOficial: string }) => `${d.campo}: ${d.valor} → ${d.valorOficial}`).join(', ')}`}>
                              <AlertTriangle className="w-5 h-5 text-amber-400" />
                            </div>
                          )}
                          {user.estadoPlantilla === 'no_en_plantilla' && (
                            <div className="flex items-center gap-1" title="No aparece en plantilla oficial">
                              <UserX className="w-5 h-5 text-red-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-white">{user.nombre}</td>
                        <td className="px-6 py-4 text-gray-300">{user.apellidos || '-'}</td>
                        <td className="px-6 py-4 text-gray-300">{user.dni || '-'}</td>
                        <td className="px-6 py-4 text-gray-300">{user.email}</td>
                        <td className="px-6 py-4 text-gray-300">{user.telefono || '-'}</td>
                        <td className="px-6 py-4 text-gray-300">
                          {new Date(user.fechaRegistro).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleVotingAuth(user.id, user.autorizado_votar || false, user.nombre)}
                            className={`p-2 rounded transition ${
                              user.autorizado_votar 
                                ? 'bg-green-600/20 hover:bg-red-600/20 text-green-400 hover:text-red-400' 
                                : 'bg-red-600/20 hover:bg-green-600/20 text-red-400 hover:text-green-400'
                            }`}
                            title={user.autorizado_votar ? 'Desautorizar voto' : 'Autorizar voto'}
                          >
                            {user.autorizado_votar ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleResetTempPassword(user.id, user.nombre, user.email)}
                              className="p-2 hover:bg-yellow-600/30 rounded transition text-yellow-400"
                              title="Resetear contraseña temporal"
                            >
                              <Key className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => toggleDetails(user.id)}
                              className="p-2 hover:bg-blue-600/30 rounded transition text-blue-400"
                              title="Ver detalles"
                            >
                              {showDetails[user.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.nombre)}
                              className="p-2 hover:bg-red-600/30 rounded transition text-red-400"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {showDetails[user.id] && (
                        <tr className="bg-slate-900/50 border-b border-slate-700/50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="space-y-4">
                              {/* Información de Plantilla Oficial */}
                              <div className={`border rounded-lg p-4 mb-4 ${
                                user.estadoPlantilla === 'en_plantilla' 
                                  ? 'border-green-500/30 bg-green-500/10'
                                  : user.estadoPlantilla === 'cambios_detectados'
                                  ? 'border-amber-500/30 bg-amber-500/10'
                                  : 'border-red-500/30 bg-red-500/10'
                              }`}>
                                <h4 className={`font-bold mb-3 flex items-center gap-2 ${
                                  user.estadoPlantilla === 'en_plantilla' 
                                    ? 'text-green-300'
                                    : user.estadoPlantilla === 'cambios_detectados'
                                    ? 'text-amber-300'
                                    : 'text-red-300'
                                }`}>
                                  {user.estadoPlantilla === 'en_plantilla' && <CheckCircle className="w-5 h-5" />}
                                  {user.estadoPlantilla === 'cambios_detectados' && <AlertTriangle className="w-5 h-5" />}
                                  {user.estadoPlantilla === 'no_en_plantilla' && <UserX className="w-5 h-5" />}
                                  Estado en Plantilla Oficial SEPEI
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {user.estadoPlantilla === 'en_plantilla' && user.detallesPlantilla && (
                                    <>
                                      <div>
                                        <span className="text-gray-400">Estado: </span>
                                        <span className="text-green-300 font-semibold">✓ En plantilla oficial</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Destino oficial: </span>
                                        <span className="text-white">{user.detallesPlantilla.destino}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Categoría oficial: </span>
                                        <span className="text-white">{user.detallesPlantilla.categoria}</span>
                                      </div>
                                    </>
                                  )}
                                  {user.estadoPlantilla === 'cambios_detectados' && user.detallesPlantilla && (
                                    <>
                                      <div>
                                        <span className="text-gray-400">Estado: </span>
                                        <span className="text-amber-300 font-semibold">⚠️ Cambios detectados</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Destino oficial: </span>
                                        <span className="text-white">{user.detallesPlantilla.destino}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Categoría oficial: </span>
                                        <span className="text-white">{user.detallesPlantilla.categoria}</span>
                                      </div>
                                      {user.diferenciasPlantilla && user.diferenciasPlantilla.length > 0 && (
                                        <div className="mt-2 p-2 bg-amber-500/20 rounded">
                                          <span className="text-amber-300 font-semibold">Diferencias:</span>
                                          {user.diferenciasPlantilla.map((dif: { campo: string; valor: string; valorOficial: string }, idx: number) => (
                                            <div key={idx} className="text-amber-200 ml-2">
                                              • {dif.campo}: <span className="line-through text-red-300">{dif.valor}</span> → <span className="text-green-300">{dif.valorOficial}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {user.estadoPlantilla === 'no_en_plantilla' && (
                                    <div>
                                      <span className="text-gray-400">Estado: </span>
                                      <span className="text-red-300 font-semibold">❌ No aparece en la plantilla oficial del SEPEI</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Información FNMT */}
                              {user.certificado_nif && (
                                <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-4 mb-4">
                                  <h4 className="text-green-300 font-bold mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Verificación FNMT
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-400">NIF Verificado: </span>
                                      <span className="text-green-300 font-semibold">{user.certificado_nif}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Fecha Verificación: </span>
                                      <span className="text-white">
                                        {user.certificado_fecha_validacion ? new Date(user.certificado_fecha_validacion).toLocaleDateString('es-ES') : 'N/A'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Estado: </span>
                                      <span className={user.certificado_valido ? 'text-green-300 font-semibold' : 'text-red-300 font-semibold'}>
                                        {user.certificado_valido ? '✓ Válido' : '✗ Inválido'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Información de Consentimiento RGPD */}
                              <div className="border-t border-slate-700 pt-4 mt-4">
                                <h4 className="text-white font-semibold mb-3 text-sm">Consentimiento RGPD</h4>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-gray-400">Términos Aceptados: </span>
                                    <span className={user.terminos_aceptados ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                                      {user.terminos_aceptados ? '✓ Sí' : '✗ No'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Versión Términos: </span>
                                    <span className="text-white">{user.version_terminos}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Fecha Aceptación: </span>
                                    <span className="text-white">
                                      {new Date(user.fecha_aceptacion_terminos).toLocaleDateString('es-ES')} {new Date(user.fecha_aceptacion_terminos).toLocaleTimeString('es-ES')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* Suggestions Table */}
        {activeTab === 'suggestions' && (
        <div className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 overflow-hidden">
          {suggestions.length === 0 ? (
            <div className="p-12 text-center">
              <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No hay sugerencias aún</p>
              <p className="text-gray-500 text-sm mt-2">Las propuestas de bomberos aparecerán aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/80 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-white font-semibold">Nombre</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Categoría</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Lugar</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Asunto</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Email</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Fecha</th>
                    <th className="px-6 py-4 text-center text-white font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((suggestion) => (
                    <React.Fragment key={suggestion.id}>
                      <tr className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                        <td className="px-6 py-4 text-white font-semibold">{suggestion.nombre} {suggestion.apellidos}</td>
                        <td className="px-6 py-4 text-gray-300">
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold">
                            {suggestion.categoria.charAt(0).toUpperCase() + suggestion.categoria.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{suggestion.lugarTrabajo}</td>
                        <td className="px-6 py-4 text-gray-300 max-w-xs truncate">{suggestion.asunto}</td>
                        <td className="px-6 py-4 text-gray-300 text-sm">{suggestion.email}</td>
                        <td className="px-6 py-4 text-gray-300">
                          {new Date(suggestion.fechaRegistro).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => toggleDetails(suggestion.id)}
                              className="p-2 hover:bg-blue-600/30 rounded transition text-blue-400"
                              title="Ver propuesta completa"
                            >
                              {showDetails[suggestion.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteSuggestion(suggestion.id, suggestion.asunto)}
                              className="p-2 hover:bg-red-600/30 rounded transition text-red-400"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {showDetails[suggestion.id] && (
                        <tr className="bg-slate-900/50 border-b border-slate-700/50">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-4">
                              <div className="border-t border-slate-700 pt-4">
                                <h4 className="text-white font-semibold mb-2">Descripción Completa</h4>
                                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{suggestion.descripcion}</p>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Email: </span>
                                  <span className="text-white">{suggestion.email}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Teléfono: </span>
                                  <span className="text-white">{suggestion.telefono}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Fecha Registro: </span>
                                  <span className="text-white">
                                    {new Date(suggestion.fechaRegistro).toLocaleDateString('es-ES')} {new Date(suggestion.fechaRegistro).toLocaleTimeString('es-ES')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Lugar de Trabajo: </span>
                                  <span className="text-white">{suggestion.lugarTrabajo}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* Announcements Manager */}
        {activeTab === 'announcements' && (
          <AnnouncementsManager />
        )}

        {/* Voting Manager */}
        {activeTab === 'voting' && (
          <VotingManager />
        )}

        {/* Analytics Dashboard */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard onClose={() => setActiveTab('users')} />
        )}

        {/* Voting Results Panel */}
        {activeTab === 'results' && (
          <VotingResultsPanel onClose={() => setActiveTab('voting')} />
        )}

        {/* External Emails Manager */}
        {activeTab === 'external-emails' && (
          <ExternalEmailsManager />
        )}

        {activeTab === 'interinos' && (
          <div className="space-y-8">
            <InterinosManager />
            <div className="border-t border-slate-700 pt-8">
              <InterinosAnalyticsDashboard />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
