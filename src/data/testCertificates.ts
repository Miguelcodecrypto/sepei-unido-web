/**
 * Certificados de prueba para desarrollo
 * 
 * Estos certificados simulan certificados FNMT reales para pruebas en desarrollo.
 * NO SON VÁLIDOS para producción.
 */

import type { BrowserCertificate } from '../services/browserCertificateService';

// Certificados de prueba simulados
export const testCertificates: BrowserCertificate[] = [
  {
    id: 'test-cert-001',
    subject: 'CN=Juan García López,O=FNMT,C=ES',
    issuer: 'CN=AC FNMT Usuarios,O=FNMT,C=ES',
    nif: '12345678A',
    nombre: 'Juan',
    apellidos: 'García López',
    email: 'juan@example.com',
    notBefore: new Date('2023-01-01'),
    notAfter: new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000), // 1 año desde ahora
    serialNumber: 'ABC123DEF456',
    thumbprint: 'SHA256:1234567890ABCDEF',
    valido: true
  },
  {
    id: 'test-cert-002',
    subject: 'CN=María Rodríguez González,O=FNMT,C=ES',
    issuer: 'CN=AC FNMT Usuarios,O=FNMT,C=ES',
    nif: '87654321B',
    nombre: 'María',
    apellidos: 'Rodríguez González',
    email: 'maria@example.com',
    notBefore: new Date('2023-06-15'),
    notAfter: new Date(new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 años desde ahora
    serialNumber: 'GHI789JKL012',
    thumbprint: 'SHA256:FEDCBA0987654321',
    valido: true
  },
  {
    id: 'test-cert-003',
    subject: 'CN=Carlos Martínez Pérez,O=FNMT,C=ES',
    issuer: 'CN=AC FNMT Usuarios,O=FNMT,C=ES',
    nif: '11111111C',
    nombre: 'Carlos',
    apellidos: 'Martínez Pérez',
    email: 'carlos@example.com',
    notBefore: new Date('2022-03-20'),
    notAfter: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // Expirado hace 30 días
    serialNumber: 'MNO345PQR678',
    thumbprint: 'SHA256:3456789ABCDEF012',
    valido: false, // Certificado expirado
    errorMessage: 'El certificado ha expirado'
  }
];

/**
 * Inicializa los certificados de prueba en localStorage
 * Llamar a esta función desde la consola del navegador para cargar certificados de prueba
 */
export const initializeTestCertificates = () => {
  try {
    // Solo guardar certificados válidos
    const validCerts = testCertificates.filter(cert => cert.valido);
    localStorage.setItem('fnmt_test_certificates', JSON.stringify(validCerts));
    console.log('✅ Certificados de prueba cargados en localStorage');
    console.log('Total:', validCerts.length, 'certificados disponibles');
    validCerts.forEach((cert, i) => {
      console.log(`  ${i + 1}. ${cert.nombre} ${cert.apellidos} (${cert.nif})`);
    });
    return true;
  } catch (error) {
    console.error('❌ Error cargando certificados de prueba:', error);
    return false;
  }
};

/**
 * Limpia los certificados de prueba de localStorage
 */
export const clearTestCertificates = () => {
  try {
    localStorage.removeItem('fnmt_test_certificates');
    console.log('✅ Certificados de prueba eliminados');
    return true;
  } catch (error) {
    console.error('❌ Error eliminando certificados de prueba:', error);
    return false;
  }
};

/**
 * Muestra los certificados de prueba disponibles
 */
export const listTestCertificates = () => {
  const stored = localStorage.getItem('fnmt_test_certificates');
  if (!stored) {
    console.log('ℹ️ No hay certificados de prueba cargados');
    console.log('Ejecuta: initializeTestCertificates()');
    return [];
  }

  try {
    const certs = JSON.parse(stored);
    console.log('📋 Certificados de prueba disponibles:');
    certs.forEach((cert: BrowserCertificate, i: number) => {
      const expiredStatus = new Date(cert.notAfter) < new Date() ? '⏰ EXPIRADO' : '✅ VÁLIDO';
      console.log(
        `  ${i + 1}. ${cert.nombre} ${cert.apellidos} (${cert.nif}) - ${expiredStatus}`
      );
    });
    return certs;
  } catch (error) {
    console.error('❌ Error leyendo certificados:', error);
    return [];
  }
};

// Exportar las funciones al objeto global window para uso en consola
if (typeof window !== 'undefined') {
  (window as any).fnmt = {
    initializeTestCertificates,
    clearTestCertificates,
    listTestCertificates
  };
}
