import React, { useState, useEffect } from 'react';
import { Send, X } from 'lucide-react';

interface TelegramBannerProps {
  onOpenProfile?: () => void;
  isLoggedIn?: boolean;
}

export default function TelegramBanner({ onOpenProfile, isLoggedIn = false }: TelegramBannerProps) {
  const [phase, setPhase] = useState<'moving' | 'message' | 'hidden'>('moving');
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState(-100);

  useEffect(() => {
    // Fase 1: Mover el logo de izquierda a derecha
    const moveInterval = setInterval(() => {
      setPosition(prev => {
        if (prev >= 50) {
          clearInterval(moveInterval);
          // Cambiar a fase de mensaje después de llegar al centro
          setTimeout(() => setPhase('message'), 300);
          return 50;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(moveInterval);
  }, []);

  const handleDismiss = () => {
    setPhase('hidden');
    setDismissed(true);
  };

  const handleActivate = () => {
    handleDismiss();
    if (onOpenProfile) {
      onOpenProfile();
    }
  };

  if (dismissed || phase === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay oscuro */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 pointer-events-auto ${
          phase === 'message' ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />
      
      {/* Logo de Telegram animado */}
      <div 
        className={`absolute top-1/2 -translate-y-1/2 transition-all duration-300 ${
          phase === 'message' ? 'scale-150' : 'scale-100'
        }`}
        style={{ 
          left: `${position}%`,
          transform: `translateX(-50%) translateY(-50%) ${phase === 'message' ? 'scale(1.5)' : 'scale(1)'}`,
        }}
      >
        {/* Efecto de brillo detrás del logo */}
        <div className="absolute inset-0 bg-[#0088cc] blur-3xl opacity-50 rounded-full scale-150" />
        
        {/* Logo de Telegram */}
        <div className={`relative bg-gradient-to-br from-[#0088cc] to-[#0077b5] p-4 rounded-2xl shadow-2xl shadow-[#0088cc]/50 ${
          phase === 'moving' ? 'animate-bounce' : ''
        }`}>
          <svg 
            viewBox="0 0 24 24" 
            className="w-16 h-16 text-white"
            fill="currentColor"
          >
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>
      </div>

      {/* Mensaje que aparece después */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 transition-all duration-500 pointer-events-auto ${
          phase === 'message' 
            ? 'opacity-100 translate-y-8' 
            : 'opacity-0 translate-y-20'
        }`}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-[#0088cc]/30 max-w-md mx-4">
          {/* Botón cerrar */}
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-4">
            {/* Icono pequeño de Telegram */}
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-[#0088cc] to-[#0077b5] p-3 rounded-xl">
                <Send className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Texto principal */}
            <h3 className="text-2xl font-bold text-white">
              ¡Recibe tus notificaciones por Telegram!
            </h3>
            
            <p className="text-gray-300">
              Mantente informado de todas las novedades del SEPEI directamente en tu móvil.
            </p>

            {/* Beneficios */}
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="px-3 py-1 bg-[#0088cc]/20 text-[#0088cc] rounded-full">
                📢 Noticias al instante
              </span>
              <span className="px-3 py-1 bg-[#0088cc]/20 text-[#0088cc] rounded-full">
                🗳️ Avisos de votaciones
              </span>
              <span className="px-3 py-1 bg-[#0088cc]/20 text-[#0088cc] rounded-full">
                📋 Convocatorias
              </span>
            </div>

            {/* Botón de acción */}
            {isLoggedIn ? (
              <button
                onClick={handleActivate}
                className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#0088cc]/30 transition-all duration-300 transform hover:scale-105"
              >
                Actívalo en tu perfil
              </button>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-amber-400 text-sm font-medium">
                  ⚠️ Inicia sesión para activar las notificaciones
                </p>
                <button
                  onClick={handleDismiss}
                  className="w-full px-6 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-all duration-300"
                >
                  Entendido
                </button>
              </div>
            )}

            {/* Link para cerrar */}
            <button 
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Recordar más tarde
            </button>
          </div>
        </div>
      </div>

      {/* Partículas decorativas durante el movimiento */}
      {phase === 'moving' && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-[#0088cc] rounded-full opacity-50 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
