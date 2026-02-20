import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Shield, AlertTriangle } from 'lucide-react';
import { login } from '../services/authService';
import { logLoginAttempt, isIPBlocked, getClientIP, countFailedAttempts } from '../services/adminSecurityService';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function LoginPanel({ onLoginSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [clientIP, setClientIP] = useState<string>('');
  const [checkingBlock, setCheckingBlock] = useState(true);

  // Verificar si la IP está bloqueada al cargar
  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const ip = await getClientIP();
        setClientIP(ip);
        
        const blocked = await isIPBlocked(ip);
        setIsBlocked(blocked);
        
        if (!blocked) {
          const attempts = await countFailedAttempts(ip, 24);
          setAttemptsCount(attempts);
        }
      } catch (error) {
        console.error('Error verificando estado de bloqueo:', error);
      } finally {
        setCheckingBlock(false);
      }
    };
    
    checkBlockStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Primero verificar si puede intentar login
      const isSuccess = login(password);
      
      // Registrar el intento
      const result = await logLoginAttempt(password, isSuccess);
      
      if (!result.allowed) {
        setError(result.message || 'Acceso denegado');
        if (result.blocked) {
          setIsBlocked(true);
        }
        setPassword('');
        setIsLoading(false);
        return;
      }
      
      if (isSuccess) {
        setPassword('');
        onLoginSuccess();
      } else {
        setAttemptsCount(result.attempts);
                setError(`Contraseña incorrecta (Intento ${result.attempts} de 3)`);
        setPassword('');
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar pantalla de carga mientras verifica bloqueo
  if (checkingBlock) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de bloqueo si la IP está bloqueada
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-red-900/30 p-10 rounded-3xl border-2 border-red-500/50 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full mb-4">
                <Shield className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-3xl font-black text-red-400 mb-2">Acceso Bloqueado</h1>
              <p className="text-gray-300">Tu IP ha sido bloqueada temporalmente</p>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-300 text-sm">
                <strong>Motivo:</strong> Múltiples intentos fallidos de acceso al panel de administración.
              </p>
              <p className="text-red-300 text-sm mt-2">
                <strong>Duración:</strong> El bloqueo se levantará automáticamente en 24 horas.
              </p>
            </div>

            <div className="text-center text-gray-500 text-sm">
              <p>IP detectada: <code className="bg-slate-800 px-2 py-1 rounded">{clientIP}</code></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/90 p-10 rounded-3xl border-2 border-orange-500/30 shadow-2xl">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Panel Admin</h1>
            <p className="text-gray-400">SEPEI UNIDO - Acceso Restringido</p>
          </div>

          {/* Warning de intentos */}
          {attemptsCount >= 2 && attemptsCount < 3 && (
            <div className="mb-6 p-4 bg-amber-500/10 border-2 border-amber-500/50 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span className="text-amber-400 font-semibold text-sm">
                ⚠️ Queda {3 - attemptsCount} intento antes del bloqueo temporal
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400 font-semibold">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-semibold mb-3">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  className="w-full pl-12 pr-5 py-4 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none transition"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verificando...' : 'Acceder'}
            </button>
          </form>

          {/* Security Info */}
          <div className="mt-8 p-4 bg-blue-500/10 border-2 border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-semibold">Área protegida</span>
            </div>
            <p className="text-blue-300 text-xs">
              Todos los intentos de acceso son registrados con IP, fecha y hora.
              Múltiples intentos fallidos resultarán en bloqueo temporal.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>SEPEI UNIDO © 2024 - Movimiento Asindical</p>
          {clientIP && (
            <p className="mt-1 text-xs text-gray-600">
              Tu IP: {clientIP}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
