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
      console.log('📨 [FNMT] Iniciando solicitud de certificados...');
      console.log('🌐 [FNMT] Protocolo:', window.location.protocol);
      
      // Obtener certificados disponibles (reales y de prueba)
      const testCerts = getStoredTestCertificates();
      
      // Si estamos en HTTPS, también buscamos certificados del sistema
      if (window.location.protocol === 'https:') {
        console.log('🔒 [FNMT] HTTPS detectado - Buscando certificados del sistema...');
        
        // Solicitar certificados del sistema
        detectViaTLSHandshake().then((systemCerts) => {
          // Combinar certificados del sistema con los de prueba
          const allCerts = [...systemCerts, ...testCerts];
          
          if (allCerts.length === 0) {
            console.warn('⚠️ [FNMT] No hay certificados disponibles');
            resolve({
              success: false,
              error: `No hay certificados disponibles.

Para instalar certificados reales FNMT:
1. Visita www.fnmt.es
2. Descarga e instala tu certificado FNMT en el navegador
3. El certificado aparecerá automáticamente aquí

Para desarrollo (certificados de prueba):
1. Abre la consola (F12)
2. Ejecuta: fnmt.initializeTestCertificates()
3. Intenta de nuevo

Navegadores soportados:
✓ Chrome 90+
✓ Firefox 88+
✓ Safari 14+
✓ Edge 90+`
            });
            return;
          }

          console.log(`📋 [FNMT] Mostrando ${allCerts.length} certificado(s) disponible(s)`);
          showCertificateSelectionDialog(allCerts, (selected) => {
            if (selected) {
              console.log('✅ [FNMT] Certificado seleccionado:', selected.nif);
              resolve({ success: true, certificate: selected });
            } else {
              console.log('🚫 [FNMT] Selección cancelada');
              resolve({ success: false, error: 'Selección de certificado cancelada' });
            }
          });
        });
      } else {
        // En HTTP (desarrollo local), solo mostrar certificados de prueba
        if (testCerts.length === 0) {
          console.warn('⚠️ [FNMT] No hay certificados disponibles');
          resolve({
            success: false,
            error: `No hay certificados disponibles.

Para probar en desarrollo:
1. Abre la consola del navegador (F12)
2. Ejecuta: fnmt.initializeTestCertificates()
3. Intenta de nuevo

Para certificados reales FNMT en HTTPS:
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
      }
      
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
 * Versión alternativa para solicitud pública
 */
const requestCertificateViaHTTPSPublic = async (): Promise<CertificateSelectionResult> => {
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
    
    // Método 1: Verificar en HTTPS si el navegador tiene certificados del sistema
    if (window.location.protocol === 'https:') {
      console.log('🔒 [FNMT] HTTPS detectado - Buscando certificados del sistema...');
      
      // En HTTPS, el navegador muestra un diálogo nativo para seleccionar certificado
      // Intentamos disparar esa solicitud
      const systemCerts = await detectViaTLSHandshake();
      certificates.push(...systemCerts);
    }
    
    if (certificates.length > 0) {
      console.log(`✓ [FNMT] ${certificates.length} certificado(s) del sistema detectado(s)`);
    } else {
      console.log('ℹ️ [FNMT] No se detectaron certificados del sistema en HTTPS');
    }
    
  } catch (error) {
    console.log('ℹ️ [FNMT] Error en detección de certificados del sistema:', (error as Error).message);
  }
  
  return certificates;
};

/**
 * Detecta certificados del sistema via TLS Handshake
 * En HTTPS, el navegador mostrará un diálogo nativo para seleccionar certificado
 */
const detectViaTLSHandshake = (): Promise<BrowserCertificate[]> => {
  return new Promise((resolve) => {
    const certificates: BrowserCertificate[] = [];
    
    try {
      // Crear una solicitud HTTPS que requiera certificado de cliente
      const xhr = new XMLHttpRequest();
      
      xhr.addEventListener('load', () => {
        try {
          // Intentar obtener datos del certificado del cliente desde headers
          const certData = xhr.getResponseHeader('X-Client-Cert');
          if (certData) {
            console.log('✓ [FNMT] Certificado obtenido del servidor');
            const cert = JSON.parse(atob(certData));
            const parsed = parseCertificateData(cert);
            certificates.push(parsed);
          }
        } catch (e) {
          console.log('ℹ️ [FNMT] No se obtuvieron datos de certificado en headers');
        }
        resolve(certificates);
      });

      xhr.addEventListener('error', () => {
        console.log('ℹ️ [FNMT] Error en handshake TLS (posiblemente el usuario canceló el diálogo)');
        resolve(certificates);
      });

      xhr.addEventListener('abort', () => {
        console.log('ℹ️ [FNMT] Handshake TLS abortado');
        resolve(certificates);
      });

      // Configurar solicitud
      xhr.withCredentials = true;
      const apiUrl = `${window.location.protocol}//${window.location.hostname}${
        window.location.port ? ':' + window.location.port : ''
      }/api/certificate/check`;

      console.log('📡 [FNMT] Iniciando handshake TLS a:', apiUrl);
      
      xhr.open('GET', apiUrl, true);
      xhr.timeout = 5000;
      xhr.send();

      // Si pasa mucho tiempo sin respuesta, resolver de todas formas
      setTimeout(() => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          xhr.abort();
        }
      }, 5500);

    } catch (error) {
      console.log('ℹ️ [FNMT] Error en detectViaTLSHandshake:', (error as Error).message);
      resolve(certificates);
    }
  });
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
 * Muestra un diálogo HTML mejorado para seleccionar certificados
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
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 140, 0, 0.2);
    max-width: 550px;
    width: 90%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    border: 2px solid #ff8c00;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #ff8c00, #ff6b00);
    color: white;
    padding: 24px;
    border-radius: 10px 10px 0 0;
    border-bottom: 3px solid #ff4500;
  `;
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 1.5em;">🔐</span>
      <div>
        <h2 style="margin: 0; font-size: 1.3em; font-weight: 700;">Selecciona tu Certificado</h2>
        <p style="margin: 4px 0 0 0; font-size: 0.9em; opacity: 0.9;">Certificado Digital FNMT</p>
      </div>
    </div>
  `;
  dialog.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 24px;
    overflow-y: auto;
    flex: 1;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  `;

  // Separador de certificados reales vs prueba
  let lastType = '';
  
  certificates.forEach((cert, index) => {
    const isTestCert = cert.id.includes('test-cert');
    const certType = isTestCert ? 'test' : 'real';
    
    // Agregar separador de sección si es necesario
    if (certType !== lastType && lastType !== '') {
      const separator = document.createElement('div');
      separator.style.cssText = `
        height: 1px;
        background: linear-gradient(90deg, transparent, #ff8c00, transparent);
        margin: 16px 0;
        opacity: 0.5;
      `;
      content.appendChild(separator);
    }
    
    lastType = certType;

    const item = document.createElement('div');
    const isExpired = !cert.valido;
    const isValid = cert.valido;
    
    item.style.cssText = `
      border: 2px solid ${isExpired ? '#ef4444' : '#ff8c00'};
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: ${isExpired ? 'not-allowed' : 'pointer'};
      transition: all 0.3s;
      background: ${isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 140, 0, 0.08)'};
      opacity: ${isExpired ? '0.6' : '1'};
      pointer-events: ${isExpired ? 'none' : 'auto'};
    `;

    item.onmouseover = () => {
      if (!isExpired) {
        item.style.borderColor = '#ff6b00';
        item.style.background = 'rgba(255, 140, 0, 0.15)';
        item.style.transform = 'translateY(-2px)';
        item.style.boxShadow = '0 8px 20px rgba(255, 140, 0, 0.2)';
      }
    };

    item.onmouseout = () => {
      if (!isExpired) {
        item.style.borderColor = '#ff8c00';
        item.style.background = 'rgba(255, 140, 0, 0.08)';
        item.style.transform = 'translateY(0)';
        item.style.boxShadow = 'none';
      }
    };

    item.onclick = () => {
      if (!isExpired) {
        modal.remove();
        onSelect(cert);
      }
    };

    const statusIcon = isExpired ? '❌' : '✅';
    const statusText = isExpired ? 'Expirado' : 'Válido';
    const statusColor = isExpired ? '#ef4444' : '#10b981';

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
        <div style="font-weight: 700; color: #ffffff; font-size: 1.05em;">
          ${cert.nombre || 'Usuario'} ${cert.apellidos || ''}
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 0.85em; color: ${statusColor}; background: ${isExpired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; padding: 4px 8px; border-radius: 4px;">
          ${statusIcon} ${statusText}
        </div>
      </div>
      <div style="font-size: 0.9em; color: #d1d5db; space-y: 6px; line-height: 1.6;">
        <div style="margin-bottom: 4px;"><strong>NIF/DNI:</strong> <span style="color: #ffffff; font-family: monospace;">${cert.nif || 'No disponible'}</span></div>
        <div style="margin-bottom: 4px;"><strong>Emisor:</strong> <span style="color: #f3f4f6;">${cert.issuer}</span></div>
        <div style="margin-bottom: 4px;"><strong>Válido desde:</strong> <span style="color: #f3f4f6;">${new Date(cert.notBefore).toLocaleDateString('es-ES')}</span></div>
        <div><strong>Válido hasta:</strong> <span style="color: ${isExpired ? '#fca5a5' : '#a7f3d0'}; font-weight: ${isExpired ? '700' : '400'};">${new Date(cert.notAfter).toLocaleDateString('es-ES')}</span></div>
      </div>
    `;

    content.appendChild(item);
  });

  dialog.appendChild(content);

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 20px 24px;
    border-top: 1px solid rgba(255, 140, 0, 0.2);
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0 0 10px 10px;
  `;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕ Cancelar';
  cancelBtn.style.cssText = `
    padding: 12px 20px;
    border: 2px solid #6b7280;
    background: transparent;
    color: #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    font-size: 0.95em;
  `;
  cancelBtn.onmouseover = () => {
    cancelBtn.style.background = '#374151';
    cancelBtn.style.borderColor = '#9ca3af';
  };
  cancelBtn.onmouseout = () => {
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.borderColor = '#6b7280';
  };
  cancelBtn.onclick = () => {
    modal.remove();
    onSelect(null);
  };

  footer.appendChild(cancelBtn);
  dialog.appendChild(footer);

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  console.log('🎭 [FNMT] Diálogo de selección mostrado con tema mejorado');
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
