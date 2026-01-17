import React, { useState, useEffect } from 'react';
import { Vote } from 'lucide-react';
import { checkActiveVotings } from '../services/votingDatabase';

interface FloatingVotingButtonProps {
  onClick: () => void;
}

const FloatingVotingButton: React.FC<FloatingVotingButtonProps> = ({ onClick }) => {
  const [hasActiveVotings, setHasActiveVotings] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkVotings = async () => {
      const result = await checkActiveVotings();
      setHasActiveVotings(result.hasActiveVotings);
      setDaysRemaining(result.daysRemaining);
      
      // Mostrar el botón con animación de entrada
      if (result.hasActiveVotings) {
        setTimeout(() => setIsVisible(true), 300);
      } else {
        setIsVisible(false);
      }
    };

    checkVotings();
    
    // Actualizar cada 5 minutos
    const interval = setInterval(checkVotings, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (!hasActiveVotings) return null;

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-36 md:bottom-44 right-4 md:right-8 z-40 transition-all duration-500 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
      }`}
      title="Votaciones activas - Click para participar"
    >
      {/* Contenedor del botón con efectos */}
      <div className="relative group">
        {/* Anillos pulsantes de fondo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-red-500 animate-ping opacity-30"></div>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-red-500 animate-pulse opacity-40"></div>
        
        {/* Resplandor giratorio */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-300/50 to-transparent animate-spin-slow"></div>
        </div>

        {/* Botón principal */}
        <div className="relative p-3 md:p-4 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white rounded-full shadow-2xl hover:shadow-orange-500/60 transform hover:scale-110 transition-all">
          <Vote className="w-5 h-5 md:w-7 md:h-7 animate-bounce-subtle" />
          
          {/* Badge con contador de días */}
          <div className="absolute -top-2 -right-2 min-w-[32px] h-8 px-2 bg-gradient-to-r from-red-600 to-red-700 border-2 border-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-xs font-black text-white">
              {daysRemaining}d
            </span>
          </div>

          {/* Efecto de brillo al pasar el mouse */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        {/* Tooltip flotante */}
        <div className="absolute bottom-full right-0 mb-3 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>Votación activa - {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes</span>
          </div>
          {/* Flecha del tooltip */}
          <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900"></div>
        </div>
      </div>

      {/* CSS personalizado para animaciones */}
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </button>
  );
};

export default FloatingVotingButton;
