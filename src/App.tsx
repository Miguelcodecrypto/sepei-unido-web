import React, { useState, useEffect, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SepeiUnido from './SepeiUnido';
import { isAuthenticated } from './services/authService';

// Lazy load componentes pesados para code-splitting
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const LoginPanel = lazy(() => import('./components/LoginPanel'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const ConvocatoriasPage = lazy(() => import('./pages/ConvocatoriasPage'));

// Error Boundary para capturar errores de renderizado
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-lg">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error de la aplicación</h2>
            <p className="text-gray-300 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<SepeiUnido />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/politica-privacidad" element={<PrivacyPolicy />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/convocatorias" element={<ConvocatoriasPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function AdminRoute() {
  const [isAuth, setIsAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setAuthChecked(true);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    setIsAuth(false);
  };

  if (!authChecked) {
    return <LoadingSpinner />;
  }

  if (!isAuth) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LoginPanel onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminPanel onLogout={handleLogout} />
    </Suspense>
  );
}
