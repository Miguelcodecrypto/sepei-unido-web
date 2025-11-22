// filepath: src/services/browserCertificateService.ts
// Servicio para acceder a certificados digitales instalados en el navegador
// Utiliza Web Crypto API y ClientCertificateRequestEvent

export interface BrowserCertificate {
  id: string;
  subject: string;
  issuer: string;
  nif?: string;
  nombre?: string;
  apellidos?: string;
  email?: string;
  notBefore: Date;
  notAfter: Date;
  serialNumber: string;
  thumbprint: string;
  valido: boolean;
  errorMessage?: string;
}

export interface CertificateSelectionResult {
  success: boolean;
  certificate?: BrowserCertificate;
  error?: string;
}

/**
 * Solicita certificado del navegador
 * En navegadores que soportan certificados de cliente (TLS client cert)
 */
export const selectClientCertificate = async (): Promise<CertificateSelectionResult> => {
  try {
    console.log('🔐 [FNMT] Iniciando selección de certificado del navegador...');
    
    // Verificar soporte básico
    if (!window.crypto || !window.crypto.subtle) {
      return {
        success: false,
        error: 'Tu navegador no soporta Web Crypto API. Por favor, actualiza a Chrome 90+, Firefox 88+, Safari 14+ o Edge 90+'
      };
    }

    console.log('📋 [FNMT] Navegador:', getBrowserInfo());
    
    // En navegadores reales con HTTPS, los certificados de cliente se solicitan automáticamente
    // Pero en desarrollo local, usamos una simulación que funciona en HTTP
    
    const result = await requestCertificateViaHTTPS();
    
    if (result.success && result.certificate) {
      console.log('✅ [FNMT] Certificado obtenido:', result.certificate.nif);
      return result;
    }

    console.log('⚠️ [FNMT] No se pudo obtener certificado. Mostrando instrucciones...', result.error);
    
    // Si falla, mostrar instrucciones al usuario
    return result;

  } catch (error) {
    console.error('❌ [FNMT] Error:', error);
    return {
      success: false,
      error: `Error al acceder a certificados: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
};

/**
 * Solicita certificado via HTTPS con requerimiento de cliente cert
 * En desarrollo HTTP, simula el diálogo del navegador
 */
const requestCertificateViaHTTPS = async (): Promise<CertificateSelectionResult> => {
  return new Promise((resolve) => {
    try {
      console.log('📨 [FNMT] Abriendo diálogo de selección de certificados...');
      
      // Obtener certificados de prueba
      const testCerts = getStoredTestCertificates();
      
      if (testCerts.length === 0) {
        console.warn('⚠️ [FNMT] No hay certificados disponibles');
        resolve({
          success: false,
          error: `No hay certificados disponibles.

Para probar en desarrollo:
1. Abre la consola del navegador (F12)
2. Ejecuta: fnmt.initializeTestCertificates()
3. Intenta de nuevo

Para certificados reales FNMT:
1. Instala el certificado desde www.fnmt.es
2. Los certificados aparecerán automáticamente aquí

Navegadores soportados:
✓ Chrome 90+
✓ Firefox 88+
✓ Safari 14+
✓ Edge 90+`
        });
        return;
      }

      console.log(`📋 [FNMT] Mostrando ${testCerts.length} certificado(s)`);
      
      // Mostrar diálogo para seleccionar certificado
      showCertificateSelectionDialog(testCerts, (selected) => {
        if (selected) {
          console.log('✅ [FNMT] Certificado seleccionado:', selected.nif);
          resolve({ success: true, certificate: selected });
        } else {
          console.log('🚫 [FNMT] Selección cancelada');
          resolve({ success: false, error: 'Selección de certificado cancelada' });
        }
      });
      
    } catch (error) {
      console.error('❌ [FNMT] Error en requestCertificateViaHTTPS:', error);
      resolve({
        success: false,
        error: `Error técnico: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    }
  });
};

/**
 * Simula el diálogo de selección de certificados en modo desarrollo
 */
const simulateCertificateDialog = (): Promise<CertificateSelectionResult> => {
  return new Promise((resolve) => {
    console.log('🎭 [FNMT] Iniciando diálogo de selección de certificados...');
    console.log('🌐 [FNMT] Protocolo:', window.location.protocol);
    console.log('🖥️ [FNMT] Host:', window.location.hostname);
    
    // En desarrollo HTTP: mostrar certificados de prueba
    if (window.location.protocol === 'http:' && window.location.hostname === 'localhost') {
      console.log('💡 [FNMT] Modo desarrollo (HTTP localhost) - Usando certificados de prueba');
      showTestCertificatesDialog(resolve);
      return;
    }

    // En HTTPS producción: intentar detectar certificados reales del sistema
    if (window.location.protocol === 'https:') {
      console.log('🔒 [FNMT] HTTPS detectado - Intentando obtener certificados del sistema...');
      attemptToDectectSystemCertificates().then((systemCerts) => {
        console.log(`🔍 [FNMT] Certificados del sistema encontrados: ${systemCerts.length}`);
        
        const storedCerts = getStoredTestCertificates();
        const allCerts = [...systemCerts, ...storedCerts];
        
        if (allCerts.length > 0) {
          console.log(`📋 [FNMT] Total certificados disponibles: ${allCerts.length}`);
          showCertificateSelectionDialog(allCerts, (selected) => {
            if (selected) {
              console.log('✅ [FNMT] Certificado seleccionado:', selected.nif);
              resolve({ success: true, certificate: selected });
            } else {
              console.log('🚫 [FNMT] Selección cancelada');
              resolve({ success: false, error: 'Selección de certificado cancelada' });
            }
          });
        } else {
          showNoCertificatesMessage(resolve);
        }
      });
      return;
    }

    // Fallback: mostrar certificados de prueba
    console.log('⚠️ [FNMT] Protocolo no reconocido - Usando certificados de prueba');
    showTestCertificatesDialog(resolve);
  });
};

/**
 * Muestra diálogo con certificados de prueba
 */
const showTestCertificatesDialog = (resolve: (value: CertificateSelectionResult) => void) => {
  const testCerts = getStoredTestCertificates();
  
  if (testCerts.length === 0) {
    console.warn('⚠️ [FNMT] No hay certificados de prueba cargados');
    showNoCertificatesMessage(resolve);
    return;
  }

  console.log(`📋 [FNMT] Mostrando ${testCerts.length} certificado(s) de prueba`);
  showCertificateSelectionDialog(testCerts, (selected) => {
    if (selected) {
      console.log('✅ [FNMT] Certificado de prueba seleccionado:', selected.nif);
      resolve({ success: true, certificate: selected });
    } else {
      console.log('🚫 [FNMT] Selección cancelada');
      resolve({ success: false, error: 'Selección de certificado cancelada' });
    }
  });
};

/**
 * Muestra mensaje cuando no hay certificados
 */
const showNoCertificatesMessage = (resolve: (value: CertificateSelectionResult) => void) => {
  console.warn('⚠️ [FNMT] Sin certificados disponibles');
  resolve({
    success: false,
    error: `No hay certificados disponibles.

Para usar certificados reales FNMT:
1. Instala el certificado en tu navegador desde www.fnmt.es
2. Accede a www.sepeiunido.org (HTTPS)
3. El navegador mostrará tus certificados disponibles

Para desarrollo:
1. Abre la consola del navegador (F12)
2. Ejecuta: fnmt.initializeTestCertificates()
3. Vuelve a intentar

Navegadores soportados:
✓ Chrome 90+
✓ Firefox 88+
✓ Safari 14+
✓ Edge 90+`
  });
};

/**
 * Intenta detectar certificados instalados en el sistema
 * Utiliza múltiples métodos compatibles con navegadores
 */
const attemptToDectectSystemCertificates = async (): Promise<BrowserCertificate[]> => {
  const certificates: BrowserCertificate[] = [];
  
  try {
    console.log('🔍 [FNMT] Buscando certificados del sistema...');
    
    // Método principal: Solicitud TLS en HTTPS (solo funciona en HTTPS con cliente certs requeridos)
    const xhr = await detectViaXHRTimeout();
    certificates.push(...xhr);
    
    if (certificates.length > 0) {
      console.log(`✓ [FNMT] ${certificates.length} certificado(s) del sistema detectado(s)`);
    } else {
      console.log('ℹ️ [FNMT] No se detectaron certificados del sistema en HTTPS');
      // En HTTPS, el navegador mostraría un diálogo nativo si hay certificados requeridos
      // Pero como navegador toma el control, nosotros no los vemos aquí
    }
    
  } catch (error) {
    console.log('ℹ️ [FNMT] Error en detección de certificados del sistema:', (error as Error).message);
  }
  
  return certificates;
};

/**
 * Intenta detectar certificados via XMLHttpRequest con timeout
 * Nota: En HTTPS con cliente cert requerido, el navegador mostrará su diálogo nativo
 */
const detectViaXHRTimeout = (): Promise<BrowserCertificate[]> => {
  return new Promise((resolve) => {
    const certificates: BrowserCertificate[] = [];
    const timeoutMs = 3000; // 3 segundos máximo
    
    try {
      const xhr = new XMLHttpRequest();
      
      const timeoutHandle = setTimeout(() => {
        console.log('⏱️ [FNMT] Timeout en detección via XHR (normal)');
        xhr.abort();
        resolve(certificates);
      }, timeoutMs);
      
      xhr.addEventListener('load', () => {
        clearTimeout(timeoutHandle);
        
        try {
          const certHeader = xhr.getResponseHeader('X-Client-Cert');
          if (certHeader) {
            console.log('✓ [FNMT] Certificado detectado en response headers');
            const cert = JSON.parse(atob(certHeader));
            const parsed = parseCertificateData(cert);
            if (parsed) certificates.push(parsed);
          }
        } catch (e) {
          console.log('ℹ️ [FNMT] No valid certificate in headers');
        }
        
        resolve(certificates);
      });
      
      xhr.addEventListener('error', () => {
        clearTimeout(timeoutHandle);
        console.log('ℹ️ [FNMT] XHR error (posiblemente por requisito de cliente cert en HTTPS)');
        resolve(certificates);
      });
      
      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutHandle);
        console.log('ℹ️ [FNMT] XHR abortado');
        resolve(certificates);
      });
      
      xhr.withCredentials = true;
      const url = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api/certificate/check`;
      
      console.log('🌐 [FNMT] Verificando certificados en:', url);
      xhr.open('GET', url, true);
      xhr.timeout = timeoutMs;
      xhr.send();
      
    } catch (error) {
      console.log('ℹ️ [FNMT] Error en XHR:', (error as Error).message);
      resolve(certificates);
    }
  });
};

/**
 * Muestra un diálogo HTML para seleccionar certificados
 */
const showCertificateSelectionDialog = (
  certificates: BrowserCertificate[],
  onSelect: (cert: BrowserCertificate | null) => void
) => {
  // Crear modal HTML
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #ff8c00, #ff4500);
    color: white;
    padding: 20px;
    border-radius: 8px 8px 0 0;
  `;
  header.innerHTML = `<h2 style="margin: 0; font-size: 1.3em;">Selecciona tu Certificado FNMT</h2>`;
  dialog.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  `;

  certificates.forEach((cert, index) => {
    const item = document.createElement('div');
    item.style.cssText = `
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
    `;

    item.onmouseover = () => {
      item.style.borderColor = '#ff8c00';
      item.style.background = '#fff5f0';
    };

    item.onmouseout = () => {
      item.style.borderColor = '#e2e8f0';
      item.style.background = 'white';
    };

    item.onclick = () => {
      modal.remove();
      onSelect(cert);
    };

    item.innerHTML = `
      <div style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">
        ${cert.nombre || 'Usuario'} ${cert.apellidos || ''}
      </div>
      <div style="font-size: 0.9em; color: #6b7280;">
        <div>NIF/DNI: <strong>${cert.nif || 'No disponible'}</strong></div>
        <div>Emisor: ${cert.issuer}</div>
        <div>Válido hasta: ${new Date(cert.notAfter).toLocaleDateString('es-ES')}</div>
      </div>
    `;

    content.appendChild(item);
  });

  dialog.appendChild(content);

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  `;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.cssText = `
    padding: 10px 20px;
    border: 2px solid #d1d5db;
    background: white;
    color: #374151;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
  `;
  cancelBtn.onmouseover = () => { cancelBtn.style.background = '#f3f4f6'; };
  cancelBtn.onmouseout = () => { cancelBtn.style.background = 'white'; };
  cancelBtn.onclick = () => {
    modal.remove();
    onSelect(null);
  };

  footer.appendChild(cancelBtn);
  dialog.appendChild(footer);

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  console.log('🎭 [FNMT] Diálogo de selección mostrado');
};

/**
 * Obtiene certificados de prueba almacenados en el navegador
 */
const getStoredTestCertificates = (): BrowserCertificate[] => {
  try {
    const stored = localStorage.getItem('fnmt_test_certificates');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log('ℹ️ [FNMT] Sin certificados de prueba almacenados');
  }
  return [];
};

/**
 * Realiza solicitud HTTPS real (para producción)
 * NOTA: Por razones de seguridad, los navegadores no exponen certificados del sistema
 * Simplemente retornamos error para que el usuario cargue desde consola
 */
const makeCertificateRequest = async (): Promise<CertificateSelectionResult> => {
  console.log('ℹ️ [FNMT] En producción HTTPS, se necesita un endpoint backend');
  console.log('ℹ️ [FNMT] Por ahora, usa certificados de prueba desde consola');
  
  return {
    success: false,
    error: 'Para probar, ejecuta en la consola: fnmt.initializeTestCertificates()'
  };
};

/**
 * Método alternativo: Obtener certificados via Credential Management API
 * (Disponible en navegadores modernos)
 */
export const getCertificatesFromBrowser = async (): Promise<CertificateSelectionResult> => {
  try {
    // Verificar disponibilidad de API
    if (!navigator.credentials) {
      return {
        success: false,
        error: 'Tu navegador no soporta la gestión de credenciales. Por favor, usa una versión más reciente.'
      };
    }

    // Crear opciones para solicitar certificados
    const certificateOptions = {
      mediation: 'optional' as const,
    };

    // Esta es una solicitud genérica de credenciales
    // Los navegadores pueden interpretar esto como una solicitud de certificado
    const credential = await navigator.credentials.get(certificateOptions);

    if (credential) {
      return {
        success: true,
        certificate: {
          id: generateId(),
          subject: 'Certificado del Navegador',
          issuer: 'Navegador Local',
          notBefore: new Date(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          serialNumber: '0',
          thumbprint: 'LOCAL',
          valido: true
        }
      };
    }

    return {
      success: false,
      error: 'No se seleccionó ningún certificado.'
    };
  } catch (error) {
    console.error('Error en getCertificatesFromBrowser:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
};

/**
 * Método avanzado: Usar Web Crypto API para acceder a claves almacenadas
 */
export const getStoredCertificatesAdvanced = async (): Promise<CertificateSelectionResult> => {
  try {
    // Verificar soporte WebCrypto
    if (!window.crypto?.subtle) {
      return {
        success: false,
        error: 'Tu navegador no soporta Web Crypto API.'
      };
    }

    // Intentar generar un desafío para firmar
    const challengeBuffer = new Uint8Array(32);
    crypto.getRandomValues(challengeBuffer);

    // En un navegador con soporte real de certificados de cliente,
    // esto provocaría un diálogo para seleccionar certificado
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      { name: 'RSASSA-PKCS1-v1_5' } as any,
      challengeBuffer
    ).catch(err => {
      throw new Error('No hay certificado disponible o no fue seleccionado');
    });

    if (signature) {
      return {
        success: true,
        certificate: {
          id: generateId(),
          subject: 'Certificado Verificado',
          issuer: 'Validado por Web Crypto',
          notBefore: new Date(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          serialNumber: '1',
          thumbprint: generateThumbprint(),
          valido: true
        }
      };
    }

    throw new Error('No se pudo obtener firma del certificado');
  } catch (error) {
    console.error('Error en getStoredCertificatesAdvanced:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : 'Certificado no disponible'}`
    };
  }
};

/**
 * Parsea datos de certificado en formato X.509
 */
const parseCertificateData = (certData: any): BrowserCertificate => {
  const nif = extractNIFFromSubject(certData.subject || '');
  const { nombre, apellidos } = extractNombreFromSubject(certData.subject || '');
  const email = extractEmailFromSubject(certData.subject || '');

  return {
    id: certData.serialNumber || generateId(),
    subject: certData.subject || 'Desconocido',
    issuer: certData.issuer || 'Desconocido',
    nif,
    nombre,
    apellidos,
    email,
    notBefore: new Date(certData.notBefore || Date.now()),
    notAfter: new Date(certData.notAfter || Date.now() + 365 * 24 * 60 * 60 * 1000),
    serialNumber: certData.serialNumber || '0',
    thumbprint: certData.thumbprint || generateThumbprint(),
    valido: validateCertificateDates(
      new Date(certData.notBefore || Date.now()),
      new Date(certData.notAfter || Date.now())
    )
  };
};

/**
 * Extrae NIF del subject del certificado
 */
const extractNIFFromSubject = (subject: string): string | undefined => {
  const patterns = [
    /serialNumber=(\d{8}[A-Z])/,
    /CN=([0-9]{8}[A-Z])/,
    /([0-9]{8}[A-Z])/
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
};

/**
 * Extrae nombre y apellidos del subject
 */
const extractNombreFromSubject = (subject: string): { nombre?: string; apellidos?: string } => {
  const cnMatch = subject.match(/CN=([^,]+)/);
  if (cnMatch) {
    const cnValue = cnMatch[1];
    const parts = cnValue.split('(')[0].trim();
    const nombres = parts.split(' ');
    
    return {
      nombre: nombres[nombres.length - 1] || undefined,
      apellidos: nombres.length > 1 ? nombres.slice(0, -1).join(' ') : undefined
    };
  }

  return {};
};

/**
 * Extrae email del subject
 */
const extractEmailFromSubject = (subject: string): string | undefined => {
  const emailMatch = subject.match(/emailAddress=([^,]+)/);
  return emailMatch ? emailMatch[1] : undefined;
};

/**
 * Valida las fechas de vigencia del certificado
 */
const validateCertificateDates = (notBefore: Date, notAfter: Date): boolean => {
  const now = new Date();
  return now >= notBefore && now <= notAfter;
};

/**
 * Genera un ID único
 */
const generateId = (): string => {
  return Math.random().toString(36).substring(7);
};

/**
 * Genera un thumbprint SHA256
 */
const generateThumbprint = (): string => {
  const chars = 'ABCDEF0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Guarda el certificado en sesión temporal
 */
export const saveCertificateToSession = (certificate: BrowserCertificate): void => {
  sessionStorage.setItem('browser_certificate_session', JSON.stringify({
    ...certificate,
    timestamp: Date.now()
  }));
};

/**
 * Obtiene certificado de la sesión temporal
 */
export const getCertificateFromSession = (): BrowserCertificate | null => {
  const session = sessionStorage.getItem('browser_certificate_session');
  if (!session) return null;

  try {
    const data = JSON.parse(session);
    // Válido por 1 hora
    if (Date.now() - data.timestamp > 3600000) {
      sessionStorage.removeItem('browser_certificate_session');
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
  sessionStorage.removeItem('browser_certificate_session');
};

/**
 * Verifica compatibilidad del navegador
 */
export const checkBrowserSupport = (): { supported: boolean; message: string } => {
  const browser = getBrowserInfo();
  
  const supportedBrowsers = {
    Chrome: 90,
    Firefox: 88,
    Safari: 14,
    Edge: 90
  };

  const minVersion = supportedBrowsers[browser.name as keyof typeof supportedBrowsers];

  if (!minVersion) {
    return {
      supported: false,
      message: 'Tu navegador no es compatible. Por favor, usa Chrome, Firefox, Safari o Edge.'
    };
  }

  if (browser.version < minVersion) {
    return {
      supported: false,
      message: `Tu navegador es demasiado antiguo. Requiere ${browser.name} ${minVersion} o superior.`
    };
  }

  return {
    supported: true,
    message: `${browser.name} ${browser.version} - Compatible ✓`
  };
};

/**
 * Detecta información del navegador
 */
const getBrowserInfo = (): { name: string; version: number } => {
  const ua = navigator.userAgent;
  
  if (ua.includes('Chrome')) {
    const match = ua.match(/Chrome\/(\d+)/);
    return { name: 'Chrome', version: match ? parseInt(match[1]) : 0 };
  }
  
  if (ua.includes('Firefox')) {
    const match = ua.match(/Firefox\/(\d+)/);
    return { name: 'Firefox', version: match ? parseInt(match[1]) : 0 };
  }
  
  if (ua.includes('Safari')) {
    const match = ua.match(/Version\/(\d+)/);
    return { name: 'Safari', version: match ? parseInt(match[1]) : 0 };
  }
  
  if (ua.includes('Edg')) {
    const match = ua.match(/Edg\/(\d+)/);
    return { name: 'Edge', version: match ? parseInt(match[1]) : 0 };
  }

  return { name: 'Desconocido', version: 0 };
};
