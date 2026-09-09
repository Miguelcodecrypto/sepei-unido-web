import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Phone, User as UserIcon, AlertCircle } from 'lucide-react';
import { completeProfile, PARQUES_SEPEI, type SessionUser } from '../services/sessionService';

interface CompleteProfileModalProps {
  nombre: string;
  /** Nombres de los campos que faltan, tal como los devuelve el servidor. */
  camposPendientes: string[];
  onSuccess: (user: SessionUser) => void;
}

/**
 * Bloqueo al entrar para quien tiene la ficha a medias. Mismo patrón que
 * ChangePasswordModal: no hay forma de cerrarlo sin rellenar lo que falta.
 *
 * Existe porque el alta por certificado FNMT solo recoge nombre, email y NIF, así que
 * arrastramos usuarios sin apellidos, sin teléfono y sin parque — y sin parque no se
 * les puede cruzar con la plantilla oficial del SEPEI.
 */
export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  nombre,
  camposPendientes,
  onSuccess,
}) => {
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [parque, setParque] = useState(PARQUES_SEPEI[0]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const primerCampo = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    primerCampo.current?.focus();
  }, []);

  const pide = (campo: string) => camposPendientes.includes(campo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pide('apellidos') && apellidos.trim().length < 2) {
      setError('Escribe tus apellidos.');
      return;
    }
    if (pide('telefono') && !/^[6789]\d{8}$/.test(telefono.replace(/[\s-]/g, ''))) {
      setError('El teléfono debe tener 9 dígitos.');
      return;
    }

    setGuardando(true);
    const resultado = await completeProfile({
      ...(pide('apellidos') ? { apellidos: apellidos.trim() } : {}),
      ...(pide('telefono') ? { telefono: telefono.replace(/[\s-]/g, '') } : {}),
      ...(pide('parque_sepei') ? { parque_sepei: parque } : {}),
    });
    setGuardando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    onSuccess(resultado.user);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completar-perfil-titulo"
    >
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-orange-600" />
          </div>
          <h2 id="completar-perfil-titulo" className="text-2xl font-bold text-gray-800 mb-2">
            Completa tu ficha
          </h2>
          <p className="text-gray-600">
            {nombre}, nos faltan {camposPendientes.length === 1 ? 'un dato tuyo' : 'algunos datos tuyos'} para
            tenerte bien registrado en el movimiento.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {pide('apellidos') && (
            <div>
              <label htmlFor="perfil-apellidos" className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="perfil-apellidos"
                  ref={primerCampo as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  autoComplete="family-name"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Tus dos apellidos"
                />
              </div>
            </div>
          )}

          {pide('telefono') && (
            <div>
              <label htmlFor="perfil-telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono de contacto *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="perfil-telefono"
                  ref={!pide('apellidos') ? (primerCampo as React.RefObject<HTMLInputElement>) : undefined}
                  type="tel"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  autoComplete="tel"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="600000000"
                />
              </div>
            </div>
          )}

          {pide('parque_sepei') && (
            <div>
              <label htmlFor="perfil-parque" className="block text-sm font-medium text-gray-700 mb-1">
                Parque del SEPEI donde trabajas *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  id="perfil-parque"
                  ref={!pide('apellidos') && !pide('telefono') ? (primerCampo as React.RefObject<HTMLSelectElement>) : undefined}
                  value={parque}
                  onChange={(e) => setParque(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {PARQUES_SEPEI.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {guardando ? 'Guardando…' : 'Guardar y continuar'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Solo lo ve la organización del movimiento, para contactar contigo y comprobar tu parque.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
