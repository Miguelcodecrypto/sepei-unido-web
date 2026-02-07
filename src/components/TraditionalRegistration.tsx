import React, { useState } from 'react';
import { CheckCircle, Mail, User, CreditCard, AlertCircle, MapPin } from 'lucide-react';
import { sendVerificationEmail, sendNewUserNotificationToAdmin } from '../services/emailService';
import { hashPassword, generateTemporaryPassword } from '../services/passwordService';
import { getUserByDni, addUser } from '../services/userDatabase';

interface TraditionalRegistrationProps {
  onSuccess: (userData: UserData) => void;
  onCancel: () => void;
  initialData?: {
    nombre?: string;
    email?: string;
  };
}

export interface UserData {
  nombre: string;
  apellidos: string;
  dni: string;
  email: string;
  verified: boolean;
  registeredAt: string;
}

interface FormData {
  nombre: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
   parque: string;
}

interface ValidationErrors {
  nombre?: string;
  apellidos?: string;
  dni?: string;
  email?: string;
  telefono?: string;
   parque?: string;
}

export const TraditionalRegistration: React.FC<TraditionalRegistrationProps> = ({
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState<FormData>({
    nombre: initialData?.nombre || '',
    apellidos: '',
    dni: '',
    email: initialData?.email || '',
    telefono: '',
    parque: 'Hellín',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verification'>('form');
  const [verificationSent, setVerificationSent] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Validar DNI/NIE espa├▒ol
  const validateDNI = (dni: string): boolean => {
    const dniRegex = /^[0-9]{8}[A-Z]$/;
    const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
    
    if (!dniRegex.test(dni) && !nieRegex.test(dni)) {
      return false;
    }

    // Validar letra del DNI
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    let number: number;

    if (nieRegex.test(dni)) {
      const niePrefix = dni.charAt(0);
      const nieNumber = dni.substring(1, 8);
      const replacement = niePrefix === 'X' ? '0' : niePrefix === 'Y' ? '1' : '2';
      number = parseInt(replacement + nieNumber, 10);
    } else {
      number = parseInt(dni.substring(0, 8), 10);
    }

    const expectedLetter = letters[number % 23];
    return dni.charAt(dni.length - 1) === expectedLetter;
  };

  // Validar email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.apellidos.trim()) {
      newErrors.apellidos = 'Los apellidos son obligatorios';
    } else if (formData.apellidos.trim().length < 2) {
      newErrors.apellidos = 'Los apellidos deben tener al menos 2 caracteres';
    }

    if (!formData.dni.trim()) {
      newErrors.dni = 'El DNI/NIE es obligatorio';
    } else if (!validateDNI(formData.dni.toUpperCase())) {
      newErrors.dni = 'DNI/NIE inv├ílido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email inv├ílido';
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio';
    }

    if (!formData.parque.trim()) {
      newErrors.parque = 'El parque del SEPEI es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error del campo modificado
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!acceptedPrivacy) {
      setErrors({ email: 'Debes aceptar la pol├¡tica de privacidad para continuar' });
      return;
    }

    setIsLoading(true);

    try {
      // Normalizar DNI a may├║sculas
      const normalizedDNI = formData.dni.toUpperCase();

      // Verificar si el DNI ya est├í registrado en Supabase
      const existingUser = await getUserByDni(normalizedDNI);
      if (existingUser) {
        setErrors({ dni: 'Este DNI ya est├í registrado' });
        setIsLoading(false);
        return;
      }

      // Generar contrase├▒a temporal segura
      const tempPassword = generateTemporaryPassword(12);
      
      // Cifrar la contraseña antes de guardarla
      const hashedPassword = await hashPassword(tempPassword);

      // Crear token de verificación
      const verificationToken = crypto.randomUUID();

      // Obtener IP del cliente
      let userIP = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
      } catch (error) {
        console.error('Error obteniendo IP:', error);
      }

      // Crear usuario
      const userData: UserData = {
        nombre: formData.nombre.trim(),
        apellidos: formData.apellidos.trim(),
        dni: normalizedDNI,
        email: formData.email.trim().toLowerCase(),
        verified: false,
        registeredAt: new Date().toISOString(),
      };

      // Calcular fecha de expiración del token (7 días)
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Guardar en Supabase inmediatamente con el token de verificación
      console.log('💾 [REGISTRO] Guardando usuario en Supabase con token de verificación...');
      const result = await addUser({
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        dni: userData.dni,
        email: userData.email,
        telefono: formData.telefono.trim(),
        parque_sepei: formData.parque.trim(),
        password: hashedPassword,
        registration_ip: userIP,
        terminos_aceptados: acceptedPrivacy,
        verified: false,
        requires_password_change: true, // Contraseña temporal requiere cambio
        verification_token: verificationToken,
        verification_token_expires_at: tokenExpiresAt,
        certificado_nif: undefined,
        certificado_thumbprint: undefined,
        certificado_fecha_validacion: undefined,
        certificado_valido: false,
      });

      if (!result.user) {
        console.error('❌ Error al guardar usuario en Supabase:', result.error);
        
        // Mostrar error específico según el tipo
        if (result.error === 'email_duplicado') {
          setErrors({ email: 'Este email ya está registrado. Usa otro email o recupera tu contraseña.' });
        } else if (result.error === 'dni_duplicado') {
          setErrors({ dni: 'Este DNI ya está registrado.' });
        } else {
          setErrors({ email: 'Error al procesar el registro en la base de datos. Intenta de nuevo.' });
        }
        setIsLoading(false);
        return;
      }

      const supabaseUser = result.user;
      console.log('✅ Usuario guardado en Supabase:', supabaseUser.id);

      // Enviar email de verificaci├│n usando el servicio real
      const emailSent = await sendVerificationEmail({
        email: userData.email,
        nombre: userData.nombre,
        tempPassword,
        verificationToken,
        dni: userData.dni
      });

      if (!emailSent) {
        setErrors({ email: 'Error al enviar email de verificaci├│n. Intenta de nuevo.' });
        setIsLoading(false);
        return;
      }

      // Enviar notificación a admin de nuevo usuario registrado
      sendNewUserNotificationToAdmin({
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        dni: userData.dni,
        email: userData.email,
        telefono: formData.telefono.trim(),
        parque_sepei: formData.parque.trim(),
      }).catch(error => {
        // No bloquear el flujo si falla la notificación
        console.error('Error al enviar notificación a admin:', error);
      });

      setVerificationSent(true);
      setStep('verification');

      // Solo en desarrollo, mostrar la info en consola
      // @ts-ignore - import.meta.env existe en Vite pero TypeScript no lo reconoce
      if (import.meta.env?.DEV) {
        console.log('💻 [DESARROLLO] Datos de verificación:');
        console.log('Email:', userData.email);
        console.log('Contraseña temporal:', tempPassword);
        console.log('Token:', verificationToken);
      }

    } catch (error) {
      console.error('Error en registro:', error);
      setErrors({ email: 'Error al procesar el registro. Intenta de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verification') {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ¡Revisa tu correo!
          </h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-gray-700 mb-3">
              Hemos enviado un email a:
            </p>
            <p className="font-semibold text-blue-700 mb-4">
              {formData.email}
            </p>
            <p className="text-gray-600 text-sm">
              El email contiene:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Tu contraseña temporal
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Enlace de verificación
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-gray-700">
                  <strong>Importante:</strong> El enlace expira en 24 horas.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Si no recibes el email, revisa tu carpeta de spam.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          Registro con Email
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Completa tus datos para crear tu cuenta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.nombre ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Juan"
            />
          </div>
          {errors.nombre && (
            <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
          )}
        </div>

        {/* Apellidos */}
        <div>
          <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-1">
            Apellidos *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="apellidos"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.apellidos ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Pérez García"
            />
          </div>
          {errors.apellidos && (
            <p className="text-red-500 text-sm mt-1">{errors.apellidos}</p>
          )}
        </div>

        {/* DNI/NIE */}
        <div>
          <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1">
            DNI/NIE (Usuario) *
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="dni"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                errors.dni ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="12345678Z"
              maxLength={9}
            />
          </div>
          {errors.dni && (
            <p className="text-red-500 text-sm mt-1">{errors.dni}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Este será tu nombre de usuario
          </p>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="tu@email.com"
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Recibirás tu contraseña temporal por email
          </p>
        </div>

        {/* Teléfono */}
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono *
          </label>
          <div className="relative">
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.telefono ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="612345678"
            />
          </div>
          {errors.telefono && (
            <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
          )}
        </div>

        {/* Parque SEPEI */}
        <div>
          <label htmlFor="parque" className="block text-sm font-medium text-gray-700 mb-1">
            Parque del SEPEI donde trabajas actualmente *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              id="parque"
              name="parque"
              value={formData.parque}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.parque ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="Hellín">Hellín</option>
              <option value="Villarrobledo">Villarrobledo</option>
              <option value="Almansa">Almansa</option>
              <option value="La Roda">La Roda</option>
              <option value="Casas Ibáñez">Casas Ibañez</option>
              <option value="Molinicos">Molinicos</option>
              <option value="Alcaraz">Alcaraz</option>
              <option value="Central del Sepei">Central del Sepei</option>
            </select>
          </div>
          {errors.parque && (
            <p className="text-red-500 text-sm mt-1">{errors.parque}</p>
          )}
        </div>

        {/* Checkbox de Protección de Datos */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              He leído y acepto la{' '}
              <a 
                href="/politica-privacidad" 
                target="_blank" 
                className="text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                Política de Privacidad
              </a>
              {' '}y el tratamiento de mis datos personales conforme al RGPD. 
              Mis datos serán utilizados únicamente para gestionar mi participación en SEPEI UNIDO 
              y no serán cedidos a terceros sin mi consentimiento.
            </span>
          </label>
        </div>

        {/* Botones */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 pb-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 sm:px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
            disabled={isLoading || !acceptedPrivacy}
          >
            {isLoading ? 'Enviando...' : 'Registrarse'}
          </button>
        </div>
      </form>

      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Tus datos están protegidos según la normativa RGPD
        </p>
      </div>
    </div>
  );
};
