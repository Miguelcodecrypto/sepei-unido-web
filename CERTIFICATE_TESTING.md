# Pruebas de Certificados FNMT

## Desarrollo (Simulación)

En desarrollo, usamos certificados de **prueba simulados** que funcionan en HTTP localhost.

### Cómo probar:

1. **Abre la consola del navegador** (F12)

2. **Carga los certificados de prueba:**
   ```javascript
   fnmt.initializeTestCertificates()
   ```

3. **Verifica los certificados disponibles:**
   ```javascript
   fnmt.listTestCertificates()
   ```

4. **En el formulario de registro**, al hacer clic en "Seleccionar Certificado Digital", aparecerá un diálogo con los certificados de prueba disponibles.

5. **Selecciona cualquier certificado** para completar el flujo de registro.

### Certificados de prueba disponibles:

- **Juan García López** (NIF: 12345678A)
- **María Rodríguez González** (NIF: 87654321B)

### Notas:

- Los certificados de prueba están almacenados en `localStorage`
- Se generan automáticamente con 1-2 años de validez
- No requieren HTTPS
- Son solo para desarrollo

## Producción

En producción con HTTPS, el navegador automáticamente solicitará seleccionar un certificado digital instalado en el sistema operativo.

### Requisitos:

- HTTPS activado (obligatorio para TLS client certificates)
- Certificado FNMT instalado en el navegador del usuario
- Navegadores soportados: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Flujo:

1. Usuario accede a la página HTTPS
2. Al hacer clic en "Seleccionar Certificado Digital", el navegador abre su diálogo nativo
3. Usuario selecciona su certificado FNMT
4. El navegador envía automáticamente el certificado al servidor
5. Servidor valida y registra al usuario

## Limpieza

Para borrar los certificados de prueba:

```javascript
fnmt.clearTestCertificates()
```
