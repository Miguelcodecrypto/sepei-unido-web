import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  CreditCard, 
  Shield, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Bell,
  Key,
  LogOut
} from 'lucide-react';
import TelegramLink from './TelegramLink';
import { getCurrentUser } from '../services/sessionService';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id?: string;
    dni: string;
    nombre: string;
    apellidos?: string;
    email: string;
    verified?: boolean;
    lastLogin?: string;
  };
  onLogout: () => void;
  onChangePassword?: () => void;
}

export default function UserProfilePanel({ 
  isOpen, 
  onClose, 
  user, 
  onLogout,
  onChangePassword 
}: UserProfilePanelProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'notifications'>('info');
  const [telegramLinked, setTelegramLinked] = useState(false);

  useEffect(() => {
    const loadUserId = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        setUserId(currentUser.id);
      }
    };
    
    if (isOpen) {
      loadUserId();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.nombre} {user.apellidos || ''}</h2>
              <p className="text-blue-100 text-sm">{user.dni}</p>
              {user.verified && (
                <div className="flex items-center gap-1 mt-1 text-green-300 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  <span>Cuenta verificada</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              Mi Perfil
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bell className="w-4 h-4" />
              Notificaciones
              {telegramLinked && (
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'info' ? (
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Email</p>
                  <p className="text-gray-900">{user.email}</p>
                </div>
              </div>

              {/* DNI */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">DNI/NIE</p>
                  <p className="text-gray-900">{user.dni}</p>
                </div>
              </div>

              {/* Estado verificación */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Estado de la cuenta</p>
                  <div className="flex items-center gap-2">
                    {user.verified ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-700">Verificada</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-700">Pendiente de verificación</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Último acceso */}
              {user.lastLogin && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Último acceso</p>
                    <p className="text-gray-900">{formatDate(user.lastLogin)}</p>
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="pt-4 space-y-2">
                {onChangePassword && (
                  <button
                    onClick={onChangePassword}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    <Key className="w-4 h-4" />
                    Cambiar contraseña
                  </button>
                )}
                
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">Canales de notificación</h3>
                <p className="text-sm text-gray-500">
                  Configura cómo quieres recibir las notificaciones de anuncios y votaciones.
                </p>
              </div>

              {/* Email notifications - siempre activo */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900">Email</h4>
                    <p className="text-sm text-green-700">Activado automáticamente</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>

              {/* Telegram notifications */}
              {userId ? (
                <TelegramLink 
                  userId={userId}
                  onStatusChange={(linked) => setTelegramLinked(linked)}
                />
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl animate-pulse">
                  <div className="h-20"></div>
                </div>
              )}

              {/* Info adicional */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Vincula Telegram para recibir notificaciones 
                  instantáneas en tu móvil cuando haya nuevos anuncios o votaciones.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
