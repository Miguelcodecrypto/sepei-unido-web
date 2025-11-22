import React, { useState, useEffect } from 'react';
import SepeiUnido from './SepeiUnido';
import AdminPanel from './components/AdminPanel';
import LoginPanel from './components/LoginPanel';
import { Settings } from 'lucide-react';
import { isAuthenticated } from './services/authService';

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Verificar autenticación al cargar
    setIsAuth(isAuthenticated());
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
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si hace clic en admin pero no está autenticado, mostrar login
  if (showAdmin && !isAuth) {
    return <LoginPanel onLoginSuccess={handleLoginSuccess} />;
  }

  // Si está autenticado y hace clic en admin, mostrar panel
  if (showAdmin && isAuth) {
    return <AdminPanel onLogout={handleLogout} />;
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
