% # GUÍA DE PRUEBAS - CERTIFICADO FNMT

## 🔐 Sistema de Verificación FNMT Implementado

Se ha implementado un sistema completo de verificación de identidad mediante certificados digitales FNMT para SEPEI UNIDO.

---

## 📋 Descripción de la Funcionalidad

### ¿Qué es FNMT?
- **FNMT** = Fábrica Nacional de Moneda y Timbre
- Organismo español que emite certificados digitales de identidad
- Los bomberos pueden obtener certificados gratuitos en: https://www.fnmt.es

### ¿Qué hace el sistema?

1. **Carga de Certificado**: El usuario sube su archivo de certificado (.p12 o .pfx)
2. **Desencriptación**: Se pide la contraseña para desencriptar el certificado
3. **Validación**: Se verifica que:
   - El certificado es válido temporalmente
   - El NIF/DNI es español válido (algoritmo MOD23)
   - El certificado no está duplicado en el sistema
4. **Extracción de Datos**: Se extraen:
   - NIF/DNI
   - Nombre y apellidos
   - Email
   - Organización
   - Fecha de expiraración
5. **Registro**: Se guarda el usuario con datos verificados

---

## 🧪 PLAN DE PRUEBAS

### PREREQUISITOS

- Archivo de certificado de prueba (.p12 o .pfx)
- Contraseña del certificado
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### OPCIÓN 1: Con Certificado Real FNMT

Si tienes un certificado FNMT válido:

1. Ir a `http://localhost:5173/`
2. Scrollear a "Únete a SEPEI UNIDO"
3. Llenar: Nombre, Email, Teléfono (opcional)
4. Hacer clic en "Unirme a SEPEI UNIDO"
5. **Aparecerá**: Modal para cargar certificado
6. Seleccionar archivo .p12 o .pfx
7. Ingresar contraseña
8. Verificar datos extraídos
9. Confirmar certificado
10. Aceptar términos RGPD
11. ✅ Usuario registrado

---

### OPCIÓN 2: Simulación (Sin Certificado Real)

**Para desarrolladores que desean probar sin certificado real:**

Los archivos de prueba se encuentran en:
```
tests/fixtures/
```

#### Génerar Certificado de Prueba (OpenSSL)

```bash
# 1. Generar clave privada
openssl genrsa -out test_key.pem 2048

# 2. Generar certificado autofirmado
openssl req -new -x509 -key test_key.pem -out test_cert.pem -days 365 \
  -subj "/C=ES/ST=Albacete/L=Villarrobledo/O=SEPEI/CN=Juan García/serialNumber=12345678Z"

# 3. Crear PKCS#12 (.p12)
openssl pkcs12 -export -in test_cert.pem -inkey test_key.pem \
  -out test_certificate.p12 -name "Test Certificate" \
  -passout pass:testpassword
```

**Contraseña de prueba**: `testpassword`

---

## ✅ CASOS DE PRUEBA

### Test 1: Carga Exitosa de Certificado

**Pasos:**
1. Seleccionar archivo válido .p12
2. Ingresar contraseña correcta
3. Verificar que se muestren los datos

**Esperado:** ✓ Certificado procesado y datos mostrados

---

### Test 2: Contraseña Incorrecta

**Pasos:**
1. Seleccionar archivo .p12
2. Ingresar contraseña incorrecta
3. Hacer clic "Verificar Certificado"

**Esperado:** ✗ Error "Contraseña de certificado incorrecta"

---

### Test 3: Archivo Inválido

**Pasos:**
1. Intentar cargar archivo .txt o cualquier otro formato
2. Hacer clic continuar

**Esperado:** ✗ Error "Selecciona un archivo .p12 o .pfx válido"

---

### Test 4: NIF Inválido

**Pasos:**
1. Usar certificado con NIF mal formado
2. Intentar procesar

**Esperado:** ✗ Error "NIF/DNI inválido"

---

### Test 5: Certificado Expirado

**Pasos:**
1. Usar certificado con fecha de vencimiento pasada
2. Intentar procesar

**Esperado:** ✗ Error mostrando fechas de validez

---

### Test 6: Certificado Duplicado

**Pasos:**
1. Registrar usuario con certificado X
2. Intentar registrar otro usuario con el mismo certificado X

**Esperado:** ✗ Error "Este certificado ya está registrado"

---

### Test 7: Verificación de Datos en Admin Panel

**Pasos:**
1. Registrar usuario con certificado
2. Hacer login en admin (contraseña: sepei2024)
3. Ver tabla de usuarios
4. Hacer clic en icono de ojo para expandir detalles

**Esperado:** ✓ Se muestre sección verde "Verificación FNMT" con:
- NIF verificado
- Fecha de verificación
- Estado: "✓ Válido"

---

### Test 8: Flujo Completo Registro

**Pasos:**
1. Cargar certificado
2. Aceptar certificado
3. Aceptar términos RGPD (scroll + checkbox)
4. Confirmar registro

**Esperado:** ✓ Usuario creado y mensaje de éxito

---

## 🔍 VALIDACIONES TÉCNICAS

### En Console (DevTools)

```javascript
// Ver usuarios registrados
JSON.parse(localStorage.getItem('sepei_unido_users'))

// Verificar datos del certificado guardados
// Usuario debe incluir:
// - certificado_nif: "12345678Z"
// - certificado_thumbprint: "ABC123..."
// - certificado_fecha_validacion: ISO timestamp
// - certificado_valido: true
```

### Ver Certificado en Sesión

```javascript
// Durante el proceso (antes de registrar)
JSON.parse(sessionStorage.getItem('fnmt_certificate_session'))

// Se limpia después del registro exitoso
sessionStorage.getItem('fnmt_certificate_session') // null
```

---

## 🔐 Validaciones de Seguridad

✅ **Implementadas:**
- Certificados procesados SOLO en el navegador (lado cliente)
- Nunca se envía certificado a servidores
- Contraseña nunca se almacena (solo en memoria temporal)
- Validación MOD23 de NIF español
- Detección de certificados duplicados
- Sesión de certificado expira en 1 hora
- RGPD compliance: Consentimiento obligatorio

❌ **No implementado** (fuera de scope):
- Conexión a servidor OCSP de FNMT
- Validación en tiempo real de revocación
- Verificación de cadena de certificación completa

---

## 📊 Campos Almacenados en Usuario

```typescript
{
  // Campos existentes...
  nombre: string;
  email: string;
  
  // NUEVOS - Certificado FNMT
  certificado_nif?: string;           // "12345678Z"
  certificado_thumbprint?: string;    // "SHA256HASH..."
  certificado_fecha_validacion?: string; // ISO timestamp
  certificado_valido?: boolean;       // true/false
}
```

---

## 📝 Logs Útiles

### En la consola del navegador:

```
// Certificado procesado exitosamente:
"Usuario registrado con certificado FNMT validado: 12345678Z"

// Error de certificado:
"Error procesando certificado: [error details]"
```

---

## 🐛 Solución de Problemas

### "Could not find a declaration file for module 'node-forge'"
- Solución: Ya instalados tipos TypeScript
- Ver archivo: `src/types/node-forge.d.ts`

### Certificado no se carga
- Verificar formato: Debe ser .p12 o .pfx
- Verificar tamaño: Máximo 5MB
- Verificar contraseña: Debe ser exacta

### No puedo ver datos de certificado en admin
- Expandir usuario (icono ojo)
- Scrollear la sección expandida
- Buscar sección con fondo verde "Verificación FNMT"

---

## 🚀 Próximas Mejoras (Opcional)

- [ ] Validación OCSP de FNMT en tiempo real
- [ ] Verificación de cadena de certificación
- [ ] Soporte para certificados de otros países
- [ ] Dashboard de estadísticas de verificaciones
- [ ] Webhook para notificar cuando expira certificado
- [ ] Integración con API oficial de FNMT

---

## 📞 Contacto y Soporte

Para preguntas o problemas con la implementación:
- GitHub: https://github.com/Miguelcodecrypto/sepei-unido-web
- Rama: `feature/fnmt-certificate-verification`

---

**Última actualización:** Noviembre 22, 2025
**Versión:** 1.0 FNMT Certificate Integration
