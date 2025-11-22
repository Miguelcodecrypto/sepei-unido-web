// filepath: src/components/CertificateUpload.tsx
import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, X, Loader, Fingerprint, Upload, FileCheck } from 'lucide-react';
import { selectClientCertificate, saveCertificateToSession, checkBrowserSupport, type BrowserCertificate } from '../services/browserCertificateService';
import { parseCertificateFile, isValidCertificateFile, getCertificateFileTypeMessage } from '../services/certificateFileParser';
import { isCertificateRegistered } from '../services/fnmtService';
import { initializeTestCertificates } from '../data/testCertificates';

interface CertificateUploadProps {
  onCertificateLoaded: (data: BrowserCertificate) => void;
  onClose?: () => void;
}

export default function CertificateUpload({ onCertificateLoaded, onClose }: CertificateUploadProps) {
  const [step, setStep] = useState<'method-selection' | 'file-upload' | 'browser-selection' | 'verification'>('method-selection');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificateData, setCertificateData] = useState<BrowserCertificate | null>(null);
  const [browserSupport, setBrowserSupport] = useState({ supported: false, message: '' });
  
  // Estados para carga de archivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');

  // Verificar compatibilidad del navegador al cargar
  useEffect(() => {
    const support = checkBrowserSupport();
    setBrowserSupport(support);
  }, []);

  // Handler para selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidCertificateFile(file)) {
      setError('Por favor, selecciona un archivo de certificado válido (.p12, .pfx, .p7b, .cer, .crt)');
      return;
    }

    setSelectedFile(file);
    setError(null);
    console.log('📁 Archivo seleccionado:', file.name, getCertificateFileTypeMessage(file));
  };

  // Handler para procesar archivo P12/PFX
  const handleProcessFile = async () => {
    if (!selectedFile) {
      setError('Por favor, selecciona un archivo');
      return;
    }

    if (!password) {
      setError('Por favor, ingresa la contraseña del certificado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Procesando certificado desde archivo...');
      
      const result = await parseCertificateFile(selectedFile, password);

      if (!result.success || !result.certificate) {
        setError(result.error || 'Error al leer el certificado');
        setIsLoading(false);
        return;
      }

      // Validar certificado
      if (!result.certificate.valido) {
        setError('El certificado está expirado o no es válido');
        setIsLoading(false);
        return;
      }

      if (!result.certificate.nif) {
        setError('No se encontró NIF/DNI en el certificado');
        setIsLoading(false);
        return;
      }

      // Verificar si ya está registrado
      if (isCertificateRegistered(result.certificate.thumbprint)) {
        setError('Este certificado ya está registrado en el sistema');
        setIsLoading(false);
        return;
      }

      console.log('✅ Certificado válido y aceptado');
      setCertificateData(result.certificate);
      setStep('verification');
    } catch (err) {
      const errorMsg = `Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`;
      console.error('❌ Error:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCertificate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Iniciando selección de certificado FNMT...');
      
      const result = await selectClientCertificate();

      if (!result.success || !result.certificate) {
        const errorMsg = result.error || 'Error al seleccionar certificado';
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Validar certificado
      if (!result.certificate.valido) {
        setError('El certificado está expirado o no es válido');
        setIsLoading(false);
        return;
      }

      if (!result.certificate.nif) {
        setError('No se encontró NIF/DNI en el certificado');
        setIsLoading(false);
        return;
      }

      // Verificar si ya está registrado
      if (isCertificateRegistered(result.certificate.thumbprint)) {
        setError('Este certificado ya está registrado en el sistema');
        setIsLoading(false);
        return;
      }

      console.log('✅ Certificado válido y aceptado');
      setCertificateData(result.certificate);
      setStep('verification');
    } catch (err) {
      const errorMsg = `Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`;
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
    setStep('method-selection');
    setCertificateData(null);
    setSelectedFile(null);
    setPassword('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-3xl max-w-2xl w-full border-2 border-orange-500/30 shadow-2xl overflow-hidden my-8">
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
          {/* Step 1: Method Selection */}
          {step === 'method-selection' && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Para registrarte en SEPEI UNIDO, necesitamos validar tu identidad mediante tu certificado digital de la FNMT.
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  Elige el método para proporcionar tu certificado:
                </p>
              </div>

              <div className="grid gap-4">
                {/* Opción 1: Subir archivo */}
                <button
                  onClick={() => setStep('file-upload')}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-lg text-white rounded-xl p-6 transition group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 p-3 rounded-lg group-hover:scale-110 transition">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">Subir Archivo de Certificado</h3>
                      <p className="text-orange-100 text-sm mb-3">
                        Sube tu archivo P12/PFX exportado desde tu navegador o sistema operativo
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-white/20 rounded text-xs">.p12</span>
                        <span className="px-2 py-1 bg-white/20 rounded text-xs">.pfx</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Opción 2: Seleccionar del navegador */}
                <button
                  onClick={() => setStep('browser-selection')}
                  className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl p-6 transition group text-left border-2 border-slate-600"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-600 p-3 rounded-lg group-hover:scale-110 transition">
                      <Fingerprint className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">Certificados del Navegador</h3>
                      <p className="text-gray-300 text-sm mb-3">
                        Usa certificados instalados en tu navegador (solo HTTPS)
                      </p>
                      <div className="text-xs text-yellow-300 bg-yellow-500/20 px-3 py-1 rounded inline-block">
                        ⚠️ Solo funciona en producción (www.sepeiunido.org)
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  <span className="font-bold">¿No tienes certificado FNMT?</span> Puedes obtenerlo gratis en <a href="https://www.fnmt.es" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">www.fnmt.es</a>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: File Upload */}
          {step === 'file-upload' && (
            <div className="space-y-6">
              <button
                onClick={handleReset}
                className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"
              >
                ← Volver a métodos
              </button>

              <div>
                <p className="text-gray-300 mb-4 leading-relaxed">
                  Selecciona tu archivo de certificado (.p12 o .pfx) e ingresa la contraseña.
                </p>
              </div>

              {/* File input */}
              <div className="bg-slate-900/50 rounded-xl p-6 border-2 border-dashed border-slate-600 hover:border-orange-500 transition">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept=".p12,.pfx,.p7b,.cer,.crt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="text-center">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileCheck className="w-12 h-12 text-green-400" />
                        <div className="text-left">
                          <p className="text-white font-bold">{selectedFile.name}</p>
                          <p className="text-gray-400 text-sm">{getCertificateFileTypeMessage(selectedFile)}</p>
                          <p className="text-gray-500 text-xs">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-white font-bold mb-2">Haz clic para seleccionar archivo</p>
                        <p className="text-gray-400 text-sm">P12, PFX, P7B, CER o CRT</p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Password input */}
              {selectedFile && (
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">
                    Contraseña del Certificado
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa la contraseña"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleProcessFile()}
                  />
                  <p className="text-gray-400 text-xs mt-2">
                    Esta es la contraseña que usaste al exportar el certificado
                  </p>
                </div>
              )}

              {/* Process button */}
              <button
                onClick={handleProcessFile}
                disabled={!selectedFile || !password || isLoading}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-lg text-white rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Procesando certificado...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-6 h-6" />
                    Verificar Certificado
                  </>
                )}
              </button>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-red-300 text-sm">
                    <p className="font-bold mb-1">Error:</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-purple-300 text-sm font-bold mb-2">💡 ¿Cómo exportar mi certificado?</p>
                <ol className="text-purple-300 text-sm space-y-1 ml-4 list-decimal">
                  <li>Abre tu navegador (Chrome, Firefox, etc.)</li>
                  <li>Ve a Configuración → Privacidad y Seguridad → Certificados</li>
                  <li>Selecciona tu certificado FNMT</li>
                  <li>Exporta como archivo P12/PFX con contraseña</li>
                  <li>Sube el archivo aquí</li>
                </ol>
              </div>
            </div>
          )}

          {/* Step 3: Browser Selection */}
          {step === 'browser-selection' && (
            <div className="space-y-6">
              <button
                onClick={handleReset}
                className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"
              >
                ← Volver a métodos
              </button>

              <div>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Al hacer clic en el botón de abajo, tu navegador te mostrará un diálogo para seleccionar tu certificado digital instalado.
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
                    <div className="flex flex-col items-start">
                      <span>Buscando certificados...</span>
                      <span className="text-sm text-orange-100">Esto puede tomar unos segundos</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-6 h-6" />
                    Seleccionar Certificado Digital
                  </>
                )}
              </button>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-red-300 text-sm">
                    <p className="font-bold mb-1">Error:</p>
                    <p className="whitespace-pre-wrap">{error}</p>
                    {error.includes('No hay certificados') && (
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

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-300 text-sm">
                  <span className="font-bold">⚠️ Nota Importante:</span> Esta opción solo funciona si el servidor HTTPS está configurado para requerir certificados de cliente. En desarrollo local (HTTP), usa la opción de "Subir Archivo" en su lugar.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Verification */}
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
