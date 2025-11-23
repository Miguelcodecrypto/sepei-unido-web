# Guía de Selección de Certificados Digitales FNMT

## Overview

El sistema permite a los usuarios seleccionar entre certificados instalados en su navegador al registrarse. Los certificados pueden ser:
1. **Certificados Reales FNMT** - Instalados en el sistema operativo desde www.fnmt.es
2. **Certificados de Prueba** - Para desarrollo y testing

## Funcionamiento Técnico

### En HTTPS (Producción)

Cuando un usuario accede a `www.sepeiunido.org`:
1. El navegador automáticamente detecta certificados del sistema
2. Al hacer clic en "Registrarse y Verificar Identidad", se abre un diálogo de selección
3. El usuario selecciona su certificado FNMT
4. El certificado se valida y se registra la cuenta

### En HTTP (Desarrollo Local)

Cuando trabajas en `localhost:5173`:
1. Los certificados del sistema no se pueden acceder por razones de seguridad
2. En su lugar, se pueden usar **certificados de prueba**

## Cómo Usar Certificados de Prueba

### Para Desarrollo Local (HTTP)

1. **Inicializar certificados de prueba:**
   ```javascript
   // Abre la consola (F12) y ejecuta:
   fnmt.initializeTestCertificates()
   ```

2. **Ver certificados disponibles:**
   ```javascript
   fnmt.listTestCertificates()
   ```

3. **Limpiar certificados de prueba:**
   ```javascript
   fnmt.clearTestCertificates()
   ```

### Certificados de Prueba Disponibles

El sistema incluye 3 certificados de prueba:

| Nombre | NIF | Estado | Válido Hasta |
|--------|-----|--------|--------------|
| Juan García López | 12345678A | ✅ Válido | 1 año desde hoy |
| María Rodríguez González | 87654321B | ✅ Válido | 2 años desde hoy |
| Carlos Martínez Pérez | 11111111C | ❌ Expirado | Hace 30 días |

## Cómo Usar Certificados Reales FNMT

### Para Producción (HTTPS)

1. **Instalar certificado desde FNMT:**
   - Visita [www.fnmt.es](https://www.fnmt.es)
   - Descarga tu certificado digital personal
   - Instálalo en tu navegador (Chrome, Firefox, Safari o Edge)

2. **Acceder a www.sepeiunido.org:**
   - El navegador detectará automáticamente tu certificado
   - Al hacer clic en "Registrarse", aparecerá el diálogo de selección
   - Selecciona tu certificado FNMT

3. **Completar el registro:**
   - Los datos se pre-rellenarán desde el certificado
   - Verifica la información
   - Completa el registro

## Interfaz de Selección Mejorada

El diálogo de selección de certificados ahora muestra:

- ✅ **Icono de estado**: Verde si es válido, rojo si está expirado
- 👤 **Nombre completo**: Nombres y apellidos del titular
- 🆔 **NIF/DNI**: Identificador único
- 🏛️ **Emisor**: Autoridad que emitió el certificado (FNMT)
- 📅 **Fechas de validez**: Desde cuándo y hasta cuándo es válido

### Características del Diálogo:
- Los certificados expirados se muestran deshabilitados (no se pueden seleccionar)
- Tema oscuro moderno con colores naranja
- Animaciones suaves al pasar el cursor
- Separación visual entre certificados reales y de prueba

## Flujo Completo de Registro

### Paso 1: Navegar a "Compartir Ideas"
```
Inicio → Menú → "Compartir Ideas"
```

### Paso 2: Información de Registro
Se muestra un recuadro azul explicando que necesitas verificar tu identidad

### Paso 3: Seleccionar Certificado
```
Haz clic en "Registrarse y Verificar Identidad"
↓
Se abre el diálogo de selección
↓
Selecciona tu certificado (real o de prueba)
↓
Se valida y se registra tu cuenta
```

### Paso 4: Formulario de Propuesta
Después de registrado, se abre un formulario con:
- ✓ Tu nombre (pre-rellenado)
- ✓ Tus apellidos (pre-rellenados)
- ✓ Tu email (pre-rellenado)
- Tu propuesta/idea
- Botón para enviar

## Detección de Certificados

### Algoritmo de Detección

1. **En HTTPS:**
   - Se realiza un "handshake" TLS con el servidor
   - El navegador muestra un diálogo nativo para seleccionar certificado
   - Los datos se envían al servidor para validación

2. **En HTTP:**
   - Los certificados del sistema no se pueden acceder (restricción de navegador)
   - Se muestran solo certificados de prueba almacenados en localStorage

3. **Métodos usados:**
   - XMLHttpRequest con `credentials: true`
   - TLS Client Certificate Handshake
   - Web Crypto API (como fallback)

## Navegadores Soportados

| Navegador | Versión Mínima | Estado |
|-----------|-----------------|--------|
| Chrome | 90+ | ✅ Soportado |
| Firefox | 88+ | ✅ Soportado |
| Safari | 14+ | ✅ Soportado |
| Edge | 90+ | ✅ Soportado |

## Resolución de Problemas

### "No hay certificados disponibles"

**En desarrollo (HTTP):**
```javascript
fnmt.initializeTestCertificates()
// Luego intenta de nuevo
```

**En producción (HTTPS):**
- Verifica que has instalado tu certificado FNMT
- Intenta desde un navegador moderno (Chrome, Firefox, Safari o Edge)

### "Certificado expirado"
- El certificado ya no es válido
- Instala un nuevo certificado desde www.fnmt.es

### El navegador no muestra el diálogo

Posibles causas:
1. Accediendo desde HTTP en producción
2. Navegador antiguo o no soportado
3. Certificados no instalados correctamente

## API para Desarrolladores

### Funciones Expuestas en `window.fnmt`

```javascript
// Inicializar certificados de prueba
fnmt.initializeTestCertificates()

// Listar certificados disponibles
fnmt.listTestCertificates()

// Limpiar certificados de prueba
fnmt.clearTestCertificates()

// Obtener certificado actual de la sesión
const cert = fnmt.getCurrentCertificate()

// Verificar si hay un certificado registrado
fnmt.isCertificateRegistered(nif)
```

## Notas de Seguridad

⚠️ **Importante:**

1. Los certificados de prueba solo deben usarse en desarrollo
2. En producción, siempre usa HTTPS
3. Los datos sensibles se transmiten solo en sesiones seguras
4. El certificado se valida criptográficamente

## Referencias

- [FNMT - Fábrica Nacional de Moneda y Timbre](https://www.fnmt.es)
- [Especificación X.509 - RFC 5280](https://tools.ietf.org/html/rfc5280)
- [Web Crypto API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

**Última actualización:** Noviembre 2024
**Versión:** 2.0 - Selección mejorada de certificados
