import { useState, useEffect } from 'react';
import { X, Users, Mail, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Obtener solo usuarios verificados con notificaciones activas
      const { data, error } = await supabase
        .from('users')
        .select('id, nombre, apellidos, email, verified, email_notifications')
        .eq('verified', true)
        .eq('email_notifications', true)
        .order('nombre');

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
    setSelectAll(!selectAll);
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === filteredUsers.length);
  };

  const handleConfirm = () => {
    const selectedUsers = users
      .filter(u => selectedIds.has(u.id))
      .map(u => ({
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        apellidos: u.apellidos
      }));
    
    onConfirm(selectedUsers);
    handleClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSelectAll(false);
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
              <span className="text-white font-medium">{filteredUsers.length} usuarios disponibles</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">{selectedIds.size} seleccionados</span>
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

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
              <p className="text-gray-400 mt-4">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All */}
              <label className="flex items-center gap-3 p-4 bg-slate-800/50 border-2 border-orange-500/50 rounded-xl cursor-pointer hover:bg-slate-800/70 transition">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
                />
                <span className="text-white font-bold">Seleccionar todos ({filteredUsers.length})</span>
              </label>

              {/* User List */}
              {filteredUsers.map(user => (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition ${
                    selectedIds.has(user.id)
                      ? 'bg-orange-500/20 border-2 border-orange-500'
                      : 'bg-slate-800/30 border-2 border-slate-700 hover:border-orange-500/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
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
              disabled={selectedIds.size === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar a {selectedIds.size} usuario{selectedIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
