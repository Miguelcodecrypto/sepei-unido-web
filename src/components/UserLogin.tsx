import React, { useState } from 'react';
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { verifyPassword } from '../services/passwordService';

interface UserLoginProps {
  onLoginSuccess: (userData: LoggedUserData) => void;
  onCancel: () => void;
  onForgotPassword?: () => void;
}

export interface LoggedUserData {
  dni: string;
  nombre: string;
  apellidos: string;
  email: string;
  verified: boolean;
  lastLogin: string;
}

export const UserLogin: React.FC<UserLoginProps> = ({
  onLoginSuccess,
  onCancel,
  onForgotPassword,
}) => {
  const [formData, setFormData] = useState({
    dni: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error al escribir
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dni || !formData.password) {
      setError('Por favor, completa todos los campos');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Normalizar DNI a mayúsculas
      const normalizedDNI = formData.dni.toUpperCase().trim();

      // Buscar usuario en localStorage
      const userKey = `user_${normalizedDNI}`;
      const userDataStr = localStorage.getItem(userKey);

      if (!userDataStr) {
        setError('Usuario no encontrado. ¿Necesitas registrarte?');
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(userDataStr);

      // Verificar contraseña usando bcrypt
      const isPasswordValid = await verifyPassword(formData.password, userData.password);
      
      if (!isPasswordValid) {
        setError('Contraseña incorrecta');
        setIsLoading(false);
        return;
      }

      // Verificar si la cuenta está verificada
      if (!userData.verified) {
        setError('Tu cuenta aún no está verificada. Revisa tu email.');
        setIsLoading(false);
        return;
      }

      // Login exitoso
      const loggedUser: LoggedUserData = {
        dni: userData.dni,
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        email: userData.email,
        verified: userData.verified,
        lastLogin: new Date().toISOString(),
      };

      // Actualizar último login
      userData.lastLogin = loggedUser.lastLogin;
      localStorage.setItem(userKey, JSON.stringify(userData));

      // Guardar sesión activa
      localStorage.setItem('current_user', JSON.stringify(loggedUser));

      console.log('✅ Login exitoso:', loggedUser);
      onLoginSuccess(loggedUser);

    } catch (error) {
      console.error('Error en login:', error);
      setError('Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Iniciar Sesión
          </h2>
          <p className="text-gray-600">
            Accede con tu DNI y contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* DNI/NIE */}
          <div>
            <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1">
              DNI/NIE (Usuario)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="dni"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                placeholder="12345678Z"
                maxLength={9}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tu contraseña"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Botón de login */}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Iniciar Sesión
              </>
            )}
          </button>

          {/* Enlaces adicionales */}
          <div className="space-y-2 pt-2">
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="w-full text-sm text-blue-600 hover:text-blue-700 transition-colors"
                disabled={isLoading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            
            <button
              type="button"
              onClick={onCancel}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            ¿No tienes cuenta?{' '}
            <button
              onClick={onCancel}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
