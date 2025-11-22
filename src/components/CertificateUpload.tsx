// filepath: src/components/CertificateUpload.tsx
import React, { useState, useRef } from 'react';
import { Upload, Lock, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';
import { processCertificate, saveCertificateToSession, isCertificateRegistered, type CertificateData } from '../services/fnmtService';

interface CertificateUploadProps {
  onCertificateLoaded: (data: CertificateData) => void;
  onClose?: () => void;
}

export default function CertificateUpload({ onCertificateLoaded, onClose }: CertificateUploadProps) {
  const [step, setStep] = useState<'upload' | 'password' | 'verification'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar extensión
    const validExtensions = ['.p12', '.pfx'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      setError('Por favor, selecciona un archivo .p12 o .pfx válido');
      setSelectedFile(null);
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máx 5MB)');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setStep('password');
  };

  const handleProcessCertificate = async () => {
    if (!selectedFile || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await processCertificate(selectedFile, password);

      if (!result.valido) {
        setError(result.error || 'Error al procesar el certificado');
        setIsLoading(false);
        return;
      }

      if (!result.data) {
        setError('No se pudieron extraer los datos del certificado');
        setIsLoading(false);
        return;
      }

      // Verificar si el certificado ya está registrado
      if (isCertificateRegistered(result.data.thumbprint)) {
        setError('Este certificado ya está registrado en el sistema. Por favor, usa otro certificado.');
        setIsLoading(false);
        return;
      }

      // Guardar en sesión y pasar al siguiente paso
      setCertificateData(result.data);
      saveCertificateToSession(result.data);
      setStep('verification');
    } catch (err) {
      setError(`Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (certificateData) {
      onCertificateLoaded(certificateData);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setPassword('');
    setError(null);
    setCertificateData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Para registrarte en SEPEI UNIDO, necesitamos validar tu identidad mediante tu certificado digital de la FNMT (Fábrica Nacional de Moneda y Timbre).
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-3 border-dashed border-orange-500/50 rounded-2xl p-12 text-center cursor-pointer hover:bg-orange-500/10 transition"
              >
                <Upload className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <p className="text-white font-bold text-lg mb-2">Carga tu Certificado Digital</p>
                <p className="text-gray-400 text-sm mb-4">Arrastra tu archivo .p12 o .pfx aquí, o haz clic para seleccionar</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".p12,.pfx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile && (
                  <p className="text-orange-300 font-semibold mt-4 flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5" />
                    {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  <span className="font-bold">¿No tienes certificado FNMT?</span> Puedes obtenerlo gratis en <a href="https://www.fnmt.es" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">www.fnmt.es</a>
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-300 mb-6">
                  Se ha cargado el certificado <span className="font-semibold text-orange-400">{selectedFile?.name}</span>
                </p>
                <p className="text-gray-400 text-sm mb-4">Ahora necesitamos la contraseña para desencriptar tu certificado.</p>
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">Contraseña del Certificado</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full px-5 py-4 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none transition"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && password) {
                      handleProcessCertificate();
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-300 text-sm">
                  <span className="font-bold">Privacidad:</span> La contraseña y el certificado se procesan solo en tu navegador. Nunca se envían a nuestros servidores.
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
                  Cambiar Archivo
                </button>
                <button
                  onClick={handleProcessCertificate}
                  disabled={!password || isLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                >
                  {isLoading ? 'Procesando...' : 'Verificar Certificado'}
                </button>
              </div>
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
                  <p className="text-white">{new Date(certificateData.fechaExpiracion).toLocaleDateString('es-ES')}</p>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-gray-400 text-sm mb-1">Autoridad Emisora</p>
                  <p className="text-white text-sm">{certificateData.issuer}</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  Al confirmar, aceptas registrarte con tu identidad verificada. Esta información se tratará de conformidad con la legislación de protección de datos vigente.
                </p>
              </div>

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
