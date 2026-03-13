import React, { useState, useEffect, useCallback } from 'react';

// Imágenes HD relacionadas con bomberos, rescates, vehículos de emergencias
// Enfoque en: heroísmo, altruismo, trabajo en equipo, salvamento, equipos de rescate
const backgroundImages = [
  {
    // Camión de bomberos rojo clásico - símbolo icónico
    url: 'https://images.unsplash.com/photo-1562077772-3bd90f35c614?q=80&w=2070&auto=format&fit=crop',
    alt: 'Camión de bomberos rojo',
    position: 'center',
    kenBurns: 'scale-100 translate-x-0'
  },
  {
    // Bombero en acción apagando fuego - heroísmo
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=2070&auto=format&fit=crop',
    alt: 'Bombero combatiendo incendio',
    position: 'center',
    kenBurns: 'scale-110 -translate-x-2'
  },
  {
    // Equipo de rescate trabajando juntos - trabajo en equipo
    url: 'https://images.unsplash.com/photo-1582897085656-c636d006a246?q=80&w=2071&auto=format&fit=crop',
    alt: 'Equipo de rescate en acción',
    position: 'center bottom',
    kenBurns: 'scale-105 translate-y-2'
  },
  {
    // Escalera de bomberos extendida - preparación para el rescate
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop',
    alt: 'Escalera de bomberos',
    position: 'center',
    kenBurns: 'scale-100 translate-x-0'
  },
  {
    // Luces de emergencia - urgencia y respuesta rápida
    url: 'https://images.unsplash.com/photo-1609692029062-d7e1ed7f34c5?q=80&w=2070&auto=format&fit=crop',
    alt: 'Luces de emergencia',
    position: 'center',
    kenBurns: 'scale-110 translate-x-2'
  },
  {
    // Casco de bombero - símbolo de protección
    url: 'https://images.unsplash.com/photo-1560252829-804f1aedf1be?q=80&w=2070&auto=format&fit=crop',
    alt: 'Casco de bombero profesional',
    position: 'center',
    kenBurns: 'scale-105 -translate-y-2'
  },
  {
    // Silueta de bomberos contra el fuego - valentía
    url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop',
    alt: 'Silueta heroica de bomberos',
    position: 'center bottom',
    kenBurns: 'scale-100 translate-x-0'
  },
  {
    // Manguera de bomberos en acción - combate contra el fuego
    url: 'https://images.unsplash.com/photo-1599059813005-11265ba4b4ce?q=80&w=2070&auto=format&fit=crop',
    alt: 'Manguera de alta presión',
    position: 'center',
    kenBurns: 'scale-110 -translate-x-1'
  },
  {
    // Ambulancia/vehículo de emergencias - salvamento de vidas
    url: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?q=80&w=2070&auto=format&fit=crop',
    alt: 'Vehículo de emergencias médicas',
    position: 'center',
    kenBurns: 'scale-105 translate-x-1'
  },
  {
    // Equipo de bombero (botas, chaqueta) - preparación
    url: 'https://images.unsplash.com/photo-1602014486498-08c37ada440e?q=80&w=2070&auto=format&fit=crop',
    alt: 'Equipo de protección de bombero',
    position: 'center',
    kenBurns: 'scale-100 -translate-y-1'
  },
  {
    // Helicóptero de rescate - operaciones aéreas
    url: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?q=80&w=2070&auto=format&fit=crop',
    alt: 'Helicóptero de rescate',
    position: 'center',
    kenBurns: 'scale-110 translate-y-2'
  },
  {
    // Incendio forestal - protección del medio ambiente
    url: 'https://images.unsplash.com/photo-1569074187119-c87815b476da?q=80&w=2025&auto=format&fit=crop',
    alt: 'Combate de incendio forestal',
    position: 'center',
    kenBurns: 'scale-105 -translate-x-2'
  }
];

interface HeroBackgroundProps {
  transitionDuration?: number; // Duración de transición en ms
  intervalDuration?: number;   // Intervalo entre cambios en ms
  overlay?: boolean;           // Mostrar overlay oscuro
  overlayOpacity?: number;     // Opacidad del overlay (0-1)
  children?: React.ReactNode;
}

export default function HeroBackground({
  transitionDuration = 1500,
  intervalDuration = 6000,
  overlay = true,
  overlayOpacity = 0.7,
  children
}: HeroBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>(new Array(backgroundImages.length).fill(false));

  // Precargar todas las imágenes
  useEffect(() => {
    backgroundImages.forEach((image, index) => {
      const img = new Image();
      img.src = image.url;
      img.onload = () => {
        setImagesLoaded(prev => {
          const newLoaded = [...prev];
          newLoaded[index] = true;
          return newLoaded;
        });
      };
    });
  }, []);

  // Función para cambiar imagen
  const changeImage = useCallback(() => {
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setNextIndex((nextIndex + 1) % backgroundImages.length);
      setIsTransitioning(false);
    }, transitionDuration);
  }, [nextIndex, transitionDuration]);

  // Intervalo automático para cambiar imágenes
  useEffect(() => {
    const interval = setInterval(() => {
      changeImage();
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [changeImage, intervalDuration]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Imagen actual con efecto Ken Burns */}
      <div
        className="absolute inset-0 transition-all ease-out"
        style={{
          backgroundImage: `url(${backgroundImages[currentIndex].url})`,
          backgroundSize: 'cover',
          backgroundPosition: backgroundImages[currentIndex].position,
          backgroundRepeat: 'no-repeat',
          opacity: isTransitioning ? 0 : 1,
          transitionDuration: `${transitionDuration}ms`,
          transform: !isTransitioning ? 'scale(1.05)' : 'scale(1)',
          animation: !isTransitioning ? 'ken-burns-slow 12s ease-in-out infinite alternate' : 'none'
        }}
      />
      
      {/* Imagen siguiente (para transición suave) */}
      <div
        className="absolute inset-0 transition-all ease-out"
        style={{
          backgroundImage: `url(${backgroundImages[nextIndex].url})`,
          backgroundSize: 'cover',
          backgroundPosition: backgroundImages[nextIndex].position,
          backgroundRepeat: 'no-repeat',
          opacity: isTransitioning ? 1 : 0,
          transitionDuration: `${transitionDuration}ms`,
          transform: isTransitioning ? 'scale(1.05)' : 'scale(1.1)'
        }}
      />

      {/* Overlay con gradiente */}
      {overlay && (
        <>
          {/* Overlay principal oscuro */}
          <div 
            className="absolute inset-0 bg-slate-950"
            style={{ opacity: overlayOpacity }}
          />
          
          {/* Gradiente superior para mejor legibilidad del navbar */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent" />
          
          {/* Gradiente inferior para transición suave al contenido */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
          
          {/* Gradiente lateral izquierdo para el texto */}
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-slate-950/90 to-transparent" />
          
          {/* Efecto de viñeta */}
          <div className="absolute inset-0 bg-radial-gradient pointer-events-none" 
            style={{
              background: 'radial-gradient(ellipse at center, transparent 0%, rgba(2, 6, 23, 0.4) 70%, rgba(2, 6, 23, 0.8) 100%)'
            }}
          />
        </>
      )}

      {/* Efecto de partículas/chispas animadas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-500 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              opacity: 0.4 + Math.random() * 0.4
            }}
          />
        ))}
      </div>

      {/* Indicadores de imagen (opcional, se pueden ocultar) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        {backgroundImages.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentIndex && !isTransitioning) {
                setNextIndex(index);
                changeImage();
              }
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-orange-500 w-6' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Ir a imagen ${index + 1}`}
          />
        ))}
      </div>

      {/* Contenido hijo */}
      {children && (
        <div className="relative z-10 h-full">
          {children}
        </div>
      )}
    </div>
  );
}
