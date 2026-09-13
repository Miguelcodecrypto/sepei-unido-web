import React, { useState } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { VERSION_TERMINOS, FECHA_TERMINOS } from '../../api/_lib/terminos';

interface TermsModalProps {
  onAccept: () => void;
  onReject: () => void;
}

export default function TermsModal({ onAccept, onReject }: TermsModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    setScrolledToBottom(isAtBottom);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 border-orange-500/30 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Términos y Condiciones</h2>
            <p className="text-gray-400 text-sm">Protección de Datos Personales (RGPD)</p>
            <p className="text-gray-500 text-xs mt-1">Versión {VERSION_TERMINOS} · {FECHA_TERMINOS}</p>
          </div>
          <button
            onClick={onReject}
            className="text-gray-400 hover:text-red-400 transition"
            title="Rechazar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div
          ref={setContentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-6 text-gray-300"
        >
          {/* Sección 1: Responsable del tratamiento */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              1. Responsable del Tratamiento de Datos
            </h3>
            <p className="text-sm leading-relaxed">
              <span className="font-semibold text-white">SEPEI UNIDO</span> - Movimiento Asindical
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Es el responsable del tratamiento de los datos personales que proporciones a través de este formulario de registro. Puedes contactar en{' '}
              <a href="mailto:sepeiunido@gmail.com" className="text-orange-400 hover:underline font-semibold">sepeiunido@gmail.com</a>.
            </p>
          </div>

          {/* Sección 2: Datos personales — agrupados por finalidad, que se entiende mejor
              que una lista plana de columnas */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              2. Datos Personales Recabados
            </h3>

            <p className="text-sm leading-relaxed mb-2">
              <span className="font-semibold text-white">Para crear y usar tu cuenta:</span> nombre y apellidos, DNI o NIE, correo electrónico, teléfono y parque de destino. El DNI es tu identificador de acceso, y el parque permite organizar la información por centro de trabajo.
            </p>

            <p className="text-sm leading-relaxed mb-2">
              <span className="font-semibold text-white">Si te registras con certificado digital:</span> el NIF y la huella del certificado FNMT, y la fecha en que se validó. No conservamos el certificado.
            </p>

            <p className="text-sm leading-relaxed mb-2">
              <span className="font-semibold text-white">Por seguridad:</span> la dirección IP desde la que te registras, la fecha de tu último acceso y la del último cambio de contraseña. Tu contraseña se guarda cifrada con bcrypt: nadie, tampoco quien administra la web, puede leerla.
            </p>

            <p className="text-sm leading-relaxed mb-2">
              <span className="font-semibold text-white">Si vinculas Telegram:</span> tu identificador y nombre de usuario de Telegram, para enviarte avisos por ese canal. Puedes desvincularlo cuando quieras.
            </p>

            <p className="text-sm leading-relaxed mb-2">
              <span className="font-semibold text-white">Si participas en votaciones:</span> queda registrado que has votado, para impedir votos duplicados, junto con la autorización para votar que concede la administración.{' '}
              <span className="font-semibold text-orange-300">El sentido de tu voto se guarda separado y sin ningún vínculo con tu identidad</span>: ni quien administra la web puede saber qué has votado.
            </p>

            <p className="text-sm leading-relaxed">
              <span className="font-semibold text-white">Al navegar por la web:</span> registramos las páginas visitadas, la dirección IP, el navegador y la web de procedencia, asociados a tu cuenta si has iniciado sesión, para saber qué contenidos resultan útiles al colectivo.
            </p>
          </div>

          {/* Sección 3: Base legal */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              3. Base Legal para el Tratamiento
            </h3>
            <p className="text-sm leading-relaxed">
              La gestión de tu cuenta y el envío de información se basan en tu <span className="font-semibold">consentimiento explícito</span>, otorgado mediante este formulario, conforme al Artículo 6(1)(a) del Reglamento (UE) 2016/679 (RGPD). La seguridad de la plataforma y la analítica de uso se basan en el <span className="font-semibold">interés legítimo</span> del movimiento, Artículo 6(1)(f).
            </p>
          </div>

          {/* Sección 4: Finalidad */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              4. Finalidad del Tratamiento
            </h3>
            <p className="text-sm leading-relaxed mb-2">
              Los datos se utilizarán exclusivamente para:
            </p>
            <ul className="text-sm leading-relaxed space-y-1 ml-4">
              <li>• Gestionar tu cuenta y verificar que perteneces al colectivo</li>
              <li>• Enviarte convocatorias, comunicados e información del movimiento</li>
              <li>• Permitirte enviar propuestas y participar en las votaciones</li>
              <li>• Mantener la seguridad de la plataforma</li>
              <li>• Cumplir con obligaciones legales</li>
            </ul>
          </div>

          {/* Sección 5: Derechos RGPD */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              5. Tus Derechos RGPD
            </h3>
            <p className="text-sm leading-relaxed mb-2">
              Conforme a la legislación vigente, tienes derecho a:
            </p>
            <ul className="text-sm leading-relaxed space-y-1 ml-4">
              <li>• <span className="font-semibold">Acceso:</span> Obtener información sobre tus datos</li>
              <li>• <span className="font-semibold">Rectificación:</span> Corregir datos inexactos</li>
              <li>• <span className="font-semibold">Supresión:</span> Solicitar la eliminación de tus datos</li>
              <li>• <span className="font-semibold">Limitación:</span> Restringir el tratamiento</li>
              <li>• <span className="font-semibold">Portabilidad:</span> Recibir tus datos en formato estructurado</li>
              <li>• <span className="font-semibold">Oposición:</span> Objetar el tratamiento</li>
              <li>• <span className="font-semibold">Revocación:</span> Retirar tu consentimiento en cualquier momento</li>
            </ul>
          </div>

          {/* Sección 6: Seguridad */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              6. Seguridad de los Datos
            </h3>
            <p className="text-sm leading-relaxed">
              Implementamos medidas técnicas y organizativas apropiadas para proteger tus datos personales contra acceso no autorizado, alteración, divulgación o destrucción. Registramos los intentos de acceso al panel de administración (dirección IP y navegador) para detectar y bloquear ataques.
            </p>
          </div>

          {/* Sección 7: Quién más trata tus datos */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              7. Encargados del Tratamiento
            </h3>
            <p className="text-sm leading-relaxed">
              Para funcionar, la plataforma se apoya en <span className="font-semibold text-white">Vercel</span> (alojamiento), <span className="font-semibold text-white">Supabase</span> (base de datos), <span className="font-semibold text-white">Resend</span> (envío de correo) y <span className="font-semibold text-white">Telegram</span> (avisos, solo si lo vinculas). Algunos de estos proveedores están fuera del Espacio Económico Europeo, y las transferencias se amparan en las cláusulas contractuales tipo aprobadas por la Comisión Europea. No cedemos tus datos a ningún tercero más, ni los vendemos.
            </p>
          </div>

          {/* Sección 8: Retención */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              8. Período de Conservación
            </h3>
            <p className="text-sm leading-relaxed">
              Conservamos tus datos mientras mantengas tu cuenta activa. Se eliminarán cuando lo solicites o tras <span className="font-semibold">3 años de inactividad</span>, salvo que exista una obligación legal de conservarlos.
            </p>
          </div>

          {/* Sección 9: Contacto */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              9. Contacto - Ejercer tus Derechos
            </h3>
            <p className="text-sm leading-relaxed">
              Para ejercer cualquiera de tus derechos o para consultas sobre el tratamiento de datos, escribe a{' '}
              <a href="mailto:sepeiunido@gmail.com" className="text-orange-400 hover:underline font-semibold">sepeiunido@gmail.com</a>. Si consideras que no hemos atendido tu solicitud correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">www.aepd.es</a>).
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Encontrarás la información detallada en nuestra{' '}
              <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-semibold">Política de Privacidad</a>.
            </p>
          </div>

          {/* Descargo */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <p className="text-sm leading-relaxed text-orange-100">
              <span className="font-bold">Declaración de consentimiento:</span> Al aceptar estos términos, confirmas que has leído esta información y que consientes el tratamiento de tus datos personales conforme a lo descrito, de acuerdo con la legislación de protección de datos vigente (RGPD y Ley Orgánica 3/2018).
            </p>
          </div>
        </div>

        {/* Footer - Acciones */}
        <div className="p-6 border-t border-slate-700/50 space-y-4">
          {/* Checkbox de aceptación */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-orange-500 bg-slate-900 cursor-pointer"
            />
            <span className="text-sm text-gray-300">
              Acepto los términos y condiciones y la política de protección de datos
            </span>
          </label>

          {/* Aviso si no scrolleó */}
          {!scrolledToBottom && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs text-blue-300">Por favor, lee todo el contenido antes de aceptar</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-4">
            <button
              onClick={onReject}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
            >
              Rechazar
            </button>
            <button
              onClick={onAccept}
              disabled={!accepted || !scrolledToBottom}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            >
              Aceptar y Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
