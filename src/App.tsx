import React, { useState } from 'react';
import SepeiUnido from './SepeiUnido';
import AdminPanel from './components/AdminPanel';
import { Settings } from 'lucide-react';

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div>
      {/* Botón flotante para acceder al admin */}
      <button
        onClick={() => setShowAdmin(!showAdmin)}
        className="fixed bottom-8 right-8 z-40 p-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow-2xl hover:shadow-orange-500/50 transform hover:scale-110 transition-all flex items-center gap-2"
        title="Panel de administración"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Contenido principal o panel admin */}
      {showAdmin ? <AdminPanel /> : <SepeiUnido />}
    </div>
  );
}
