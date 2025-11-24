import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { EmailVerification } from '../components/EmailVerification';
import type { UserData } from '../components/TraditionalRegistration';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleVerificationSuccess = (userData: UserData, tempPassword: string) => {
    // Redirigir a la página principal después de la verificación
    console.log('✅ Verificación exitosa, redirigiendo...');
    setTimeout(() => {
      navigate('/', { 
        state: { 
          verified: true, 
          userData,
          showLoginMessage: true 
        } 
      });
    }, 3000);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Token inválido</h2>
          <p className="text-gray-600 mb-6">
            No se proporcionó un token de verificación válido.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <EmailVerification 
      token={token} 
      onSuccess={handleVerificationSuccess}
    />
  );
};
