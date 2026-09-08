// Ficha ampliada de un usuario: plantilla oficial, FNMT, Telegram y RGPD.
import { CheckCircle, AlertTriangle, UserX, MessageCircle } from 'lucide-react';
import { UserConEstado } from './types';

export function UserDetailsPanel({ user }: { user: UserConEstado }) {
  return (
    <div className="space-y-4">
      {/* Información de Plantilla Oficial */}
      <div className={`border rounded-lg p-4 mb-4 ${
        user.estadoPlantilla === 'en_plantilla' 
          ? 'border-green-500/30 bg-green-500/10'
          : user.estadoPlantilla === 'cambios_detectados'
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-red-500/30 bg-red-500/10'
      }`}>
        <h4 className={`font-bold mb-3 flex items-center gap-2 ${
          user.estadoPlantilla === 'en_plantilla' 
            ? 'text-green-300'
            : user.estadoPlantilla === 'cambios_detectados'
            ? 'text-amber-300'
            : 'text-red-300'
        }`}>
          {user.estadoPlantilla === 'en_plantilla' && <CheckCircle className="w-5 h-5" />}
          {user.estadoPlantilla === 'cambios_detectados' && <AlertTriangle className="w-5 h-5" />}
          {user.estadoPlantilla === 'no_en_plantilla' && <UserX className="w-5 h-5" />}
          Estado en Plantilla Oficial SEPEI
        </h4>
        <div className="space-y-2 text-sm">
          {user.estadoPlantilla === 'en_plantilla' && user.detallesPlantilla && (
            <>
              <div>
                <span className="text-gray-400">Estado: </span>
                <span className="text-green-300 font-semibold">✓ En plantilla oficial</span>
              </div>
              <div>
                <span className="text-gray-400">Destino oficial: </span>
                <span className="text-white">{user.detallesPlantilla.destino}</span>
              </div>
              <div>
                <span className="text-gray-400">Categoría oficial: </span>
                <span className="text-white">{user.detallesPlantilla.categoria}</span>
              </div>
            </>
          )}
          {user.estadoPlantilla === 'cambios_detectados' && user.detallesPlantilla && (
            <>
              <div>
                <span className="text-gray-400">Estado: </span>
                <span className="text-amber-300 font-semibold">⚠️ Cambios detectados</span>
              </div>
              <div>
                <span className="text-gray-400">Destino oficial: </span>
                <span className="text-white">{user.detallesPlantilla.destino}</span>
              </div>
              <div>
                <span className="text-gray-400">Categoría oficial: </span>
                <span className="text-white">{user.detallesPlantilla.categoria}</span>
              </div>
              {user.diferenciasPlantilla && user.diferenciasPlantilla.length > 0 && (
                <div className="mt-2 p-2 bg-amber-500/20 rounded">
                  <span className="text-amber-300 font-semibold">Diferencias:</span>
                  {user.diferenciasPlantilla.map((dif: { campo: string; valor: string; valorOficial: string }, idx: number) => (
                    <div key={idx} className="text-amber-200 ml-2">
                      • {dif.campo}: <span className="line-through text-red-300">{dif.valor}</span> → <span className="text-green-300">{dif.valorOficial}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {user.estadoPlantilla === 'no_en_plantilla' && (
            <div>
              <span className="text-gray-400">Estado: </span>
              <span className="text-red-300 font-semibold">❌ No aparece en la plantilla oficial del SEPEI</span>
            </div>
          )}
        </div>
      </div>

      {/* Información FNMT */}
      {user.certificado_nif && (
        <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-4 mb-4">
          <h4 className="text-green-300 font-bold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Verificación FNMT
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">NIF Verificado: </span>
              <span className="text-green-300 font-semibold">{user.certificado_nif}</span>
            </div>
            <div>
              <span className="text-gray-400">Fecha Verificación: </span>
              <span className="text-white">
                {user.certificado_fecha_validacion ? new Date(user.certificado_fecha_validacion).toLocaleDateString('es-ES') : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Estado: </span>
              <span className={user.certificado_valido ? 'text-green-300 font-semibold' : 'text-red-300 font-semibold'}>
                {user.certificado_valido ? '✓ Válido' : '✗ Inválido'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Información de Telegram */}
      <div className={`border rounded-lg p-4 mb-4 ${
        user.telegram_chat_id 
          ? 'border-[#0088cc]/30 bg-[#0088cc]/10'
          : 'border-gray-500/30 bg-gray-500/10'
      }`}>
        <h4 className={`font-bold mb-3 flex items-center gap-2 ${
          user.telegram_chat_id ? 'text-[#0088cc]' : 'text-gray-400'
        }`}>
          <MessageCircle className="w-5 h-5" />
          Notificaciones Telegram
        </h4>
        <div className="space-y-2 text-sm">
          {user.telegram_chat_id ? (
            <>
              <div>
                <span className="text-gray-400">Estado: </span>
                <span className="text-[#0088cc] font-semibold">✓ Vinculado</span>
              </div>
              {user.telegram_username && (
                <div>
                  <span className="text-gray-400">Usuario: </span>
                  <span className="text-white">@{user.telegram_username}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Vinculado desde: </span>
                <span className="text-white">
                  {user.telegram_linked_at 
                    ? new Date(user.telegram_linked_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A'}
                </span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-gray-400">Estado: </span>
              <span className="text-gray-500 font-semibold">No vinculado</span>
            </div>
          )}
        </div>
      </div>
    
      {/* Información de Consentimiento RGPD */}
      <div className="border-t border-slate-700 pt-4 mt-4">
        <h4 className="text-white font-semibold mb-3 text-sm">Consentimiento RGPD</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-400">Términos Aceptados: </span>
            <span className={user.terminos_aceptados ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
              {user.terminos_aceptados ? '✓ Sí' : '✗ No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Versión Términos: </span>
            <span className="text-white">{user.version_terminos}</span>
          </div>
          <div>
            <span className="text-gray-400">Fecha Aceptación: </span>
            <span className="text-white">
              {new Date(user.fecha_aceptacion_terminos).toLocaleDateString('es-ES')} {new Date(user.fecha_aceptacion_terminos).toLocaleTimeString('es-ES')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
