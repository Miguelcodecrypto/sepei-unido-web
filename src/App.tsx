import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import SepeiUnido from './SepeiUnido';
import { Settings } from 'lucide-react';
import { isAuthenticated } from './services/authService';

// Lazy load componentes pesados para code-splitting
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const LoginPanel = lazy(() => import('./components/LoginPanel'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const ConvocatoriasPage = lazy(() => import('./pages/ConvocatoriasPage'));

// Componente de carga
const LoadingSpinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-400">Cargando...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/politica-privacidad" element={<PrivacyPolicy />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/convocatorias" element={<ConvocatoriasPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function MainApp() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Solo verificar si hay sesión válida (pero mantener isAuth false hasta que se haga login)
    // Esto evita que el panel se abra automáticamente
    setAuthChecked(true);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuth(true);
    setShowAdmin(true);
  };

  const handleLogout = () => {
    setIsAuth(false);
    setShowAdmin(false);
  };

  // Mostrar spinner mientras se verifica auth
  if (!authChecked) {
    return <LoadingSpinner />;
  }

  // Si hace clic en admin pero no está autenticado, mostrar login
  if (showAdmin && !isAuth) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LoginPanel onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  // Si está autenticado y hace clic en admin, mostrar panel
  if (showAdmin && isAuth) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AdminPanel onLogout={handleLogout} />
      </Suspense>
    );
  }

  return (
    <div>
      {/* Botón flotante para acceder al admin */}
      <button
        onClick={() => setShowAdmin(true)}
        className="fixed bottom-8 right-8 z-40 p-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow-2xl hover:shadow-orange-500/50 transform hover:scale-110 transition-all flex items-center gap-2"
        title="Panel de administración"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Página principal */}
      <SepeiUnido />
    </div>
  );
}
