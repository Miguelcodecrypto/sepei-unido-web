# Guía: Implementación de mTLS con Cloudflare Workers + Cloudflare Access

## 📋 Descripción General

Esta guía detalla cómo implementar autenticación mTLS (Mutual TLS) usando **Cloudflare Workers** como backend y **Cloudflare Access** para la validación de certificados de cliente FNMT.

### Ventajas de esta solución:
- ✅ **Sin servidor propio**: Todo en infraestructura de Cloudflare
- ✅ **Escalable**: Cloudflare Workers escala automáticamente
- ✅ **Global**: Edge computing en +200 ubicaciones
- ✅ **Seguro**: Validación de certificados en el edge
- ✅ **Compatible con Vercel**: Frontend en Vercel, backend en Workers
- ✅ **Fácil despliegue**: CLI de Cloudflare (Wrangler)

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│  Usuario Final  │
│  (Navegador)    │
└────────┬────────┘
         │ HTTPS + Client Cert
         │
         ▼
┌─────────────────────────┐
│  Cloudflare Access      │ ◄── Valida certificado FNMT
│  (mTLS Gateway)         │     - Verifica CA raíz FNMT
└────────┬────────────────┘     - Extrae datos del cert
         │ X-Client-Cert header
         │
         ▼
┌─────────────────────────┐
│  Cloudflare Worker      │ ◄── Procesa certificado
│  (Backend Logic)        │     - Parsea X.509
└────────┬────────────────┘     - Valida NIF/nombre
         │ JSON response         - Verifica fecha
         │
         ▼
┌─────────────────────────┐
│  Frontend (Vercel)      │ ◄── Recibe datos del cert
│  React App              │     - Muestra info al usuario
└─────────────────────────┘     - Completa registro
```

---

## 📦 Paso 1: Configuración de Cloudflare Access con mTLS

### 1.1 Requisitos
- ✅ Cuenta de Cloudflare (plan Pro o superior para mTLS)
- ✅ Dominio configurado en Cloudflare (`sepeiunido.org`)
- ✅ Certificado raíz de la FNMT

### 1.2 Descargar certificado raíz FNMT

```bash
# Descargar el certificado raíz de la FNMT (AC Raíz FNMT-RCM)
curl -o fnmt-root-ca.crt https://www.sede.fnmt.gob.es/documents/11614/161615/AC+Raiz+FNMT-RCM.crt
```

O descárgalo manualmente desde:
- **URL**: https://www.sede.fnmt.gob.es/certificados/
- **Nombre**: AC Raíz FNMT-RCM
- **Formato**: CRT (X.509)

### 1.3 Configurar Cloudflare Access

#### A) Acceder a Cloudflare Dashboard
1. Ve a tu dashboard de Cloudflare
2. Selecciona tu dominio `sepeiunido.org`
3. Ve a **Zero Trust** → **Access** → **Applications**

#### B) Crear nueva aplicación con mTLS
1. Clic en **"Add an application"**
2. Selecciona **"Self-hosted"**
3. Configura:

```yaml
Application name: SEPEI UNIDO - mTLS Auth
Subdomain: api-mtls
Domain: sepeiunido.org
Full URL: https://api-mtls.sepeiunido.org
```

#### C) Configurar política de acceso
1. En **"Add a policy"**:

```yaml
Policy name: FNMT Certificate Required
Action: Allow
Include:
  - Selector: Common Name
    Value: * (todos los certificados FNMT válidos)
```

2. En **"Authentication"** tab:
   - Marca **"Require mTLS certificate"**
   - Sube el certificado raíz FNMT (`fnmt-root-ca.crt`)

#### D) Configurar Headers
En **"Settings"** → **"HTTP Headers"**:

```yaml
Enable: ✓ Forward Client Certificate information
Headers to forward:
  - Cf-Access-Client-Cert-Subject
  - Cf-Access-Client-Cert-Issuer
  - Cf-Access-Client-Cert-Serial
  - Cf-Access-Client-Cert-Fingerprint
  - Cf-Access-Client-Cert-NotBefore
  - Cf-Access-Client-Cert-NotAfter
```

---

## 🛠️ Paso 2: Crear Cloudflare Worker

### 2.1 Instalar Wrangler (CLI de Cloudflare)

```bash
npm install -g wrangler

# Login a tu cuenta de Cloudflare
wrangler login
```

### 2.2 Crear proyecto Worker

```bash
# Crear directorio para el worker
mkdir cloudflare-mtls-worker
cd cloudflare-mtls-worker

# Inicializar proyecto
wrangler init sepei-mtls-auth

# Responder a las preguntas:
# ✓ Would you like to use TypeScript? Yes
# ✓ Would you like to use git? Yes
# ✓ Would you like to deploy? No (por ahora)
```

### 2.3 Configurar `wrangler.toml`

```toml
name = "sepei-mtls-auth"
main = "src/index.ts"
compatibility_date = "2024-11-22"
node_compat = true

[env.production]
name = "sepei-mtls-auth"
route = "api-mtls.sepeiunido.org/*"

[[env.production.kv_namespaces]]
binding = "CERTIFICATES"
id = "tu_kv_namespace_id"

[vars]
ALLOWED_ORIGINS = "https://www.sepeiunido.org,http://localhost:5173"
```

### 2.4 Implementar Worker (`src/index.ts`)

Crearé el archivo completo del Worker a continuación...

---

## 🔐 Paso 3: Worker de Autenticación mTLS

### Archivo: `src/index.ts`

```typescript
/**
 * Cloudflare Worker para autenticación mTLS con certificados FNMT
 * Procesa certificados de cliente validados por Cloudflare Access
 */

export interface Env {
  CERTIFICATES: KVNamespace;
  ALLOWED_ORIGINS: string;
}

interface CertificateData {
  nif: string;
  nombre: string;
  apellidos: string;
  email?: string;
  organizacion?: string;
  validFrom: string;
  validTo: string;
  valido: boolean;
  serialNumber: string;
  fingerprint: string;
  issuer: string;
  commonName: string;
  authenticatedAt: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': getAllowedOrigin(request, env.ALLOWED_ORIGINS),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Rutas disponibles
    switch (url.pathname) {
      case '/auth/certificate':
        return handleCertificateAuth(request, env, corsHeaders);
      
      case '/auth/verify':
        return handleVerifyCertificate(request, env, corsHeaders);
      
      case '/health':
        return new Response('OK', { headers: corsHeaders });
      
      default:
        return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
    }
  },
};

/**
 * Autenticar con certificado de cliente (mTLS)
 */
async function handleCertificateAuth(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Verificar método HTTP
    if (request.method !== 'POST' && request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Extraer headers del certificado (enviados por Cloudflare Access)
    const certSubject = request.headers.get('Cf-Access-Client-Cert-Subject');
    const certIssuer = request.headers.get('Cf-Access-Client-Cert-Issuer');
    const certSerial = request.headers.get('Cf-Access-Client-Cert-Serial');
    const certFingerprint = request.headers.get('Cf-Access-Client-Cert-Fingerprint');
    const certNotBefore = request.headers.get('Cf-Access-Client-Cert-NotBefore');
    const certNotAfter = request.headers.get('Cf-Access-Client-Cert-NotAfter');

    // Validar que el certificado está presente
    if (!certSubject || !certIssuer) {
      return jsonResponse({
        success: false,
        error: 'No se encontró certificado de cliente',
        message: 'Por favor, proporciona un certificado FNMT válido',
      }, 401, corsHeaders);
    }

    // Parsear certificado
    const certificate = parseFNMTCertificate({
      subject: certSubject,
      issuer: certIssuer,
      serial: certSerial || '',
      fingerprint: certFingerprint || '',
      notBefore: certNotBefore || '',
      notAfter: certNotAfter || '',
    });

    // Validar certificado
    if (!certificate.valido) {
      return jsonResponse({
        success: false,
        error: 'Certificado expirado o inválido',
        certificate,
      }, 403, corsHeaders);
    }

    if (!certificate.nif) {
      return jsonResponse({
        success: false,
        error: 'No se encontró NIF en el certificado',
        certificate,
      }, 400, corsHeaders);
    }

    // Verificar si el certificado ya está registrado
    const isRegistered = await isCertificateRegistered(certificate.fingerprint, env.CERTIFICATES);
    
    if (isRegistered) {
      return jsonResponse({
        success: false,
        error: 'Este certificado ya está registrado en el sistema',
        certificate,
      }, 409, corsHeaders);
    }

    // Guardar información del certificado en KV (temporal)
    await saveCertificateSession(certificate, env.CERTIFICATES);

    // Retornar datos del certificado
    return jsonResponse({
      success: true,
      method: 'mtls',
      message: 'Certificado validado correctamente',
      certificate,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Error en autenticación mTLS:', error);
    return jsonResponse({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
    }, 500, corsHeaders);
  }
}

/**
 * Verificar certificado existente
 */
async function handleVerifyCertificate(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const { fingerprint } = await request.json();

    if (!fingerprint) {
      return jsonResponse({ error: 'Fingerprint requerido' }, 400, corsHeaders);
    }

    const isRegistered = await isCertificateRegistered(fingerprint, env.CERTIFICATES);

    return jsonResponse({
      success: true,
      registered: isRegistered,
    }, 200, corsHeaders);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Error al verificar certificado',
    }, 500, corsHeaders);
  }
}

/**
 * Parsear certificado FNMT desde headers de Cloudflare Access
 */
function parseFNMTCertificate(headers: {
  subject: string;
  issuer: string;
  serial: string;
  fingerprint: string;
  notBefore: string;
  notAfter: string;
}): CertificateData {
  // Parsear Subject (contiene NIF, nombre, apellidos)
  const subjectFields = parseDistinguishedName(headers.subject);
  
  // Extraer NIF del SerialNumber o CN
  const nif = extractNIF(subjectFields);
  
  // Extraer nombre y apellidos
  const { nombre, apellidos } = extractNombreApellidos(subjectFields);
  
  // Parsear fechas
  const validFrom = headers.notBefore;
  const validTo = headers.notAfter;
  const now = new Date();
  const notBefore = new Date(validFrom);
  const notAfter = new Date(validTo);
  const valido = now >= notBefore && now <= notAfter;

  return {
    nif,
    nombre,
    apellidos,
    email: subjectFields.emailAddress || subjectFields.E,
    organizacion: subjectFields.O,
    validFrom,
    validTo,
    valido,
    serialNumber: headers.serial,
    fingerprint: headers.fingerprint,
    issuer: headers.issuer,
    commonName: subjectFields.CN || '',
    authenticatedAt: new Date().toISOString(),
  };
}

/**
 * Parsear Distinguished Name (DN) formato X.509
 * Ejemplo: "CN=NOMBRE APELLIDO1 APELLIDO2 - 12345678Z,OU=...,O=FNMT,C=ES"
 */
function parseDistinguishedName(dn: string): Record<string, string> {
  const fields: Record<string, string> = {};
  
  // Split por comas, pero respetando valores escapados
  const parts = dn.split(/,(?![^=]+=)/);
  
  parts.forEach(part => {
    const [key, ...valueParts] = part.split('=');
    const value = valueParts.join('=').trim();
    fields[key.trim()] = value;
  });
  
  return fields;
}

/**
 * Extraer NIF del certificado FNMT
 */
function extractNIF(fields: Record<string, string>): string {
  // El NIF puede estar en:
  // 1. SerialNumber
  // 2. CN (Common Name) - formato: "NOMBRE APELLIDO1 APELLIDO2 - 12345678Z"
  // 3. UID
  
  // Intentar desde SerialNumber
  if (fields.serialNumber) {
    const match = fields.serialNumber.match(/\d{8}[A-Z]/);
    if (match) return match[0];
  }
  
  // Intentar desde CN
  if (fields.CN) {
    const match = fields.CN.match(/\d{8}[A-Z]/);
    if (match) return match[0];
  }
  
  // Intentar desde UID
  if (fields.UID) {
    const match = fields.UID.match(/\d{8}[A-Z]/);
    if (match) return match[0];
  }
  
  return '';
}

/**
 * Extraer nombre y apellidos del CN
 */
function extractNombreApellidos(fields: Record<string, string>): {
  nombre: string;
  apellidos: string;
} {
  const cn = fields.CN || '';
  
  // Formato típico: "NOMBRE APELLIDO1 APELLIDO2 - NIF"
  const parts = cn.split(' - ')[0].trim().split(' ');
  
  if (parts.length === 0) {
    return { nombre: '', apellidos: '' };
  }
  
  if (parts.length === 1) {
    return { nombre: parts[0], apellidos: '' };
  }
  
  // Primer palabra = nombre, resto = apellidos
  const nombre = parts[0];
  const apellidos = parts.slice(1).join(' ');
  
  return { nombre, apellidos };
}

/**
 * Verificar si un certificado ya está registrado
 */
async function isCertificateRegistered(
  fingerprint: string,
  kv: KVNamespace
): Promise<boolean> {
  const key = `cert:${fingerprint}`;
  const exists = await kv.get(key);
  return exists !== null;
}

/**
 * Guardar sesión de certificado (temporal, 1 hora)
 */
async function saveCertificateSession(
  certificate: CertificateData,
  kv: KVNamespace
): Promise<void> {
  const key = `session:${certificate.fingerprint}`;
  await kv.put(key, JSON.stringify(certificate), {
    expirationTtl: 3600, // 1 hora
  });
}

/**
 * Obtener origen permitido para CORS
 */
function getAllowedOrigin(request: Request, allowedOrigins: string): string {
  const origin = request.headers.get('Origin');
  
  if (!origin) {
    return allowedOrigins.split(',')[0]; // Primer origen por defecto
  }
  
  const allowed = allowedOrigins.split(',').map(o => o.trim());
  
  if (allowed.includes(origin)) {
    return origin;
  }
  
  return allowed[0];
}

/**
 * Helper para respuestas JSON
 */
function jsonResponse(
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
```

---

## 🚀 Paso 4: Desplegar Worker

### 4.1 Crear KV Namespace

```bash
# Crear namespace para almacenar certificados
wrangler kv:namespace create "CERTIFICATES"

# Copiar el ID que te devuelve y actualizar wrangler.toml
```

### 4.2 Configurar secretos

```bash
# Si necesitas API keys adicionales
wrangler secret put FNMT_API_KEY
```

### 4.3 Desplegar a producción

```bash
# Deploy
wrangler deploy

# Verificar que está funcionando
curl https://api-mtls.sepeiunido.org/health
```

---

## 🔌 Paso 5: Integrar en Frontend React

### 5.1 Crear servicio de autenticación

**Archivo**: `src/services/cloudflareAuthService.ts`

```typescript
import type { BrowserCertificate } from './browserCertificateService';

const CLOUDFLARE_MTLS_API = 'https://api-mtls.sepeiunido.org';

export interface CloudflareMTLSResponse {
  success: boolean;
  method: 'mtls';
  message?: string;
  certificate?: BrowserCertificate;
  error?: string;
}

/**
 * Autenticar con certificado mediante Cloudflare mTLS
 * El navegador mostrará automáticamente el diálogo de selección de certificado
 */
export async function authenticateWithCloudflare(): Promise<CloudflareMTLSResponse> {
  try {
    console.log('🔐 [Cloudflare mTLS] Iniciando autenticación...');

    const response = await fetch(`${CLOUDFLARE_MTLS_API}/auth/certificate`, {
      method: 'POST',
      credentials: 'include', // Envía certificado de cliente
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error en autenticación:', data);
      return {
        success: false,
        method: 'mtls',
        error: data.error || 'Error en autenticación',
      };
    }

    console.log('✅ [Cloudflare mTLS] Autenticación exitosa');
    return data;

  } catch (error) {
    console.error('❌ Error de red:', error);
    return {
      success: false,
      method: 'mtls',
      error: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Verificar si el servidor tiene mTLS configurado
 */
export async function checkCloudflareSupport(): Promise<boolean> {
  try {
    const response = await fetch(`${CLOUDFLARE_MTLS_API}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Verificar si un certificado ya está registrado
 */
export async function verifyCertificateRegistration(fingerprint: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLOUDFLARE_MTLS_API}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fingerprint }),
    });

    const data = await response.json();
    return data.registered === true;

  } catch {
    return false;
  }
}
```

### 5.2 Actualizar componente CertificateUpload

```typescript
// En CertificateUpload.tsx, agregar:
import { authenticateWithCloudflare } from '../services/cloudflareAuthService';

// Handler para mTLS con Cloudflare
const handleCloudflareAuth = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const result = await authenticateWithCloudflare();

    if (!result.success || !result.certificate) {
      setError(result.error || 'Error en autenticación con Cloudflare');
      setIsLoading(false);
      return;
    }

    // Validar certificado
    if (!result.certificate.valido) {
      setError('El certificado está expirado o no es válido');
      setIsLoading(false);
      return;
    }

    setCertificateData(result.certificate);
    setStep('verification');
  } catch (err) {
    setError(`Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 📝 Paso 6: Pruebas

### 6.1 Prueba local

```bash
# Ejecutar worker localmente
wrangler dev

# En otra terminal, probar con curl
curl http://localhost:8787/health
```

### 6.2 Prueba con certificado de prueba

```bash
# Generar certificado de prueba para desarrollo
openssl req -x509 -newkey rsa:2048 -keyout test-key.pem -out test-cert.pem -days 365 -nodes \
  -subj "/CN=JUAN PEREZ GARCIA - 12345678Z/O=FNMT/C=ES"

# Probar con certificado
curl --cert test-cert.pem --key test-key.pem \
  https://api-mtls.sepeiunido.org/auth/certificate
```

### 6.3 Prueba en navegador

1. Navega a `https://www.sepeiunido.org`
2. Haz clic en "Autenticar con certificado"
3. El navegador debe mostrar el diálogo de selección de certificado
4. Selecciona tu certificado FNMT
5. Verifica que se muestran tus datos correctamente

---

## 💰 Costos Estimados

### Cloudflare Workers
- **Plan Free**: 100,000 requests/día GRATIS
- **Plan Paid** ($5/mes): 10 millones requests/mes

### Cloudflare Access (mTLS)
- **Plan Zero Trust Free**: 50 usuarios GRATIS
- **Plan Zero Trust Standard** ($7/usuario/mes): Usuarios ilimitados

**Estimación para SEPEI UNIDO**:
- Usuarios esperados: < 1,000
- Requests/mes: < 100,000
- **Costo total**: $0 (plan gratuito suficiente)

---

## 🔒 Seguridad

### Mejores prácticas implementadas:

1. ✅ **Validación de certificado en edge** (Cloudflare Access)
2. ✅ **CORS configurado** (solo orígenes permitidos)
3. ✅ **Rate limiting** (incluido en Cloudflare)
4. ✅ **Sesiones temporales** (KV con TTL de 1 hora)
5. ✅ **No se almacenan claves privadas** (solo datos públicos del cert)
6. ✅ **HTTPS obligatorio** (Cloudflare SSL)
7. ✅ **Logs auditables** (Cloudflare Analytics)

---

## 📚 Recursos Adicionales

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Cloudflare Access Docs**: https://developers.cloudflare.com/cloudflare-one/
- **FNMT Certificados**: https://www.sede.fnmt.gob.es/certificados/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

---

## ✅ Checklist de Implementación

- [ ] Cuenta de Cloudflare creada
- [ ] Dominio `sepeiunido.org` en Cloudflare
- [ ] Certificado raíz FNMT descargado
- [ ] Cloudflare Access configurado
- [ ] Política mTLS creada
- [ ] Worker implementado (`src/index.ts`)
- [ ] KV namespace creado
- [ ] Worker desplegado
- [ ] Servicio frontend creado (`cloudflareAuthService.ts`)
- [ ] Componente actualizado
- [ ] Pruebas realizadas
- [ ] Documentación actualizada

---

## 🐛 Troubleshooting

### Problema: "No se encontró certificado de cliente"
**Solución**: Verifica que Cloudflare Access está correctamente configurado y que los headers se están reenviando.

### Problema: "Certificate verification failed"
**Solución**: Asegúrate de que el certificado raíz FNMT está correctamente cargado en Cloudflare Access.

### Problema: "CORS error"
**Solución**: Verifica que `ALLOWED_ORIGINS` en `wrangler.toml` incluye tu dominio.

### Problema: Worker no responde
**Solución**: Verifica que la ruta en Cloudflare Access apunta correctamente al Worker.

---

## 📧 Soporte

Para problemas específicos de implementación, contacta con:
- **Cloudflare Support**: https://support.cloudflare.com/
- **Documentación FNMT**: https://www.sede.fnmt.gob.es/
