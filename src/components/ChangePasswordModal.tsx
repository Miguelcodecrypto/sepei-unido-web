import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';
import { hashPassword, verifyPassword } from '../services/passwordService';

interface ChangePasswordModalProps {
  userData: {
    dni: string;
    nombre: string;
    email: string;
  };
  onSuccess: () => void;
  canCancel?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  userData,
  onSuccess,
  canCancel = false,
}) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[A-Z]/.test(password)) {
      return 'La contraseña debe incluir al menos una mayúscula';
    }
    if (!/[a-z]/.test(password)) {
      return 'La contraseña debe incluir al menos una minúscula';
    }
    if (!/[0-9]/.test(password)) {
      return 'La contraseña debe incluir al menos un número';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'La contraseña debe incluir al menos un carácter especial';
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar errores al escribir
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      // Validaciones
      if (!formData.currentPassword) {
        setErrors({ currentPassword: 'Introduce tu contraseña actual' });
        setIsLoading(false);
        return;
      }

      if (!formData.newPassword) {
        setErrors({ newPassword: 'Introduce una nueva contraseña' });
        setIsLoading(false);
        return;
      }

      // Validar fortaleza de la nueva contraseña
      const passwordError = validatePassword(formData.newPassword);
      if (passwordError) {
        setErrors({ newPassword: passwordError });
        setIsLoading(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setErrors({ confirmPassword: 'Las contraseñas no coinciden' });
        setIsLoading(false);
        return;
      }

      if (formData.currentPassword === formData.newPassword) {
        setErrors({ newPassword: 'La nueva contraseña debe ser diferente a la actual' });
        setIsLoading(false);
        return;
      }

      // Obtener datos del usuario desde localStorage
      const userKey = `user_${userData.dni}`;
      const userDataStr = localStorage.getItem(userKey);

      if (!userDataStr) {
        setErrors({ general: 'Error: Usuario no encontrado' });
        setIsLoading(false);
        return;
      }

      const storedUserData = JSON.parse(userDataStr);

      // Verificar contraseña actual
      const isCurrentPasswordValid = await verifyPassword(
        formData.currentPassword,
        storedUserData.password
      );

      if (!isCurrentPasswordValid) {
        setErrors({ currentPassword: 'Contraseña actual incorrecta' });
        setIsLoading(false);
        return;
      }

      // Cifrar nueva contraseña
      const hashedNewPassword = await hashPassword(formData.newPassword);

      // Actualizar contraseña en localStorage
      storedUserData.password = hashedNewPassword;
      storedUserData.requires_password_change = false;
      storedUserData.password_changed_at = new Date().toISOString();
      localStorage.setItem(userKey, JSON.stringify(storedUserData));

      // Actualizar en Supabase
      const { updateUserPassword } = await import('../services/userDatabase');
      await updateUserPassword(userData.dni, hashedNewPassword);

      setSuccessMessage('¡Contraseña actualizada correctamente!');
      
      // Esperar 2 segundos y cerrar
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setErrors({ general: 'Error al cambiar la contraseña. Inténtalo de nuevo.' });
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (successMessage) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Contraseña Actualizada!
            </h3>
            <p className="text-gray-600">
              {successMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full relative">
        {canCancel && (
          <button
            onClick={onSuccess}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Cambiar Contraseña
          </h2>
          <p className="text-gray-600">
            {!canCancel ? (
              <>Por seguridad, debes cambiar tu contraseña temporal</>
            ) : (
              <>Crea una nueva contraseña segura</>
            )}
          </p>
        </div>

        {!canCancel && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Importante:</strong> Esta es tu primera vez iniciando sesión. 
                Debes cambiar la contraseña temporal por una propia y segura.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña actual */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña actual *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPasswords.current ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Tu contraseña temporal"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* Nueva contraseña */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.newPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Mínimo 8 caracteres"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nueva contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Repite la nueva contraseña"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Requisitos de contraseña */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Requisitos de contraseña:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${formData.newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} />
                Mínimo 8 caracteres
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${/[A-Z]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-400'}`} />
                Una letra mayúscula
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${/[a-z]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-400'}`} />
                Una letra minúscula
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${/[0-9]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-400'}`} />
                Un número
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-400'}`} />
                Un carácter especial (!@#$%...)
              </li>
            </ul>
          </div>

          {/* Error general */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Cambiando contraseña...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Cambiar Contraseña
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
