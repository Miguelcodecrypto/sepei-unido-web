import React, { useState, useEffect } from 'react';
import { Users, Download, Trash2, Eye, EyeOff, LogOut, Clock, Lightbulb, Megaphone, BarChart3 } from 'lucide-react';
import { getAllUsers, deleteUser, clearDatabase, exportUsersToCSV } from '../services/userDatabase';
import { getAllSuggestions, deleteSuggestion, clearAllSuggestions, exportSuggestionsToCSV } from '../services/suggestionDatabase';
import { logout, getSessionTimeRemaining } from '../services/authService';
import AnnouncementsManager from './AnnouncementsManager';
import VotingManager from './VotingManager';

interface User {
  id: string;
  nombre: string;
  apellidos?: string;
  dni?: string;
  email: string;
  telefono?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  fechaRegistro: string;
  terminos_aceptados: boolean;
  fecha_aceptacion_terminos: string;
  version_terminos: string;
  certificado_nif?: string;
  certificado_thumbprint?: string;
  certificado_fecha_validacion?: string;
  certificado_valido?: boolean;
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
  const [activeTab, setActiveTab] = useState<'users' | 'suggestions' | 'announcements' | 'voting'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSuggestions, setTotalSuggestions] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    loadUsers();
    loadSuggestions();
    
    // Actualizar tiempo de sesión cada minuto
    const interval = setInterval(() => {
      setSessionTime(getSessionTimeRemaining());
    }, 60000);
    
    // Mostrar tiempo inicial
    setSessionTime(getSessionTimeRemaining());
    
    return () => clearInterval(interval);
  }, []);

  const loadUsers = async () => {
    const data = await getAllUsers();
    // Mapear datos de Supabase (snake_case) a formato del componente (camelCase)
    const mappedData = data.map(user => ({
      id: user.id,
      nombre: user.nombre,
      apellidos: user.apellidos,
      dni: user.dni,
      email: user.email,
      telefono: user.telefono,
      instagram: user.instagram,
      facebook: user.facebook,
      twitter: user.twitter,
      linkedin: user.linkedin,
      fechaRegistro: user.fecha_registro,
      terminos_aceptados: user.terminos_aceptados,
      fecha_aceptacion_terminos: user.fecha_aceptacion_terminos,
      version_terminos: user.version_terminos,
      certificado_nif: user.certificado_nif,
      certificado_thumbprint: user.certificado_thumbprint,
      certificado_fecha_validacion: user.certificado_fecha_validacion,
      certificado_valido: user.certificado_valido,
    }));
    setUsers(mappedData);
    setTotalUsers(mappedData.length);
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

  const handleClearDatabase = async () => {
    if (confirm('¿Estás seguro de eliminar TODOS los usuarios? Esta acción no se puede deshacer.')) {
      await clearDatabase();
      loadUsers();
    }
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
        </div>

        {/* Stats */}
        {activeTab !== 'announcements' && activeTab !== 'voting' && (
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

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={activeTab === 'users' ? handleExport : handleExportSuggestions}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
          
          <button
            onClick={activeTab === 'users' ? handleClearDatabase : handleClearSuggestions}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            <Trash2 className="w-5 h-5" />
            {activeTab === 'users' ? 'Limpiar Base de Datos' : 'Limpiar Sugerencias'}
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
        <div className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-lg">No hay usuarios registrados aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/80 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-white font-semibold">Nombre</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Apellidos</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">DNI</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Email</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Teléfono</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Fecha Registro</th>
                    <th className="px-6 py-4 text-center text-white font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <React.Fragment key={user.id}>
                      <tr className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                        <td className="px-6 py-4 text-white">{user.nombre}</td>
                        <td className="px-6 py-4 text-gray-300">{user.apellidos || '-'}</td>
                        <td className="px-6 py-4 text-gray-300">{user.dni || '-'}</td>
                        <td className="px-6 py-4 text-gray-300">{user.email}</td>
                        <td className="px-6 py-4 text-gray-300">{user.telefono || '-'}</td>
                        <td className="px-6 py-4 text-gray-300">
                          {new Date(user.fechaRegistro).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
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
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-4">
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

                              {/* Redes Sociales */}
                              <div className="grid md:grid-cols-2 gap-4">
                                {user.instagram && (
                                  <div>
                                    <span className="text-gray-400">Instagram: </span>
                                    <span className="text-white">{user.instagram}</span>
                                  </div>
                                )}
                                {user.facebook && (
                                  <div>
                                    <span className="text-gray-400">Facebook: </span>
                                    <span className="text-white">{user.facebook}</span>
                                  </div>
                                )}
                                {user.twitter && (
                                  <div>
                                    <span className="text-gray-400">Twitter: </span>
                                    <span className="text-white">{user.twitter}</span>
                                  </div>
                                )}
                                {user.linkedin && (
                                  <div>
                                    <span className="text-gray-400">LinkedIn: </span>
                                    <span className="text-white">{user.linkedin}</span>
                                  </div>
                                )}
                              </div>
                              
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
                  ))}
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
      </div>
    </div>
  );
}
