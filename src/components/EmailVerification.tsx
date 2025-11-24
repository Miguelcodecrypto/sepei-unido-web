import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, Mail, Key, ArrowRight } from 'lucide-react';
import type { UserData } from './TraditionalRegistration';
import { addUser } from '../services/userDatabase';

interface EmailVerificationProps {
  token?: string;
  onSuccess?: (userData: UserData, tempPassword: string) => void;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ token, onSuccess }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tempPassword, setTempPassword] = useState<string>('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    verifyToken(token);
  }, [token]);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0 && userData && tempPassword && onSuccess) {
      // Llamar al callback cuando se complete la verificación
      onSuccess(userData, tempPassword);
    }
  }, [status, countdown, userData, tempPassword, onSuccess]);

  const verifyToken = async (verificationToken: string) => {
    try {
      console.log('🔍 [VERIFICACIÓN] Iniciando verificación del token:', verificationToken);
      
      // Buscar datos temporales en localStorage
      const tempDataKey = `temp_user_${verificationToken}`;
      console.log('🔍 [VERIFICACIÓN] Buscando clave:', tempDataKey);
      
      // Debug: Mostrar todas las claves en localStorage
      console.log('🔍 [VERIFICACIÓN] Claves en localStorage:', Object.keys(localStorage));
      
      const tempDataStr = localStorage.getItem(tempDataKey);
      console.log('🔍 [VERIFICACIÓN] Datos encontrados:', tempDataStr ? 'SÍ' : 'NO');

      if (!tempDataStr) {
        console.error('❌ [VERIFICACIÓN] No se encontraron datos temporales para el token');
        setStatus('expired');
        return;
      }

      const tempData = JSON.parse(tempDataStr);
      console.log('🔍 [VERIFICACIÓN] Datos temporales parseados:', {
        nombre: tempData.nombre,
        dni: tempData.dni,
        expiresAt: tempData.expiresAt,
        hasHashedPassword: !!tempData.hashedPassword
      });

      // Verificar si el token ha expirado
      const expiresAt = new Date(tempData.expiresAt);
      const now = new Date();
      console.log('🔍 [VERIFICACIÓN] Comparación de fechas:', {
        expira: expiresAt.toISOString(),
        ahora: now.toISOString(),
        expirado: now > expiresAt
      });
      
      if (now > expiresAt) {
        console.error('❌ [VERIFICACIÓN] Token expirado');
        localStorage.removeItem(tempDataKey);
        setStatus('expired');
        return;
      }
      
      console.log('✅ [VERIFICACIÓN] Token válido, procediendo a verificar usuario...');

      console.log('✅ [VERIFICACIÓN] Token válido, procediendo a verificar usuario...');

      // Crear usuario verificado
      const verifiedUser: UserData = {
        nombre: tempData.nombre,
        apellidos: tempData.apellidos,
        dni: tempData.dni,
        email: tempData.email,
        verified: true,
        registeredAt: new Date().toISOString(),
      };

      // Guardar usuario en localStorage
      const userKey = `user_${tempData.dni}`;
      console.log('💾 [VERIFICACIÓN] Guardando usuario con clave:', userKey);
      
      const userDataToSave = {
        ...verifiedUser,
        password: tempData.hashedPassword, // Contraseña cifrada con bcrypt
      };
      
      console.log('💾 [VERIFICACIÓN] Datos a guardar:', {
        ...userDataToSave,
        password: userDataToSave.password ? userDataToSave.password.substring(0, 20) + '...' : 'NO HAY PASSWORD'
      });
      
      localStorage.setItem(userKey, JSON.stringify(userDataToSave));
      console.log('✅ [VERIFICACIÓN] Usuario guardado en localStorage');

      // Guardar en índice de usuarios
      const usersIndex = JSON.parse(localStorage.getItem('users_index') || '[]');
      usersIndex.push(tempData.dni);
      localStorage.setItem('users_index', JSON.stringify(usersIndex));

      // Guardar en la base de datos del panel admin
      addUser({
        nombre: tempData.nombre,
        apellidos: tempData.apellidos,
        dni: tempData.dni,
        email: tempData.email,
        telefono: tempData.telefono || '',
        verified: true,
        terminos_aceptados: true,
      });

      // Limpiar datos temporales
      localStorage.removeItem(tempDataKey);

      setUserData(verifiedUser);
      setTempPassword(tempData.tempPassword);
      setStatus('success');

    } catch (error) {
      console.error('Error al verificar token:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center">
          <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Verificando tu cuenta...
          </h2>
          <p className="text-gray-600">
            Por favor espera un momento
          </p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Enlace Expirado
            </h2>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-gray-700 text-center">
              Este enlace de verificación ha expirado. Los enlaces son válidos durante 24 horas.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="/"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              Volver al inicio y registrarse de nuevo
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Error de Verificación
            </h2>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-gray-700 text-center">
              No se pudo verificar tu cuenta. El enlace puede ser inválido o ya haber sido utilizado.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="/"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Status: success
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            ¡Cuenta Verificada!
          </h2>
          <p className="text-gray-600">
            Tu cuenta ha sido activada correctamente
          </p>
        </div>

        {userData && (
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Mail className="w-5 h-5 text-gray-600 mr-2" />
                <span className="font-semibold text-gray-800">Datos de acceso</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Usuario (DNI):</span>
                  <span className="font-mono font-bold text-gray-800">{userData.dni}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contraseña:</span>
                  <span className="font-mono font-bold text-blue-600">{tempPassword}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Key className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-700 font-semibold mb-1">
                    Guarda tu contraseña
                  </p>
                  <p className="text-gray-600">
                    Te recomendamos cambiarla después de tu primer inicio de sesión por seguridad.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 text-center">
                <strong>Bienvenido, {userData.nombre} {userData.apellidos}</strong><br />
                Ya eres parte de SEPEI UNIDO
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Ir a la página principal
            <ArrowRight className="w-5 h-5" />
          </a>
          
          {countdown > 0 && (
            <p className="text-sm text-gray-500 text-center">
              Redirigiendo automáticamente en {countdown}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
