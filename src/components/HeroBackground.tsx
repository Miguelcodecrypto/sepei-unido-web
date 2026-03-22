import React, { useState, useEffect } from 'react';

// Imágenes de bomberos - versiones desktop y mobile optimizadas
const imageEntries = [
  { desktop: '/images/hero/taquillas-bomberos.jpg', mobile: '/images/hero/mobile/taquillas-bomberos.jpg' },
  { desktop: '/images/hero/bomberos-equipo.jpg', mobile: '/images/hero/mobile/bomberos-equipo.jpg' },
  { desktop: '/images/hero/bomberos-incendio.jpg', mobile: '/images/hero/mobile/bomberos-incendio.jpg' },
  { desktop: '/images/hero/camiones-aereo.jpg', mobile: '/images/hero/mobile/camiones-aereo.jpg' },
  { desktop: '/images/hero/camiones-luces.jpg', mobile: '/images/hero/mobile/camiones-luces.jpg' },
];

// Posiciones personalizadas por imagen para móvil (mostrar la parte más interesante)
const mobilePositions = [
  'center 40%',   // taquillas - un poco más arriba
  'center center', // equipo - centrado
  'center 30%',   // incendio - mostrar más la parte superior
  'center center', // camiones aereo - centrado
  'center 60%',   // camiones luces - mostrar más la parte baja
];

interface HeroBackgroundProps {
  transitionDuration?: number;
  intervalDuration?: number;
  overlay?: boolean;
  overlayOpacity?: number;
  mobileOverlayOpacity?: number;
}

export default function HeroBackground({
  transitionDuration = 1500,
  intervalDuration = 6000,
  overlay = true,
  overlayOpacity = 0.7,
  mobileOverlayOpacity = 0.4,
}: HeroBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Precargar imágenes para transiciones suaves
  useEffect(() => {
    const imagesToPreload = isMobile
      ? imageEntries.map(e => e.mobile)
      : imageEntries.map(e => e.desktop);
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [isMobile]);

  // Cambiar imagen automáticamente
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imageEntries.length);
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [intervalDuration]);

  const effectiveOverlayOpacity = isMobile ? mobileOverlayOpacity : overlayOpacity;

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      {/* Contenedor de imágenes - usa versión mobile u original según dispositivo */}
      {imageEntries.map((entry, index) => (
        <div
          key={entry.desktop}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${isMobile ? entry.mobile : entry.desktop})`,
            backgroundSize: 'cover',
            backgroundPosition: isMobile ? mobilePositions[index] : 'center',
            backgroundRepeat: 'no-repeat',
            opacity: index === currentIndex ? 1 : 0,
            transition: `opacity ${transitionDuration}ms ease-in-out`,
          }}
        />
      ))}

      {/* Overlay oscuro - más suave en móvil */}
      {overlay && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: `rgba(2, 6, 23, ${effectiveOverlayOpacity})`,
          }}
        />
      )}

      {/* Gradientes para mejor legibilidad - más pequeños y suaves en móvil */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: isMobile ? '70px' : '120px',
          background: isMobile
            ? 'linear-gradient(to bottom, rgba(2,6,23,0.9) 0%, rgba(2,6,23,0.4) 50%, transparent 100%)'
            : 'linear-gradient(to bottom, rgba(2,6,23,1) 0%, rgba(2,6,23,0.8) 50%, transparent 100%)',
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: isMobile ? '80px' : '150px',
          background: isMobile
            ? 'linear-gradient(to top, rgba(2,6,23,0.9) 0%, rgba(2,6,23,0.4) 50%, transparent 100%)'
            : 'linear-gradient(to top, rgba(2,6,23,1) 0%, rgba(2,6,23,0.8) 50%, transparent 100%)',
        }}
      />

      {/* Indicadores */}
      <div 
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}
      >
        {imageEntries.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            style={{
              width: index === currentIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: index === currentIndex ? '#f97316' : 'rgba(255,255,255,0.3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            aria-label={`Imagen ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
