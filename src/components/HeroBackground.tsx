import React, { useState, useEffect, useCallback } from 'react';

// Imágenes HD de bomberos - locales en public/images/hero/
// Temática: heroísmo, altruismo, trabajo en equipo, vehículos de emergencia
const backgroundImages = [
  {
    // Taquillas rojas de bomberos - símbolo del parque
    url: '/images/hero/taquillas-bomberos.jpg',
    alt: 'Taquillas rojas de bomberos',
    position: 'center',
    kenBurns: 'scale-100 translate-x-0'
  },
  {
    // Bomberos de espaldas trabajando en equipo - compañerismo
    url: '/images/hero/bomberos-equipo.jpg',
    alt: 'Bomberos trabajando en equipo',
    position: 'center',
    kenBurns: 'scale-110 -translate-x-2'
  },
  {
    // Bomberos combatiendo fuego - heroísmo y valentía
    url: '/images/hero/bomberos-incendio.jpg',
    alt: 'Bomberos combatiendo incendio',
    position: 'center',
    kenBurns: 'scale-105 translate-y-2'
  },
  {
    // Vista aérea camiones de noche - respuesta de emergencia
    url: '/images/hero/camiones-aereo.jpg',
    alt: 'Vista aérea de camiones de bomberos',
    position: 'center',
    kenBurns: 'scale-100 translate-x-0'
  },
  {
    // Camiones alineados con luces rojas - unidad del servicio
    url: '/images/hero/camiones-luces.jpg',
    alt: 'Camiones de bomberos con luces de emergencia',
    position: 'center',
    kenBurns: 'scale-110 translate-x-2'
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
