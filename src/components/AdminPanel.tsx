import React, { useState, useEffect } from 'react';
import { Users, Download, Trash2, Eye, EyeOff, LogOut, Clock } from 'lucide-react';
import { getAllUsers, deleteUser, clearDatabase, exportUsersToCSV } from '../services/userDatabase';
import { logout, getSessionTimeRemaining } from '../services/authService';

interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  fechaRegistro: string;
}

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    loadUsers();
    
    // Actualizar tiempo de sesión cada minuto
    const interval = setInterval(() => {
      setSessionTime(getSessionTimeRemaining());
    }, 60000);
    
    // Mostrar tiempo inicial
    setSessionTime(getSessionTimeRemaining());
    
    return () => clearInterval(interval);
  }, []);

  const loadUsers = () => {
    const data = getAllUsers();
    setUsers(data);
    setTotalUsers(data.length);
  };

  const handleDeleteUser = (id: string, nombre: string) => {
    if (confirm(`¿Eliminar a ${nombre}?`)) {
      deleteUser(id);
      loadUsers();
    }
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const handleClearDatabase = () => {
    clearDatabase();
    loadUsers();
  };

  const handleExport = () => {
    exportUsersToCSV();
  };

  const toggleDetails = (id: string) => {
    setShowDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
            <p className="text-gray-400">Gestión de usuarios registrados en SEPEI UNIDO</p>
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

        {/* Stats */}
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-orange-500/20 mb-8">
          <div className="text-center">
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2">
              {totalUsers}
            </div>
            <div className="text-gray-400 font-semibold">Usuarios Registrados</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
          <button
            onClick={handleClearDatabase}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            <Trash2 className="w-5 h-5" />
            Limpiar Base de Datos
          </button>
        </div>

        {/* Users Table */}
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
                          <td colSpan={5} className="px-6 py-4">
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
      </div>
    </div>
  );
}
