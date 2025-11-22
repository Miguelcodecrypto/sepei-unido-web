# FNMT Digital Certificate Integration

## 📜 Sistema de Verificación de Identidad con Certificados Digitales FNMT

### Descripción General

SEPEI UNIDO ahora requiere la verificación de identidad mediante certificados digitales de la **Fábrica Nacional de Moneda y Timbre (FNMT)** para garantizar la autenticidad de cada usuario registrado.

### ¿Qué es FNMT?

La **FNMT** es el organismo responsable de emitir certificados digitales en España. Un certificado digital FNMT es un documento electrónico que acredita la identidad de una persona con validez legal en España.

### Características de Seguridad Implementadas

✅ **Validación de Certificado Completa**
- Verificación del formato P12/PFX
- Desencriptación segura con contraseña
- Validación de fechas de vigencia
- Verificación de autoridad emisora (FNMT)

✅ **Extracción de Datos Segura**
- NIF/DNI automáticamente validado
- Nombre y apellidos del certificado
- Email registrado en el certificado
- Organización asociada
- Thumbprint único del certificado

✅ **Prevención de Fraude**
- Detección de certificados duplicados
- Validación del formato NIF (algoritmo de verificación)
- Almacenamiento seguro de thumbprint
- Imposibilidad de reutilizar el mismo certificado

✅ **Privacidad Garantizada**
- La contraseña del certificado se procesa solo en el navegador
- Ningún dato sensible se envía a servidores
- Procesamiento 100% local (client-side)

### Flujo de Registro

```
1. Usuario inicia registro en SEPEI UNIDO
   ↓
2. Completa nombre y email
   ↓
3. Hace clic en "Unirme a SEPEI UNIDO"
   ↓
4. Modal de Verificación FNMT aparece
   ↓
5. Usuario carga su certificado (.p12 o .pfx)
   ↓
6. Sistema solicita contraseña del certificado
   ↓
7. Validación de certificado en navegador
   ↓
8. Muestra datos extraídos (NIF, nombre, vigencia)
   ↓
9. Usuario confirma información
   ↓
10. Modal de Términos y Condiciones RGPD
    ↓
11. Usuario acepta términos
    ↓
12. Usuario registrado con identidad verificada
```

### Cómo Obtener un Certificado FNMT

#### Opción 1: Certificado Digital Estándar (Gratuito)

1. Accede a https://www.fnmt.es
2. Haz clic en "Certificados" → "Obtener Certificado"
3. Elige "Certificado de Persona Física"
4. Selecciona el tipo de certificado deseado:
   - **Firma Electrónica y Autenticación** (más común)
   - **Confidencialidad**
5. Completa el formulario con tus datos
6. Elige método de recogida:
   - En línea (recomendado - inmediato)
   - Presencial en oficina
7. Descarga tu certificado en formato P12/PFX
8. Protege tu certificado con una contraseña segura

#### Opción 2: Certificado de Persona Jurídica

Para organizaciones, sindicatos y empresas.
Contacta directamente con FNMT para más información.

### Estructura de Archivos

```
src/
├── services/
│   └── fnmtService.ts              # Servicio de validación FNMT
│       ├── processCertificate()    # Procesa y valida certificados
│       ├── isValidNIF()            # Valida NIF español
│       ├── isCertificateRegistered() # Previene duplicados
│       └── getCertificateFromSession() # Sesión temporal
│
├── components/
│   └── CertificateUpload.tsx        # UI para carga de certificados
│       ├── Step 1: Upload (carga archivo)
│       ├── Step 2: Password (contraseña)
│       └── Step 3: Verification (confirmación)
│
├── types/
│   └── node-forge.d.ts             # Definiciones de tipos
│
└── SepeiUnido.tsx                  # Integración en flujo de registro
```

### Base de Datos de Usuarios

Cada usuario registrado con FNMT incluye:

```typescript
{
  id: string;
  nombre: string;
  email: string;
  
  // Datos FNMT (nuevos)
  certificado_nif?: string;
  certificado_thumbprint?: string;
  certificado_fecha_validacion?: string;
  certificado_valido?: boolean;
  
  // Otros campos existentes...
  terminos_aceptados: boolean;
  fecha_aceptacion_terminos: string;
  version_terminos: string;
}
```

### Panel de Administración

El panel admin muestra información de verificación FNMT:

```
✓ Verificación FNMT
  NIF Verificado: 12345678A
  Fecha Verificación: 22/11/2025
  Estado: ✓ Válido
```

### API del Servicio FNMT

#### `processCertificate(file: File, password: string)`

Procesa un archivo de certificado y valida su contenido.

**Parámetros:**
- `file`: Archivo P12/PFX del certificado
- `password`: Contraseña del certificado

**Retorna:**
```typescript
{
  valido: boolean;
  error?: string;
  data?: CertificateData;
}
```

**Ejemplo:**
```typescript
const result = await processCertificate(certificateFile, password);
if (result.valido) {
  console.log('NIF:', result.data.nif);
  console.log('Nombre:', result.data.nombre);
  console.log('Válido hasta:', result.data.fechaExpiracion);
}
```

#### `isCertificateRegistered(thumbprint: string)`

Verifica si un certificado ya está registrado.

```typescript
if (isCertificateRegistered(thumbprint)) {
  // El certificado ya está en uso
}
```

#### `saveCertificateToSession(data: CertificateData)`

Guarda el certificado en sesión temporal (1 hora).

```typescript
saveCertificateToSession(certificateData);
```

#### `getCertificateFromSession()`

Recupera certificado de la sesión temporal.

```typescript
const cert = getCertificateFromSession();
if (cert) {
  // Hay certificado válido en sesión
}
```

### Validaciones Implementadas

1. **Formato de Archivo**
   - ✅ Solo acepta .p12 y .pfx
   - ✅ Validación de tamaño (máx 5MB)

2. **Desencriptación**
   - ✅ Contraseña obligatoria
   - ✅ Manejo de errores de PKCS#12

3. **Certificado**
   - ✅ Verifica vigencia temporal
   - ✅ Valida autoridad emisora (FNMT)
   - ✅ Extrae datos correctamente

4. **NIF/DNI**
   - ✅ Formato 8 dígitos + 1 letra
   - ✅ Validación de letra de control
   - ✅ Rechazo de NIF inválidos

5. **Duplicados**
   - ✅ Previene uso del mismo certificado
   - ✅ Usa thumbprint como identificador único

### Seguridad y Privacidad

#### ✅ Procesamiento Client-Side

```javascript
// TODO procesamiento en el navegador
// NO se envía a servidor
const result = await processCertificate(file, password);
```

#### ✅ Sesión Temporal

```javascript
// Certificado válido por 1 hora en sessionStorage
// Se elimina automáticamente tras expiración
// Se limpia tras registro exitoso
```

#### ✅ Almacenamiento Seguro

Solo se guardan datos públicos del certificado:
- NIF (público)
- Nombre (público)
- Thumbprint (no sensible)
- Fechas (públicas)

La contraseña NUNCA se almacena.

### Manejo de Errores

| Error | Causa | Solución |
|-------|-------|----------|
| Formato de certificado inválido | Archivo no es P12/PFX válido | Descarga desde FNMT.es |
| Contraseña incorrecta | Contraseña no coincide | Verifica la contraseña |
| Certificado expirado | Fecha de vigencia pasada | Renueva tu certificado en FNMT |
| NIF inválido | Formato de NIF incorrecto | Contacta con FNMT |
| Certificado duplicado | Ya registrado | Usa diferente certificado |
| No se encontró NIF | Certificado no tiene NIF | Usa certificado personal FNMT |

### Testing Manual

#### Prueba 1: Carga de Certificado Válido
```
1. Haz clic en "Unirme a SEPEI UNIDO"
2. Carga tu certificado .p12/.pfx
3. Ingresa contraseña
4. Verifica que aparecen tus datos (NIF, nombre)
5. Confirma registro
```

#### Prueba 2: Certificado Duplicado
```
1. Registra usuario con certificado A
2. Intenta registrar otro usuario con mismo certificado A
3. Verifica mensaje: "Este certificado ya está registrado"
```

#### Prueba 3: Contraseña Incorrecta
```
1. Carga certificado
2. Ingresa contraseña incorrecta
3. Verifica mensaje de error específico
```

### Requisitos del Navegador

- **Soporte JavaScript ES2020**
- **localStorage y sessionStorage**
- **Procesamiento de archivos (File API)**
- **Librerías:** node-forge (para procesamiento PKCS#12)

Navegadores compatibles:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Próximas Mejoras Futuras

- [ ] Integración con servidor backend para validación adicional
- [ ] Notificación a bomberos cuando certificado expira
- [ ] Dashboard de certificados válidos por fecha
- [ ] Exportación de reportes con verificación FNMT
- [ ] 2FA con certificado digital
- [ ] API REST para verificación de terceros

### Referencias

- [FNMT - Certificados Digitales](https://www.fnmt.es)
- [RGPD - Protección de Datos](https://www.aepd.es)
- [RFC 5652 - PKCS#7](https://tools.ietf.org/html/rfc5652)
- [node-forge Documentation](https://github.com/digitalbazaar/forge)

---

**Última actualización:** 22 de Noviembre de 2025
**Versión del Sistema:** 2.0 - Con Verificación FNMT
