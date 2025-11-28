import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, Mail, Key, ArrowRight } from 'lucide-react';
import type { UserData } from './TraditionalRegistration';
import { getUserByVerificationToken, verifyUserEmail } from '../services/userDatabase';

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
      
      // Buscar usuario por token de verificación en Supabase
      const user = await getUserByVerificationToken(verificationToken);
      
      if (!user) {
        console.error('❌ [VERIFICACIÓN] No se encontró usuario con este token');
        setStatus('expired');
        return;
      }

      console.log('✅ [VERIFICACIÓN] Usuario encontrado:', {
        nombre: user.nombre,
        dni: user.dni,
        verified: user.verified,
        hasToken: !!user.verification_token,
        expiresAt: user.verification_token_expires_at
      });

      // Verificar si ya está verificado
      if (user.verified) {
        console.log('⚠️ [VERIFICACIÓN] Usuario ya verificado previamente');
        setStatus('error');
        return;
      }

      // Verificar si el token ha expirado
      if (user.verification_token_expires_at) {
        const expiresAt = new Date(user.verification_token_expires_at);
        const now = new Date();
        
        console.log('🔍 [VERIFICACIÓN] Comparación de fechas:', {
          expira: expiresAt.toISOString(),
          ahora: now.toISOString(),
          expirado: now > expiresAt
        });
        
        if (now > expiresAt) {
          console.error('❌ [VERIFICACIÓN] Token expirado');
          setStatus('expired');
          return;
        }
      }
      
      console.log('✅ [VERIFICACIÓN] Token válido, procediendo a verificar usuario...');

      // Verificar usuario en Supabase
      const verified = await verifyUserEmail(user.id);
      
      if (!verified) {
        console.error('❌ [VERIFICACIÓN] Error al actualizar usuario');
        setStatus('error');
        return;
      }

      console.log('✅ Usuario verificado correctamente en Supabase');

      // Preparar datos para mostrar (sin exponer la contraseña hasheada)
      const verifiedUser: UserData = {
        nombre: user.nombre,
        apellidos: user.apellidos || '',
        dni: user.dni || '',
        email: user.email,
        verified: true,
        registeredAt: user.fecha_registro,
      };

      setUserData(verifiedUser);
      // La contraseña temporal ya fue enviada por email, no la mostramos aquí
      setTempPassword('(Ver email)');
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
              Este enlace de verificación ha expirado o ya fue utilizado. Los enlaces son válidos durante 7 días.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="/"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              Volver al inicio
            </a>
            <p className="text-sm text-gray-600 text-center">
              Si necesitas ayuda, contacta con el administrador
            </p>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-700 font-semibold mb-1">
                    ¡Tu cuenta está activa!
                  </p>
                  <p className="text-gray-600">
                    Puedes iniciar sesión con tu DNI: <strong>{userData.dni}</strong>
                  </p>
                  <p className="text-gray-600 mt-1">
                    Tu contraseña temporal fue enviada a tu correo electrónico.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <Key className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-700 font-semibold mb-1">
                    Recuerda cambiar tu contraseña
                  </p>
                  <p className="text-gray-600">
                    Te recomendamos cambiar tu contraseña temporal después de tu primer inicio de sesión por seguridad.
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
