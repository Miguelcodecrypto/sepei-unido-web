# Sistema de Cambio de Contraseña Obligatorio - SEPEI UNIDO

## 📋 Implementación Completa

### 1. **Base de Datos - Supabase**
Ejecutar el script SQL: `supabase_remove_social_columns.sql`

```sql
-- Elimina columnas de redes sociales
ALTER TABLE users DROP COLUMN IF EXISTS instagram;
ALTER TABLE users DROP COLUMN IF EXISTS facebook;
ALTER TABLE users DROP COLUMN IF EXISTS twitter;
ALTER TABLE users DROP COLUMN IF EXISTS linkedin;

-- Agrega columna para contraseña temporal
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT false;
```

### 2. **Componente ChangePasswordModal** ✅
**Archivo:** `src/components/ChangePasswordModal.tsx`

**Características:**
- Modal no cancelable en primer login
- Validaciones de contraseña segura:
  - Mínimo 8 caracteres
  - Al menos 1 mayúscula
  - Al menos 1 minúscula
  - Al menos 1 número
  - Al menos 1 carácter especial
- Indicadores visuales de requisitos en tiempo real
- Verificación de contraseña actual antes de cambiar
- Muestra/oculta contraseñas con botón de ojo
- Feedback visual de éxito con countdown

### 3. **Flujo de Usuario**

#### **Registro:**
1. Usuario se registra (certificado o email)
2. Recibe contraseña temporal por email
3. Verifica su cuenta (click en enlace)
4. Campo `requires_password_change` se marca como `true` en BD

#### **Primer Login:**
1. Usuario hace login con DNI + contraseña temporal
2. Sistema detecta `requires_password_change: true`
3. Muestra modal de cambio obligatorio (no cancelable)
4. Usuario crea nueva contraseña segura
5. Sistema actualiza contraseña y marca `requires_password_change: false`
6. Usuario accede a la plataforma

#### **Siguientes Logins:**
- Login normal sin restricciones
- Usuario puede cambiar contraseña voluntariamente desde perfil (futuro)

### 4. **Archivos Modificados**

#### **`src/services/userDatabase.ts`**
```typescript
// Interface actualizada
interface User {
  // ... campos existentes
  requires_password_change?: boolean;
}

// Nueva función
export const updateUserPassword = async (dni: string, hashedPassword: string): Promise<boolean>
```

#### **`src/components/EmailVerification.tsx`**
```typescript
addUser({
  // ... campos existentes
  requires_password_change: true, // Marcar contraseña temporal
});
```

#### **`src/components/UserLogin.tsx`**
```typescript
// Detectar si requiere cambio de contraseña
if (userData.requires_password_change === true) {
  setShowChangePassword(true);
  return;
}
```

#### **`src/components/TraditionalRegistration.tsx`**
- Agregado campo de teléfono en el formulario
- Se guarda en tempData y se envía a Supabase

### 5. **Seguridad Implementada**

✅ **Contraseñas cifradas con bcrypt (10 salt rounds)**
✅ **Validación de contraseña actual antes de cambiar**
✅ **Requisitos de contraseña fuerte obligatorios**
✅ **No se puede reutilizar la contraseña temporal**
✅ **Contraseñas no se muestran por defecto (toggle eye icon)**
✅ **Timestamp de cambio de contraseña guardado**

### 6. **Validaciones de Contraseña**

```typescript
Requisitos:
- Longitud >= 8 caracteres
- /[A-Z]/ → Al menos una mayúscula
- /[a-z]/ → Al menos una minúscula
- /[0-9]/ → Al menos un número
- /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ → Carácter especial
```

### 7. **Estados y Almacenamiento**

**localStorage:**
```javascript
user_${DNI} → {
  password: "hash_bcrypt",
  requires_password_change: boolean,
  password_changed_at: ISOString,
  // ... otros campos
}
```

**Supabase:**
```sql
users {
  requires_password_change: boolean,
  password_changed_at: timestamp
}
```

### 8. **Testing Manual**

**Test 1: Registro nuevo usuario**
1. Registrarse con email
2. Verificar cuenta desde email
3. Login con DNI + contraseña temporal
4. ✅ Debe aparecer modal de cambio obligatorio

**Test 2: Cambio de contraseña**
1. Introducir contraseña temporal actual
2. Crear nueva contraseña (debe cumplir requisitos)
3. Confirmar nueva contraseña
4. ✅ Debe guardar y permitir acceso

**Test 3: Contraseña débil**
1. Intentar con "12345678"
2. ✅ Debe rechazar (falta mayúscula, especial)

**Test 4: Segundo login**
1. Cerrar sesión
2. Login de nuevo con nueva contraseña
3. ✅ No debe pedir cambio de contraseña

### 9. **Próximos Pasos Opcionales**

🔹 Agregar opción "Cambiar contraseña" en menú de usuario
🔹 Implementar "Olvidé mi contraseña" con reset por email
🔹 Historial de contraseñas (evitar reutilización)
🔹 Expiración de contraseñas cada X meses
🔹 Notificación por email cuando se cambia contraseña

---

## 🚀 Estado: **COMPLETADO**

Todos los cambios están implementados, testeados y desplegados en producción.

**Commit:** `2d5b3d5`
**Branch:** `main`

---

## 10. Recuperación de contraseña ("Olvidé mi contraseña")

- Nuevo flujo accesible desde el botón **"¿Olvidaste tu contraseña?"** en el login de usuario.
- Pide el **email de registro** y:
  - Genera una **nueva contraseña temporal segura**.
  - Actualiza la contraseña en Supabase (`password` + `requires_password_change = true`).
  - Envía un **email de recuperación** con las nuevas credenciales temporales.
- En el **siguiente inicio de sesión** con esa contraseña temporal:
  - El sistema detecta `requires_password_change = true`.
  - Se muestra el **ChangePasswordModal** obligatorio para forzar una contraseña definitiva.

### Archivos Clave

- [src/services/passwordResetService.ts](src/services/passwordResetService.ts)
- [src/components/ForgotPasswordModal.tsx](src/components/ForgotPasswordModal.tsx)
- [src/services/emailService.ts](src/services/emailService.ts) → `sendPasswordResetEmail`
- [src/services/userDatabase.ts](src/services/userDatabase.ts) → `getUserByEmail`, `resetTempPassword`
