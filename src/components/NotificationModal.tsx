import { useState, useEffect } from 'react';
import { X, Users, Mail, Check, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ExternalEmail, getActiveExternalEmails } from '../services/externalEmailsDatabase';

interface User {
  id: string;
  nombre: string;
  apellidos?: string;
  email: string;
  verified: boolean;
  email_notifications: boolean;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedUsers: Array<{ id: string; email: string; nombre: string; apellidos?: string }>) => void;
  title: string;
}

export default function NotificationModal({ isOpen, onClose, onConfirm, title }: NotificationModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [externalEmails, setExternalEmails] = useState<ExternalEmail[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedExternalIds, setSelectedExternalIds] = useState<Set<string>>(new Set());
  const [selectAllUsers, setSelectAllUsers] = useState(false);
  const [selectAllExternal, setSelectAllExternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRecipients();
    }
  }, [isOpen]);

  const loadRecipients = async () => {
    try {
      setLoading(true);
      
      // Obtener usuarios verificados con notificaciones activas
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nombre, apellidos, email, verified, email_notifications')
        .eq('verified', true)
        .eq('email_notifications', true)
        .order('nombre');

      if (usersError) throw usersError;

      // Obtener emails externos activos
      const externalsData = await getActiveExternalEmails();

      setUsers(usersData || []);
      setExternalEmails(externalsData);
    } catch (error) {
      console.error('Error cargando destinatarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllUsers = () => {
    if (selectAllUsers) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
    setSelectAllUsers(!selectAllUsers);
  };

  const handleSelectAllExternal = () => {
    if (selectAllExternal) {
      setSelectedExternalIds(new Set());
    } else {
      setSelectedExternalIds(new Set(filteredExternals.map(e => e.id)));
    }
    setSelectAllExternal(!selectAllExternal);
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
    setSelectAllUsers(newSelected.size === filteredUsers.length);
  };

  const toggleExternal = (externalId: string) => {
    const newSelected = new Set(selectedExternalIds);
    if (newSelected.has(externalId)) {
      newSelected.delete(externalId);
    } else {
      newSelected.add(externalId);
    }
    setSelectedExternalIds(newSelected);
    setSelectAllExternal(newSelected.size === filteredExternals.length);
  };

  const handleConfirm = () => {
    const selectedUsers = users
      .filter(u => selectedUserIds.has(u.id))
      .map(u => ({
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        apellidos: u.apellidos
      }));
    
    const selectedExternals = externalEmails
      .filter(e => selectedExternalIds.has(e.id))
      .map(e => ({
        id: e.id,
        email: e.email,
        nombre: e.nombre,
        apellidos: undefined
      }));
    
    onConfirm([...selectedUsers, ...selectedExternals]);
    handleClose();
  };

  const handleClose = () => {
    setSelectedUserIds(new Set());
    setSelectedExternalIds(new Set());
    setSelectAllUsers(false);
    setSelectAllExternal(false);
    setSearchTerm('');
    onClose();
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.nombre.toLowerCase().includes(searchLower) ||
      user.apellidos?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const filteredExternals = externalEmails.filter(external => {
    const searchLower = searchTerm.toLowerCase();
    return (
      external.nombre.toLowerCase().includes(searchLower) ||
      external.email.toLowerCase().includes(searchLower) ||
      external.descripcion?.toLowerCase().includes(searchLower)
    );
  });

  const totalSelected = selectedUserIds.size + selectedExternalIds.size;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-orange-500/30 shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Mail className="w-6 h-6 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">{filteredUsers.length} usuarios</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
              <UserPlus className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">{filteredExternals.length} externos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">{totalSelected} seleccionados</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none transition"
          />
        </div>

        {/* Recipients List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
              <p className="text-gray-400 mt-4">Cargando destinatarios...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* USUARIOS REGISTRADOS */}
              {filteredUsers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Usuarios Registrados</h3>
                    <span className="text-gray-400 text-sm">({filteredUsers.length})</span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Select All Users */}
                    <label className="flex items-center gap-3 p-4 bg-blue-500/10 border-2 border-blue-500/50 rounded-xl cursor-pointer hover:bg-blue-500/20 transition">
                      <input
                        type="checkbox"
                        checked={selectAllUsers}
                        onChange={handleSelectAllUsers}
                        className="w-5 h-5 text-blue-500 focus:ring-blue-500 rounded"
                      />
                      <span className="text-white font-bold">Seleccionar todos los usuarios</span>
                    </label>

                    {/* User List */}
                    {filteredUsers.map(user => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition ${
                          selectedUserIds.has(user.id)
                            ? 'bg-blue-500/20 border-2 border-blue-500'
                            : 'bg-slate-800/30 border-2 border-slate-700 hover:border-blue-500/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="w-5 h-5 text-blue-500 focus:ring-blue-500 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {user.nombre} {user.apellidos || ''}
                          </p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTACTOS EXTERNOS */}
              {filteredExternals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-bold text-white">Contactos Externos</h3>
                    <span className="text-gray-400 text-sm">({filteredExternals.length})</span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Select All External */}
                    <label className="flex items-center gap-3 p-4 bg-purple-500/10 border-2 border-purple-500/50 rounded-xl cursor-pointer hover:bg-purple-500/20 transition">
                      <input
                        type="checkbox"
                        checked={selectAllExternal}
                        onChange={handleSelectAllExternal}
                        className="w-5 h-5 text-purple-500 focus:ring-purple-500 rounded"
                      />
                      <span className="text-white font-bold">Seleccionar todos los externos</span>
                    </label>

                    {/* External List */}
                    {filteredExternals.map(external => (
                      <label
                        key={external.id}
                        className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition ${
                          selectedExternalIds.has(external.id)
                            ? 'bg-purple-500/20 border-2 border-purple-500'
                            : 'bg-slate-800/30 border-2 border-slate-700 hover:border-purple-500/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedExternalIds.has(external.id)}
                          onChange={() => toggleExternal(external.id)}
                          className="w-5 h-5 text-purple-500 focus:ring-purple-500 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{external.nombre}</p>
                          <p className="text-gray-400 text-sm">{external.email}</p>
                          {external.descripcion && (
                            <p className="text-gray-500 text-xs mt-1">{external.descripcion}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {filteredUsers.length === 0 && filteredExternals.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No se encontraron destinatarios</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-900/50">
          <div className="flex gap-4">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={totalSelected === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar a {totalSelected} destinatario{totalSelected !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
