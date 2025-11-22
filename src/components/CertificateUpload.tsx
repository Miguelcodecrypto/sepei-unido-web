// filepath: src/components/CertificateUpload.tsx
import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, X, Loader, Fingerprint } from 'lucide-react';
import { selectClientCertificate, saveCertificateToSession, checkBrowserSupport, type BrowserCertificate } from '../services/browserCertificateService';
import { isCertificateRegistered } from '../services/fnmtService';
import { initializeTestCertificates } from '../data/testCertificates';

interface CertificateUploadProps {
  onCertificateLoaded: (data: BrowserCertificate) => void;
  onClose?: () => void;
}

export default function CertificateUpload({ onCertificateLoaded, onClose }: CertificateUploadProps) {
  const [step, setStep] = useState<'browser-check' | 'selection' | 'verification'>('browser-check');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificateData, setCertificateData] = useState<BrowserCertificate | null>(null);
  const [browserSupport, setBrowserSupport] = useState({ supported: false, message: '' });

  // Verificar compatibilidad del navegador al cargar
  useEffect(() => {
    const support = checkBrowserSupport();
    setBrowserSupport(support);
    
    if (support.supported) {
      setStep('selection');
    }
    
    setIsLoading(false);
  }, []);

  const handleSelectCertificate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Iniciando selección de certificado FNMT...');
      console.log('📋 Navegador detectado:', browserSupport.message);
      
      const result = await selectClientCertificate();

      console.log('✅ Resultado de selección:', result);

      if (!result.success) {
        const errorMsg = result.error || 'Error al seleccionar certificado';
        console.error('❌ Error:', errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      if (!result.certificate) {
        console.error('❌ No certificate data received');
        setError('No se encontraron datos de certificado');
        setIsLoading(false);
        return;
      }

      console.log('📄 Certificado recibido:', {
        nif: result.certificate.nif,
        nombre: result.certificate.nombre,
        valido: result.certificate.valido,
        notAfter: result.certificate.notAfter
      });

      // Validar certificado
      if (!result.certificate.valido) {
        console.warn('⚠️ Certificado expirado o inválido');
        setError('El certificado está expirado o no es válido');
        setIsLoading(false);
        return;
      }

      if (!result.certificate.nif) {
        console.warn('⚠️ No NIF/DNI found in certificate');
        setError('No se encontró NIF/DNI en el certificado');
        setIsLoading(false);
        return;
      }

      // Verificar si ya está registrado
      if (isCertificateRegistered(result.certificate.thumbprint)) {
        console.warn('⚠️ Certificado ya registrado');
        setError('Este certificado ya está registrado en el sistema');
        setIsLoading(false);
        return;
      }

      console.log('✅ Certificado válido y aceptado');
      setCertificateData(result.certificate);
      setStep('verification');
    } catch (err) {
      const errorMsg = `Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`;
      console.error('❌ Error catch:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (certificateData) {
      saveCertificateToSession(certificateData);
      onCertificateLoaded(certificateData);
    }
  };

  const handleReset = () => {
    setStep('selection');
    setCertificateData(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-3xl max-w-2xl w-full border-2 border-orange-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Verificación FNMT</h2>
              <p className="text-orange-100 text-sm">Certificado Digital de Identidad</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step 1: Browser Check */}
          {step === 'browser-check' && (
            <div className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
                <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <p className="text-white font-bold text-lg mb-2">Navegador No Compatible</p>
                <p className="text-gray-300">{browserSupport.message}</p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-6 space-y-4">
                <p className="text-gray-300 mb-4">
                  Tu navegador no soporta la extracción automática de certificados. Por favor, utiliza uno de los siguientes navegadores:
                </p>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    Google Chrome 90+
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    Mozilla Firefox 88+
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    Safari 14+
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    Microsoft Edge 90+
                  </li>
                </ul>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
                >
                  Cerrar
                </button>
              )}
            </div>
          )}

          {/* Step 2: Selection */}
          {step === 'selection' && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Para registrarte en SEPEI UNIDO, necesitamos validar tu identidad mediante tu certificado digital de la FNMT (Fábrica Nacional de Moneda y Timbre).
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Al hacer clic en el botón de abajo, tu navegador te mostrará un diálogo para seleccionar tu certificado digital instalado en el sistema operativo.
                </p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 space-y-2">
                <p className="text-purple-300 text-sm font-bold">📋 Instrucciones:</p>
                <ol className="text-purple-300 text-sm space-y-1 ml-4">
                  <li>1. Haz clic en "Seleccionar Certificado Digital"</li>
                  <li>2. En el diálogo que aparece, selecciona tu certificado FNMT</li>
                  <li>3. Confirma la selección</li>
                  <li>4. El certificado será validado automáticamente</li>
                </ol>
              </div>

              <button
                onClick={handleSelectCertificate}
                disabled={isLoading}
                className="w-full py-6 bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-lg text-white rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-6 h-6" />
                    Seleccionar Certificado Digital
                  </>
                )}
              </button>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  <span className="font-bold">¿No tienes certificado FNMT?</span> Puedes obtenerlo gratis en <a href="https://www.fnmt.es" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">www.fnmt.es</a>
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-300 text-sm">
                  <span className="font-bold">✓ Privacidad y Seguridad:</span> Todos los datos del certificado se procesan solo en tu navegador. Nunca se envían a nuestros servidores.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-red-300 text-sm">
                    <p className="font-bold mb-1">Error:</p>
                    <p className="whitespace-pre-wrap">{error}</p>
                    {error.includes('No hay certificados FNMT') && (
                      <button
                        onClick={() => {
                          initializeTestCertificates();
                          handleSelectCertificate();
                        }}
                        className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded font-semibold transition text-sm"
                      >
                        Cargar Certificados de Prueba (Desarrollo)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Verification */}
          {step === 'verification' && certificateData && (
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-green-300 font-bold text-lg">¡Certificado Validado Exitosamente!</p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">NIF/DNI</p>
                  <p className="text-white font-bold text-lg">{certificateData.nif}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Nombre</p>
                    <p className="text-white">{certificateData.nombre}</p>
                  </div>
                  {certificateData.apellidos && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Apellidos</p>
                      <p className="text-white">{certificateData.apellidos}</p>
                    </div>
                  )}
                </div>

                {certificateData.email && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Email del Certificado</p>
                    <p className="text-white">{certificateData.email}</p>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-4 mt-4">
                  <p className="text-gray-400 text-sm mb-1">Válido hasta</p>
                  <p className="text-white">{new Date(certificateData.notAfter).toLocaleDateString('es-ES')}</p>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-gray-400 text-sm mb-1">Autoridad Emisora</p>
                  <p className="text-white text-sm">{certificateData.issuer}</p>
                </div>

                {certificateData.serialNumber && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-gray-400 text-sm mb-1">Serie del Certificado</p>
                    <p className="text-white text-xs font-mono break-all">{certificateData.serialNumber}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  Al confirmar, aceptas registrarte con tu identidad verificada. Esta información se tratará de conformidad con la legislación de protección de datos vigente.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold transition hover:shadow-lg"
                >
                  Confirmar y Continuar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
