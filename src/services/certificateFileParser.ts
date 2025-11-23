// filepath: src/services/certificateFileParser.ts
// Servicio para parsear archivos de certificado P12/PFX usando node-forge

import forge from 'node-forge';
import type { BrowserCertificate } from './browserCertificateService';

export interface CertificateFileParseResult {
  success: boolean;
  certificate?: BrowserCertificate;
  error?: string;
}

/**
 * Parsea un archivo P12/PFX y extrae el certificado
 * @param file Archivo P12/PFX
 * @param password Contraseña del certificado
 */
export const parseCertificateFile = async (
  file: File,
  password: string
): Promise<CertificateFileParseResult> => {
  try {
    console.log('📁 [FNMT] Parseando archivo de certificado:', file.name);

    // Leer el archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convertir a string binario para forge
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }

    // Convertir a base64 si es necesario
    const asn1Data = forge.util.decode64(forge.util.encode64(binaryString));

    // Parsear P12
    let p12Asn1;
    try {
      p12Asn1 = forge.asn1.fromDer(asn1Data);
    } catch (e) {
      // Si falla, intentar directamente con los bytes
      p12Asn1 = forge.asn1.fromDer(binaryString);
    }

    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extraer certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    if (!certBags || !certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag].length === 0) {
      console.error('❌ [FNMT] No se encontró certificado en el archivo');
      return {
        success: false,
        error: 'No se encontró certificado en el archivo P12/PFX'
      };
    }

    const certBag = certBags[forge.pki.oids.certBag][0];
    const cert = certBag.cert;

    if (!cert) {
      console.error('❌ [FNMT] Certificado vacío');
      return {
        success: false,
        error: 'El certificado está vacío o corrupto'
      };
    }

    console.log('✅ [FNMT] Certificado parseado correctamente');

    // Extraer información del certificado
    const subject = cert.subject as any;
    const issuer = cert.issuer as any;
    
    // Extraer campos
    const cn = subject.getField('CN')?.value || '';
    const serialNumber = subject.getField('serialNumber')?.value || '';
    const email = subject.getField('E')?.value || subject.getField('emailAddress')?.value || '';
    
    // Intentar extraer NIF/DNI del serial number o CN
    let nif = serialNumber;
    const nifMatch = cn.match(/\b\d{8}[A-Z]\b/);
    if (nifMatch) {
      nif = nifMatch[0];
    }

    // Extraer nombre y apellidos del CN
    let nombre = '';
    let apellidos = '';
    
    // El formato típico de FNMT es: "APELLIDOS NOMBRE (NIF)"
    const cnParts = cn.split('(')[0].trim();
    const nameParts = cnParts.split(' ').filter((p: string) => p.length > 0);
    
    if (nameParts.length > 0) {
      // Último elemento suele ser el nombre
      nombre = nameParts[nameParts.length - 1];
      // El resto son apellidos
      apellidos = nameParts.slice(0, -1).join(' ');
    }

    // Validar fechas
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const now = new Date();
    const valido = now >= notBefore && now <= notAfter;

    // Generar thumbprint (SHA-256)
    const certPem = forge.pki.certificateToPem(cert as any);
    const md = forge.md.sha256.create();
    md.update(certPem);
    const thumbprint = md.digest().toHex().toUpperCase();

    const browserCert: BrowserCertificate = {
      id: `cert-${thumbprint.substring(0, 16)}`,
      subject: cn,
      issuer: issuer.getField('CN')?.value || issuer.attributes?.map((a: any) => `${a.shortName}=${a.value}`).join(', ') || 'Unknown',
      nif,
      nombre,
      apellidos,
      email,
      notBefore,
      notAfter,
      serialNumber: cert.serialNumber || '0',
      thumbprint: `SHA256:${thumbprint}`,
      valido,
      errorMessage: valido ? undefined : 'Certificado expirado'
    };

    console.log('📄 [FNMT] Datos extraídos:', {
      nif: browserCert.nif,
      nombre: browserCert.nombre,
      apellidos: browserCert.apellidos,
      valido: browserCert.valido
    });

    return {
      success: true,
      certificate: browserCert
    };

  } catch (error) {
    console.error('❌ [FNMT] Error al parsear certificado:', error);
    
    let errorMsg = 'Error al leer el archivo de certificado';
    if (error instanceof Error) {
      if (error.message.includes('Invalid password') || error.message.includes('HMAC')) {
        errorMsg = 'Contraseña incorrecta';
      } else if (error.message.includes('Invalid PKCS#12')) {
        errorMsg = 'El archivo no es un certificado P12/PFX válido';
      } else {
        errorMsg = `Error: ${error.message}`;
      }
    }

    return {
      success: false,
      error: errorMsg
    };
  }
};

/**
 * Valida que un archivo sea un certificado válido (por extensión)
 */
export const isValidCertificateFile = (file: File): boolean => {
  const validExtensions = ['.p12', '.pfx', '.p7b', '.cer', '.crt'];
  const fileName = file.name.toLowerCase();
  return validExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Obtiene un mensaje descriptivo del tipo de archivo
 */
export const getCertificateFileTypeMessage = (file: File): string => {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.p12') || fileName.endsWith('.pfx')) {
    return 'Archivo P12/PFX (Certificado + clave privada)';
  }
  
  if (fileName.endsWith('.p7b')) {
    return 'Archivo P7B (Cadena de certificados)';
  }
  
  if (fileName.endsWith('.cer') || fileName.endsWith('.crt')) {
    return 'Archivo CER/CRT (Certificado público)';
  }
  
  return 'Archivo de certificado';
};
