// filepath: src/services/fnmtService.ts
// Servicio de validación de certificados digitales FNMT
// FNMT (Fábrica Nacional de Moneda y Timbre) - Certificados de identidad españoles

import * as forge from 'node-forge';

export interface CertificateData {
  id: string;
  nif: string;
  nombre: string;
  apellidos?: string;
  email?: string;
  organizacion?: string;
  fechaValidacion: string;
  fechaExpiracion: string;
  issuer: string;
  thumbprint: string;
  valido: boolean;
}

export interface CertificateValidationResult {
  valido: boolean;
  error?: string;
  data?: CertificateData;
}

/**
 * Procesa un archivo de certificado digital (P12/PFX) y extrae los datos
 * @param file - Archivo del certificado (.p12 o .pfx)
 * @param password - Contraseña del certificado
 * @returns Datos validados del certificado
 */
export const processCertificate = async (
  file: File,
  password: string
): Promise<CertificateValidationResult> => {
  try {
    // Leer archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = String.fromCharCode.apply(null, Array.from(uint8Array));

    // Importar PKCS#12
    let p12asn1;
    try {
      p12asn1 = forge.asn1.fromDer(binaryString);
    } catch {
      return {
        valido: false,
        error: 'Formato de certificado inválido. Por favor, carga un archivo .p12 o .pfx válido.'
      };
    }

    // Desencriptar PKCS#12
    let p12;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12asn1, password);
    } catch {
      return {
        valido: false,
        error: 'Contraseña de certificado incorrecta o certificado corrupto.'
      };
    }

    // Extraer certificado
    if (!p12.getBags || !p12.getBags({ bagType: forge.pki.oids.certBag })) {
      return {
        valido: false,
        error: 'No se encontró certificado en el archivo.'
      };
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag }) as any;
    const certKey = forge.pki.oids.certBag;
    
    if (!certBags[certKey] || certBags[certKey].length === 0) {
      return {
        valido: false,
        error: 'Certificado vacío o inválido.'
      };
    }

    const cert: any = certBags[certKey][0]?.cert;

    if (!cert) {
      return {
        valido: false,
        error: 'No se pudo extraer el certificado válido.'
      };
    }

    // Validar que sea certificado FNMT
    const subjectString = cert.subject.toString();
    const issuerString = cert.issuer.toString();

    // Verificar que sea emitido por AC FNMT o similares
    const esFNMT = issuerString.includes('FNMT') || 
                   issuerString.includes('AC') || 
                   issuerString.includes('Autoridad de Certificación');

    if (!esFNMT) {
      console.warn('Advertencia: El certificado no parece ser de FNMT, pero se procesará.');
    }

    // Extraer datos del certificado
    const nif = extractNIF(subjectString);
    const nombre = extractNombre(subjectString);
    const apellidos = extractApellidos(subjectString);
    const email = extractEmail(cert);
    const organizacion = extractOrganizacion(subjectString);

    // Verificar validez temporal
    const ahora = new Date();
    const fechaInicio = cert.validity.notBefore;
    const fechaExpiracion = cert.validity.notAfter;
    const esValido = ahora >= fechaInicio && ahora <= fechaExpiracion;

    if (!esValido) {
      return {
        valido: false,
        error: `Certificado expirado o no aún válido. Válido desde ${fechaInicio.toLocaleDateString('es-ES')} hasta ${fechaExpiracion.toLocaleDateString('es-ES')}`
      };
    }

    // Generar thumbprint del certificado
    const thumbprint = generateThumbprint(cert);

    // Validar NIF
    if (!nif) {
      return {
        valido: false,
        error: 'No se encontró NIF/DNI en el certificado.'
      };
    }

    if (!isValidNIF(nif)) {
      return {
        valido: false,
        error: `NIF/DNI inválido: ${nif}`
      };
    }

    const certificateData: CertificateData = {
      id: thumbprint,
      nif,
      nombre: nombre || 'Usuario FNMT',
      apellidos,
      email,
      organizacion,
      fechaValidacion: new Date().toISOString(),
      fechaExpiracion: fechaExpiracion.toISOString(),
      issuer: issuerString,
      thumbprint,
      valido: true
    };

    return {
      valido: true,
      data: certificateData
    };
  } catch (error) {
    console.error('Error procesando certificado:', error);
    return {
      valido: false,
      error: `Error al procesar certificado: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
};

/**
 * Extrae el NIF/DNI del subject del certificado
 */
const extractNIF = (subjectString: string): string | null => {
  // Patrones comunes para NIF en certificados españoles
  const patterns = [
    /serialNumber=(\d{8}[A-Z])/,
    /CN=([0-9]{8}[A-Z])/,
    /uid=([0-9]{8}[A-Z])/,
    /([0-9]{8}[A-Z])/
  ];

  for (const pattern of patterns) {
    const match = subjectString.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

/**
 * Extrae el nombre del subject
 */
const extractNombre = (subjectString: string): string | null => {
  const cnMatch = subjectString.match(/CN=([^,]+)/);
  if (cnMatch) {
    const cnValue = cnMatch[1];
    // El CN suele ser "Apellido Nombre (NIF)"
    const partes = cnValue.split('(')[0].trim();
    const nombres = partes.split(' ');
    // Retorna el último nombre (generalmente es el nombre, no apellido)
    return nombres[nombres.length - 1] || null;
  }
  return null;
};

/**
 * Extrae los apellidos del subject
 */
const extractApellidos = (subjectString: string): string | undefined => {
  const cnMatch = subjectString.match(/CN=([^,]+)/);
  if (cnMatch) {
    const cnValue = cnMatch[1];
    const partes = cnValue.split('(')[0].trim();
    const nombres = partes.split(' ');
    if (nombres.length > 1) {
      // Todos excepto el último (que es el nombre)
      return nombres.slice(0, -1).join(' ');
    }
  }
  return undefined;
};

/**
 * Extrae el email del certificado
 */
const extractEmail = (cert: any): string | undefined => {
  // Buscar en SubjectAltName
  try {
    const ext = cert.getExtension('subjectAltName');
    if (ext && ext.altNames) {
      for (const altName of ext.altNames) {
        if (altName.type === 1) { // rfc822Name = email
          return altName.value;
        }
      }
    }
  } catch {
    // Silenciar error
  }

  // Buscar en subject
  const subjectString = cert.subject.toString();
  const emailMatch = subjectString.match(/emailAddress=([^,]+)/);
  if (emailMatch) {
    return emailMatch[1];
  }

  return undefined;
};

/**
 * Extrae la organización
 */
const extractOrganizacion = (subjectString: string): string | undefined => {
  const oMatch = subjectString.match(/O=([^,]+)/);
  if (oMatch) {
    return oMatch[1];
  }
  return undefined;
};

/**
 * Genera un thumbprint (huella) del certificado
 */
const generateThumbprint = (cert: any): string => {
  try {
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const md = forge.md.sha256.create();
    md.update(der);
    const digest = md.digest().toHex();
    return digest.toUpperCase();
  } catch {
    // Fallback: usar serial number
    return cert.serialNumber;
  }
};

/**
 * Valida el formato de un NIF/DNI español
 */
const isValidNIF = (nif: string): boolean => {
  if (!nif || nif.length !== 9) return false;

  const nifsm = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const numeros = parseInt(nif.substring(0, 8), 10);
  const letra = nif.substring(8, 9).toUpperCase();

  if (numeros < 0 || numeros > 99999999) {
    return false;
  }

  return nifsm[numeros % 23] === letra;
};

/**
 * Verifica si un certificado ya fue registrado
 */
export const isCertificateRegistered = (thumbprint: string): boolean => {
  try {
    const usuarios = localStorage.getItem('sepei_unido_users');
    if (!usuarios) return false;

    const users = JSON.parse(usuarios);
    return users.some((user: any) => user.certificado_thumbprint === thumbprint);
  } catch {
    return false;
  }
};

/**
 * Guarda el certificado validado en la sesión temporal
 */
export const saveCertificateToSession = (data: CertificateData): void => {
  sessionStorage.setItem('fnmt_certificate_session', JSON.stringify({
    ...data,
    timestamp: Date.now()
  }));
};

/**
 * Obtiene el certificado de la sesión temporal
 */
export const getCertificateFromSession = (): CertificateData | null => {
  const session = sessionStorage.getItem('fnmt_certificate_session');
  if (!session) return null;

  try {
    const data = JSON.parse(session);
    // Válido por 1 hora
    if (Date.now() - data.timestamp > 3600000) {
      sessionStorage.removeItem('fnmt_certificate_session');
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

/**
 * Limpia el certificado de la sesión
 */
export const clearCertificateSession = (): void => {
  sessionStorage.removeItem('fnmt_certificate_session');
};
