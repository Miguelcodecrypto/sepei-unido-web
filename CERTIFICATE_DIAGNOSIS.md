# Diagnóstico de Certificados FNMT

## 🔍 Pasos para verificar si tu certificado está instalado

### En Windows:

1. **Abre el Administrador de Certificados:**
   - Presiona `Win + R`
   - Escribe: `certmgr.msc`
   - Presiona Enter

2. **Busca tu certificado FNMT:**
   - Ve a: `Certificados - Usuario actual` → `Personal` → `Certificados`
   - Busca certificados emitidos por:
     - **AC FNMT Usuarios**
     - **AC Raíz Servidores Seguros Estado**
   - Si ves un certificado con tu NIF/DNI, está instalado correctamente

3. **Verificar que el certificado tenga clave privada:**
   - Haz clic derecho en el certificado
   - Si tiene un ícono de llave 🔑, está listo para usar

### En macOS:

1. **Abre Acceso a Llaveros (Keychain Access):**
   - Presiona `Cmd + Space`
   - Escribe: `Keychain Access`
   - Presiona Enter

2. **Busca tu certificado FNMT:**
   - Ve a: `Certificados`
   - Busca certificados FNMT (contienen tu NIF)

### En Linux:

1. **Verifica la carpeta de certificados:**
   ```bash
   # Normalmente en ~/.local/share/pki/nssdb/ o similar
   certutil -L -d ~/.local/share/pki/nssdb/
   ```

## 🌐 Cómo funciona la detección de certificados en el navegador

Cuando haces clic en "Seleccionar Certificado Digital":

1. ✅ Se abre un diálogo **nativo del navegador**
2. ✅ El navegador accede al **almacén de certificados del Sistema Operativo**
3. ✅ Muestra solo certificados válidos instalados en tu PC
4. ✅ Seleccionas el certificado FNMT que quieres usar
5. ✅ El certificado se valida (no expira) en el navegador
6. ✅ Se registra en SEPEI UNIDO

## ⚠️ Problemas comunes y soluciones

### "No se detectan certificados"

**Posibles causas:**

1. **El certificado FNMT no está instalado**
   - Solución: Instálalo desde www.fnmt.es
   - Descarga el certificado digital
   - Instálalo en tu navegador/sistema operativo

2. **El certificado está expirado**
   - Verifica en el Administrador de Certificados (Windows)
   - Busca la fecha de vencimiento
   - Renovarlo en www.fnmt.es

3. **El certificado no tiene clave privada**
   - Debe tener un ícono de llave 🔑 en Windows
   - Sin la clave privada, no puede usarse

4. **El navegador no soporta certificados de cliente**
   - Asegúrate de usar:
     - Chrome 90+ ✅
     - Firefox 88+ ✅
     - Safari 14+ ✅
     - Edge 90+ ✅
   - Actualiza tu navegador si es necesario

### "El certificado no está siendo detectado por el navegador"

**Próximos pasos:**

1. Abre la **Consola del Navegador** (F12 o Ctrl+Shift+K)
2. Busca mensajes que comiencen con 🔐 o ⚠️
3. Anota exactamente qué dice el error
4. Intenta en otro navegador diferente

### "Diálogo de certificado no aparece"

1. **El navegador puede estar bloqueando diálogos emergentes**
   - Verifica la barra de direcciones
   - Permite que el sitio muestre diálogos emergentes

2. **Cierra todos los navegadores e intenta de nuevo**
   - Los certificados pueden quedar bloqueados si hay múltiples instancias

## 📝 Información técnica

### APIs utilizadas:
- **XMLHttpRequest** con `withCredentials = true`
- **Web Crypto API**
- **Credential Management API** (fallback)

### URLs de diágnóstico:
- Verifica que HTTPS está habilitado (es requerido para certificados de cliente)
- En desarrollo local, usa http://localhost:5173 (Vite)

### Archivos relevantes:
- `/src/services/browserCertificateService.ts` - Lógica de detección
- `/src/components/CertificateUpload.tsx` - Interfaz de usuario
- Open DevTools (F12) para ver logs detallados

## 🆘 ¿Todavía no funciona?

1. **Abre la consola del navegador (F12)**
2. **Busca logs que contengan:**
   - `requestClientCertificate:`
   - `🔐` o `❌` emojis
3. **Copia el mensaje de error exacto**
4. **Verifica en el Administrador de Certificados que existe el certificado FNMT**
5. **Intenta en otro navegador moderno**

---

**Última actualización:** November 2025
**Versión:** 1.0
