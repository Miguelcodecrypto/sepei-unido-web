import React from 'react';
import { Shield, Mail, Calendar, FileText, UserCheck, Lock, Eye, Trash2, X } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 relative">
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-bold text-white">Política de Privacidad</h1>
            </div>
            <p className="text-blue-100">SEPEI UNIDO - Movimiento de Bomberos de Castilla-La Mancha</p>
            <p className="text-blue-200 text-sm mt-2">Última actualización: 24 de noviembre de 2025</p>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-8">
            {/* Introducción */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">1. Introducción</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                En <strong>SEPEI UNIDO</strong>, respetamos tu privacidad y nos comprometemos a proteger tus datos personales. 
                Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos tu información 
                conforme al Reglamento General de Protección de Datos (RGPD - UE 2016/679) y la Ley Orgánica 3/2018 
                de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
              </p>
            </section>

            {/* Responsable */}
            <section className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">2. Responsable del Tratamiento</h2>
              </div>
              <div className="space-y-2 text-gray-700">
                <p><strong>Identidad:</strong> SEPEI UNIDO - Movimiento de Bomberos de Castilla-La Mancha</p>
                <p><strong>Correo electrónico:</strong> sepeiunido@gmail.com</p>
                <p><strong>Sitio web:</strong> www.sepeiunido.org</p>
              </div>
            </section>

            {/* Datos que recopilamos */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">3. Datos que Recopilamos</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">3.1. Datos de Registro</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Nombre y apellidos</li>
                    <li>DNI/NIE (documento identificativo)</li>
                    <li>Dirección de correo electrónico</li>
                    <li>Número de teléfono (opcional)</li>
                    <li>Redes sociales (Instagram, Facebook, Twitter, LinkedIn - opcional)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">3.2. Certificado Digital (si aplica)</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>NIF del certificado FNMT</li>
                    <li>Huella digital del certificado</li>
                    <li>Fecha de validación</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">3.3. Propuestas y Sugerencias</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Categoría profesional (bombero, cabo, sargento, etc.)</li>
                    <li>Lugar de trabajo</li>
                    <li>Contenido de las propuestas enviadas</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Finalidad */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">4. Finalidad del Tratamiento</h2>
              </div>
              <p className="text-gray-700 mb-3">Utilizamos tus datos para:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Gestionar tu cuenta de usuario en SEPEI UNIDO</li>
                <li>Verificar tu identidad mediante email o certificado digital</li>
                <li>Permitirte enviar y gestionar propuestas y sugerencias</li>
                <li>Comunicarte novedades, actualizaciones y actividades del movimiento</li>
                <li>Garantizar la seguridad y correcto funcionamiento de la plataforma</li>
                <li>Cumplir con obligaciones legales y normativas aplicables</li>
              </ul>
            </section>

            {/* Base Legal */}
            <section className="bg-green-50 border-l-4 border-green-600 p-6 rounded-r-lg">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-800">5. Base Legal del Tratamiento</h2>
              </div>
              <p className="text-gray-700 mb-3">El tratamiento de tus datos se basa en:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Consentimiento:</strong> Al registrarte y aceptar esta política, nos das tu consentimiento expreso</li>
                <li><strong>Ejecución de un servicio:</strong> Necesitamos tus datos para prestarte los servicios de la plataforma</li>
                <li><strong>Interés legítimo:</strong> Para mejorar nuestros servicios y proteger la seguridad de la plataforma</li>
              </ul>
            </section>

            {/* Conservación */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">6. Conservación de los Datos</h2>
              </div>
              <p className="text-gray-700 mb-3">
                Tus datos personales serán conservados mientras:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Mantengas tu cuenta activa en SEPEI UNIDO</li>
                <li>Sea necesario para cumplir con las finalidades descritas</li>
                <li>Exista una obligación legal de conservación</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Cuando solicites la eliminación de tu cuenta o transcurran <strong>2 años de inactividad</strong>, 
                tus datos serán eliminados de forma segura, salvo que exista obligación legal de conservarlos.
              </p>
            </section>

            {/* Destinatarios */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">7. Destinatarios y Cesiones</h2>
              </div>
              <p className="text-gray-700 mb-3">
                <strong>No cedemos tus datos a terceros</strong> salvo en los siguientes casos:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Obligación legal:</strong> Cuando sea requerido por autoridades competentes</li>
                <li><strong>Proveedores de servicios:</strong> Utilizamos servicios de alojamiento web (Vercel) y 
                base de datos (Supabase) que actúan como encargados del tratamiento bajo estrictas garantías de seguridad</li>
                <li><strong>Con tu consentimiento:</strong> Si autorizas expresamente cualquier otra cesión</li>
              </ul>
            </section>

            {/* Derechos */}
            <section className="bg-orange-50 border-l-4 border-orange-600 p-6 rounded-r-lg">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-6 h-6 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-800">8. Tus Derechos</h2>
              </div>
              <p className="text-gray-700 mb-3">
                Conforme al RGPD, tienes derecho a:
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-gray-700">
                <div className="flex items-start gap-2">
                  <Eye className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Acceso:</strong> Consultar qué datos tuyos tenemos
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Rectificación:</strong> Corregir datos inexactos
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Trash2 className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Supresión:</strong> Eliminar tus datos ("derecho al olvido")
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Limitación:</strong> Restringir el tratamiento
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Portabilidad:</strong> Recibir tus datos en formato estructurado
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <X className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <strong>Oposición:</strong> Oponerte al tratamiento
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-white rounded-lg border border-orange-200">
                <p className="text-gray-800 font-semibold mb-2">📧 Para ejercer tus derechos:</p>
                <p className="text-gray-700">
                  Envía un correo a <a href="mailto:sepeiunido@gmail.com" className="text-blue-600 hover:underline font-semibold">sepeiunido@gmail.com</a> con 
                  el asunto "Ejercicio de Derechos RGPD" e incluye:
                </p>
                <ul className="list-disc list-inside text-gray-700 mt-2 ml-4 text-sm">
                  <li>Tu nombre completo y DNI</li>
                  <li>El derecho que deseas ejercer</li>
                  <li>Copia de tu DNI/NIE</li>
                </ul>
              </div>
            </section>

            {/* Seguridad */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">9. Medidas de Seguridad</h2>
              </div>
              <p className="text-gray-700 mb-3">
                Implementamos medidas técnicas y organizativas para proteger tus datos:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Cifrado de contraseñas:</strong> Utilizamos bcrypt con salt rounds para cifrar contraseñas</li>
                <li><strong>Conexiones seguras:</strong> Toda la comunicación se realiza mediante HTTPS/SSL</li>
                <li><strong>Verificación por email:</strong> Confirmación de identidad mediante enlace de verificación</li>
                <li><strong>Acceso restringido:</strong> Solo personal autorizado puede acceder a los datos</li>
                <li><strong>Auditorías regulares:</strong> Revisamos periódicamente nuestras medidas de seguridad</li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">10. Cookies</h2>
              </div>
              <p className="text-gray-700">
                Utilizamos cookies técnicas estrictamente necesarias para el funcionamiento de la plataforma 
                (sesión de usuario, preferencias). No utilizamos cookies de publicidad ni seguimiento. 
                Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar la funcionalidad del sitio.
              </p>
            </section>

            {/* Menores */}
            <section className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-lg">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl font-bold text-gray-800">11. Menores de Edad</h2>
              </div>
              <p className="text-gray-700">
                SEPEI UNIDO está dirigido a <strong>mayores de 18 años</strong>. No recopilamos conscientemente 
                datos de menores de edad. Si detectamos que hemos recibido datos de un menor, procederemos 
                a su eliminación inmediata.
              </p>
            </section>

            {/* Modificaciones */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">12. Modificaciones</h2>
              </div>
              <p className="text-gray-700">
                Nos reservamos el derecho a modificar esta Política de Privacidad. Te notificaremos cualquier 
                cambio significativo mediante aviso en la plataforma o por correo electrónico. La fecha de la 
                última actualización aparece al inicio de este documento.
              </p>
            </section>

            {/* Autoridad de Control */}
            <section className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">13. Autoridad de Control</h2>
              </div>
              <p className="text-gray-700 mb-3">
                Si consideras que tus derechos no han sido atendidos correctamente, puedes presentar una reclamación ante:
              </p>
              <div className="bg-white p-4 rounded-lg space-y-1 text-gray-700">
                <p><strong>Agencia Española de Protección de Datos (AEPD)</strong></p>
                <p>C/ Jorge Juan, 6 - 28001 Madrid</p>
                <p>Teléfono: 901 100 099 / 912 663 517</p>
                <p>Web: <a href="https://www.aepd.es" target="_blank" className="text-blue-600 hover:underline">www.aepd.es</a></p>
              </div>
            </section>

            {/* Contacto */}
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-6 h-6" />
                <h2 className="text-2xl font-bold">14. Contacto</h2>
              </div>
              <p className="mb-4">
                Para cualquier consulta sobre esta Política de Privacidad o el tratamiento de tus datos personales:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> sepeiunido@gmail.com</p>
                <p><strong>Web:</strong> www.sepeiunido.org</p>
              </div>
            </section>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                © {new Date().getFullYear()} SEPEI UNIDO. Todos los derechos reservados.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Documento actualizado conforme al RGPD (UE 2016/679) y LOPDGDD (LO 3/2018)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
