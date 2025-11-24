// filepath: src/services/cloudflareAuthService.ts
/**
 * Servicio de autenticación mTLS con Cloudflare Workers + Cloudflare Access
 * 
 * Este servicio se comunica con un Cloudflare Worker que actúa como backend
 * para la autenticación mediante certificados de cliente (mTLS).
 * 
 * El flujo es:
 * 1. Usuario hace clic en "Autenticar con certificado"
 * 2. Navegador muestra diálogo de selección de certificado (manejado por Cloudflare Access)
 * 3. Cloudflare Access valida el certificado contra la CA raíz de FNMT
 * 4. Cloudflare Worker recibe los datos del certificado y los procesa
 * 5. Worker retorna los datos parseados al frontend
 */

import type { BrowserCertificate } from './browserCertificateService';

// URL del Cloudflare Worker (cambiar a tu dominio real)
const CLOUDFLARE_MTLS_API = (import.meta as any).env?.PROD 
  ? 'https://api-mtls.sepeiunido.org'
  : 'http://localhost:8787'; // Para desarrollo local con wrangler dev

export interface CloudflareMTLSResponse {
  success: boolean;
  method: 'mtls';
  message?: string;
  certificate?: BrowserCertificate;
  error?: string;
}

/**
 * Autenticar con certificado mediante Cloudflare mTLS
 * 
 * Esta función hace una petición al Cloudflare Worker configurado con mTLS.
 * El navegador mostrará automáticamente el diálogo de selección de certificado
 * si el usuario tiene certificados instalados.
 * 
 * @returns Objeto con el resultado de la autenticación y los datos del certificado
 */
export async function authenticateWithCloudflare(): Promise<CloudflareMTLSResponse> {
  try {
    console.log('🔐 [Cloudflare mTLS] Iniciando autenticación...');
    console.log('🔗 Endpoint:', `${CLOUDFLARE_MTLS_API}/auth/certificate`);

    // Hacer petición al worker
    // credentials: 'include' es crucial para que el navegador envíe el certificado
    const response = await fetch(`${CLOUDFLARE_MTLS_API}/auth/certificate`, {
      method: 'POST',
      credentials: 'include', // ⚠️ CRÍTICO: Envía el certificado de cliente
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);

    // Parsear respuesta
    let data: CloudflareMTLSResponse;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError);
      return {
        success: false,
        method: 'mtls',
        error: 'Error al procesar la respuesta del servidor',
      };
    }

    // Manejar errores HTTP
    if (!response.ok) {
      console.error('❌ Error en autenticación:', {
        status: response.status,
        data,
      });

      // Mensajes específicos según el código de error
      switch (response.status) {
        case 401:
          return {
            success: false,
            method: 'mtls',
            error: 'No se encontró certificado de cliente. Asegúrate de seleccionar tu certificado FNMT cuando el navegador lo solicite.',
          };
        case 403:
          return {
            success: false,
            method: 'mtls',
            error: 'Certificado inválido o expirado. Por favor, renueva tu certificado FNMT.',
          };
        case 409:
          return {
            success: false,
            method: 'mtls',
            error: 'Este certificado ya está registrado en el sistema.',
          };
        default:
          return {
            success: false,
            method: 'mtls',
            error: data.error || `Error del servidor (${response.status})`,
          };
      }
    }

    // Validar estructura de respuesta
    if (!data.certificate) {
      console.error('❌ Respuesta sin certificado:', data);
      return {
        success: false,
        method: 'mtls',
        error: 'El servidor no retornó datos del certificado',
      };
    }

    console.log('✅ [Cloudflare mTLS] Autenticación exitosa');
    console.log('👤 Usuario:', {
      nif: data.certificate.nif,
      nombre: data.certificate.nombre,
      apellidos: data.certificate.apellidos,
    });

    return data;

  } catch (error) {
    console.error('❌ Error de red o inesperado:', error);

    // Mensajes específicos según el tipo de error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        method: 'mtls',
        error: 'No se pudo conectar con el servidor de autenticación. Verifica tu conexión a internet.',
      };
    }

    return {
      success: false,
      method: 'mtls',
      error: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Verificar si el servidor de Cloudflare está disponible y configurado
 * 
 * Útil para mostrar/ocultar la opción de mTLS en la UI según disponibilidad
 * 
 * @returns true si el servidor responde correctamente, false en caso contrario
 */
export async function checkCloudflareSupport(): Promise<boolean> {
  try {
    console.log('🔍 Verificando soporte de Cloudflare mTLS...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(`${CLOUDFLARE_MTLS_API}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isAvailable = response.ok;
    console.log(isAvailable ? '✅ Cloudflare mTLS disponible' : '❌ Cloudflare mTLS no disponible');
    
    return isAvailable;

  } catch (error) {
    console.warn('⚠️ No se pudo verificar soporte de Cloudflare mTLS:', error);
    return false;
  }
}

/**
 * Verificar si un certificado ya está registrado en el sistema
 * 
 * @param fingerprint - Huella digital del certificado (SHA-256)
 * @returns true si el certificado está registrado, false en caso contrario
 */
export async function verifyCertificateRegistration(fingerprint: string): Promise<boolean> {
  try {
    console.log('🔍 Verificando registro de certificado:', fingerprint);

    const response = await fetch(`${CLOUDFLARE_MTLS_API}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fingerprint }),
    });

    if (!response.ok) {
      console.error('❌ Error al verificar certificado:', response.status);
      return false;
    }

    const data = await response.json();
    const isRegistered = data.registered === true;

    console.log(isRegistered ? '✅ Certificado registrado' : '⚠️ Certificado no registrado');
    
    return isRegistered;

  } catch (error) {
    console.error('❌ Error al verificar registro:', error);
    return false;
  }
}

/**
 * Obtener información del certificado actualmente autenticado
 * 
 * Útil para mostrar datos del usuario después de autenticarse
 * 
 * @returns Datos del certificado o null si no hay sesión activa
 */
export async function getCurrentCertificateInfo(): Promise<BrowserCertificate | null> {
  try {
    console.log('🔍 Obteniendo información del certificado actual...');

    const response = await fetch(`${CLOUDFLARE_MTLS_API}/auth/certificate`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('⚠️ No hay sesión activa');
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.certificate) {
      return null;
    }

    console.log('✅ Certificado encontrado');
    return data.certificate;

  } catch (error) {
    console.error('❌ Error al obtener certificado:', error);
    return null;
  }
}

/**
 * Detectar automáticamente el método de autenticación disponible
 * 
 * @returns 'mtls' si Cloudflare está disponible, 'file-upload' si no
 */
export async function detectAuthenticationMethod(): Promise<'mtls' | 'file-upload'> {
  const cloudflareAvailable = await checkCloudflareSupport();
  
  if (cloudflareAvailable) {
    console.log('✅ Usando método: mTLS (Cloudflare)');
    return 'mtls';
  } else {
    console.log('⚠️ Cloudflare no disponible, usando método: file-upload');
    return 'file-upload';
  }
}

/**
 * Test de conectividad completo
 * 
 * Útil para debugging y diagnóstico
 * 
 * @returns Objeto con resultados de las pruebas
 */
export async function runConnectivityTest(): Promise<{
  healthCheck: boolean;
  mtlsEndpoint: boolean;
  verifyEndpoint: boolean;
  latency: number;
}> {
  const startTime = Date.now();

  const results = {
    healthCheck: false,
    mtlsEndpoint: false,
    verifyEndpoint: false,
    latency: 0,
  };

  try {
    // Test 1: Health check
    results.healthCheck = await checkCloudflareSupport();

    // Test 2: mTLS endpoint (esperamos 401 sin certificado, que es correcto)
    try {
      const res = await fetch(`${CLOUDFLARE_MTLS_API}/auth/certificate`, { method: 'POST' });
      results.mtlsEndpoint = res.status === 401 || res.status === 200;
    } catch {
      results.mtlsEndpoint = false;
    }

    // Test 3: Verify endpoint
    try {
      const res = await fetch(`${CLOUDFLARE_MTLS_API}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: 'test' }),
      });
      results.verifyEndpoint = res.ok;
    } catch {
      results.verifyEndpoint = false;
    }

    results.latency = Date.now() - startTime;

  } catch (error) {
    console.error('❌ Error en test de conectividad:', error);
  }

  console.log('📊 Resultados del test:', results);
  return results;
}
