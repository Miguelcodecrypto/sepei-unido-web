# 🔧 Plan de Migración: localStorage → Supabase Sessions

## 📊 ANÁLISIS COMPLETO DEL PROBLEMA

### Usos Actuales de localStorage (CRÍTICOS)

#### 1. **Sesión de Usuario (`current_user`)** - ⚠️ ALTA PRIORIDAD
**Archivos afectados:**
- `src/SepeiUnido.tsx` (líneas 61, 218, 239)
- `src/components/UserLogin.tsx` (líneas 109, 181)
- `src/components/VotingBoard.tsx` (línea 69)
- `src/services/votingDatabase.ts` (líneas 113, 196, 332, 486)

**Problema:** Si el usuario limpia caché o cambia de dispositivo, pierde la sesión

**Solución:** Sistema de sesiones en Supabase (tabla `user_sessions`)

#### 2. **Fallback de Usuarios** - ⏳ MEDIA PRIORIDAD
**Archivos afectados:**
- `src/components/UserLogin.tsx` (líneas 66-122)
- `src/components/ChangePasswordModal.tsx` (líneas 156-168)

**Problema:** Sistema de compatibilidad con datos antiguos

**Solución:** Eliminar después de migración completa

#### 3. **Tokens de Verificación** - ✅ YA SOLUCIONADO
**Archivos afectados:**
- `src/components/EmailVerification.tsx`
- `src/components/TraditionalRegistration.tsx`

**Estado:** Migrado a `verification_token` en tabla `users`

#### 4. **Sesión de Admin** - ⚠️ ALTA PRIORIDAD
**Archivos afectados:**
- `src/services/authService.ts` (líneas 15, 41, 49, 54)

**Problema:** Sesión de admin también en localStorage

**Solución:** Usar mismo sistema de sesiones con rol de admin

### Usos Aceptables de localStorage (NO CAMBIAR)

#### 5. **Certificados de Prueba** - ✅ CORRECTO
**Archivos:** `src/data/testCertificates.ts`, `src/services/browserCertificateService.ts`
**Razón:** Solo para desarrollo, datos no críticos

#### 6. **sessionStorage para Certificados FNMT** - ✅ CORRECTO
**Archivos:** `src/services/fnmtService.ts`, `src/services/browserCertificateService.ts`
**Razón:** Temporal por 1 hora, uso correcto

---

## 🎯 ESTRATEGIA DE MIGRACIÓN

### Fase 1: Infraestructura (COMPLETADO)
- ✅ Crear tabla `user_sessions` en Supabase
- ✅ Crear servicio `sessionService.ts`
- ✅ Migrar tokens de verificación a DB

### Fase 2: Autenticación de Usuarios (EN CURSO)
**Orden de migración:**
1. `UserLogin.tsx` - Crear sesión al hacer login
2. `SepeiUnido.tsx` - Recuperar sesión al cargar app
3. `VotingBoard.tsx` - Usar sesión para votaciones
4. `votingDatabase.ts` - Leer usuario desde sesión

**Cambios necesarios:**

#### `UserLogin.tsx` - Login exitoso
```typescript
// ANTES:
localStorage.setItem('current_user', JSON.stringify(loggedUser));
onLoginSuccess(loggedUser);

// DESPUÉS:
const sessionToken = await createSession(userData.id);
if (sessionToken) {
  onLoginSuccess(loggedUser);
} else {
  setError('Error al crear sesión');
}
```

#### `SepeiUnido.tsx` - Cargar usuario
```typescript
// ANTES:
const currentUserStr = localStorage.getItem('current_user');
if (currentUserStr) {
  const user = JSON.parse(currentUserStr);
  setLoggedUser(user);
}

// DESPUÉS:
const loadCurrentUser = async () => {
  const user = await getCurrentUser();
  if (user) {
    setLoggedUser({
      dni: user.dni,
      nombre: user.nombre,
      apellidos: user.apellidos || '',
      email: user.email,
      verified: user.verified,
    });
  }
};
loadCurrentUser();
```

#### `VotingBoard.tsx` - Verificar autenticación
```typescript
// ANTES:
const currentUser = localStorage.getItem('current_user');
if (!currentUser) {
  alert('Debes iniciar sesión');
  return;
}

// DESPUÉS:
const currentUser = await getCurrentUser();
if (!currentUser) {
  onLoginRequired();
  return;
}
```

#### `votingDatabase.ts` - Obtener usuario actual
```typescript
// ANTES:
const currentUserStr = localStorage.getItem('current_user');
if (!currentUserStr) return false;
const currentUser = JSON.parse(currentUserStr);

// DESPUÉS:
const currentUser = await getCurrentUser();
if (!currentUser) return false;
```

### Fase 3: Admin Panel (SIGUIENTE)
**Archivo:** `src/services/authService.ts`

**Opciones:**
1. Usar misma tabla `user_sessions` con campo `is_admin`
2. Crear tabla separada `admin_sessions`
3. Usar Supabase Auth con RLS

**Recomendación:** Opción 1 (más simple)

```typescript
// authService.ts - Migrado
export const adminLogin = async (password: string): Promise<boolean> => {
  if (password !== ADMIN_PASSWORD) return false;
  
  // Buscar o crear usuario admin en tabla users
  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@sepei.es')
    .single();
  
  if (!adminUser) return false;
  
  const sessionToken = await createSession(adminUser.id);
  return !!sessionToken;
};

export const isAdminAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // Verificar si es admin
  return user.email === 'admin@sepei.es';
};
```

### Fase 4: Limpieza (FINAL)
- ❌ Eliminar código de fallback a localStorage
- ❌ Eliminar imports no usados
- ❌ Actualizar documentación
- ✅ Tests de regresión

---

## 📝 ARCHIVOS POR MODIFICAR

### 🔴 Alta Prioridad (Sesión crítica)
1. ✅ `src/services/sessionService.ts` - CREADO
2. ⏳ `src/components/UserLogin.tsx` - Usar createSession()
3. ⏳ `src/SepeiUnido.tsx` - Usar getCurrentUser()
4. ⏳ `src/components/VotingBoard.tsx` - Usar getCurrentUser()
5. ⏳ `src/services/votingDatabase.ts` - Usar getCurrentUser()

### 🟡 Media Prioridad (Admin)
6. ⏳ `src/services/authService.ts` - Migrar admin a sesiones

### 🟢 Baja Prioridad (Limpieza)
7. ⏳ `src/components/UserLogin.tsx` - Eliminar fallback localStorage
8. ⏳ `src/components/ChangePasswordModal.tsx` - Eliminar sync localStorage
9. ⏳ `src/utils/migratePasswords.ts` - Deprecar o eliminar

---

## 🚨 RIESGOS Y MITIGACIÓN

### Riesgo 1: Usuarios con sesión activa pierden acceso
**Mitigación:** 
- Mantener compatibilidad temporal
- Mensaje informando que deben re-loguearse
- Migración gradual (no forzada)

### Riesgo 2: Sesiones expiran demasiado rápido
**Mitigación:**
- Duración: 7 días (configurable)
- Auto-renovación en cada actividad
- Opción "Recordarme" para 30 días

### Riesgo 3: Problemas de rendimiento (muchas queries)
**Mitigación:**
- Cache en memoria del usuario actual
- Actualizar `last_activity` solo cada 5 minutos
- Índices en tabla `user_sessions`

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Supabase (Base de Datos)
- [x] Ejecutar `supabase_add_sessions_table.sql`
- [x] Ejecutar `supabase_add_verification_token.sql`
- [ ] Verificar índices creados
- [ ] Probar función `cleanup_expired_sessions()`

### Código Frontend
- [x] Crear `sessionService.ts`
- [ ] Actualizar `UserLogin.tsx` - createSession()
- [ ] Actualizar `SepeiUnido.tsx` - getCurrentUser()
- [ ] Actualizar `VotingBoard.tsx` - getCurrentUser()
- [ ] Actualizar `votingDatabase.ts` - getCurrentUser()
- [ ] Actualizar `authService.ts` - Admin sessions
- [ ] Eliminar fallbacks localStorage

### Testing
- [ ] Login/Logout funciona
- [ ] Sesión persiste al recargar
- [ ] Sesión expira correctamente
- [ ] Votaciones con sesión activa
- [ ] Admin panel con sesión
- [ ] Multi-dispositivo funciona
- [ ] Limpieza de sesiones expiradas

### Documentación
- [ ] Actualizar README.md
- [ ] Documentar API de sessionService
- [ ] Guía de migración para usuarios
- [ ] Changelog con breaking changes

---

## 🔧 COMANDOS SQL NECESARIOS

```sql
-- 1. Crear tabla de sesiones
-- Ver: supabase_add_sessions_table.sql

-- 2. Migrar tokens de verificación
-- Ver: supabase_add_verification_token.sql

-- 3. Limpiar sesiones expiradas (ejecutar periódicamente)
SELECT cleanup_expired_sessions();

-- 4. Ver sesiones activas
SELECT 
  us.id,
  u.nombre,
  u.email,
  us.created_at,
  us.expires_at,
  us.last_activity
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.is_active = true
ORDER BY us.last_activity DESC;

-- 5. Invalidar todas las sesiones de un usuario
UPDATE user_sessions 
SET is_active = false 
WHERE user_id = 'USER_ID_AQUI';
```

---

## 📈 MÉTRICAS DE ÉXITO

### Antes (localStorage)
- ❌ Sesiones se pierden al limpiar caché
- ❌ No funciona entre dispositivos
- ❌ Tokens de verificación expiran en 24h
- ❌ No hay control de sesiones activas

### Después (Supabase Sessions)
- ✅ Sesiones persistentes en base de datos
- ✅ Funciona entre dispositivos
- ✅ Tokens válidos 7 días
- ✅ Control total de sesiones
- ✅ Posibilidad de invalidar remotamente
- ✅ Auditoría de accesos (IP, user agent)

---

## 🎓 LECCIONES APRENDIDAS

1. **localStorage NO es para datos críticos** - Solo para preferencias UI
2. **sessionStorage es OK** - Para datos temporales de una sesión
3. **Base de datos es la fuente de verdad** - localStorage solo como cache opcional
4. **Planificar migración gradual** - No romper experiencia de usuarios actuales
5. **Tokens en DB > Tokens en localStorage** - Más seguro y confiable

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **Ejecutar SQLs en Supabase:**
   ```bash
   # En Supabase SQL Editor:
   # 1. supabase_add_sessions_table.sql
   # 2. supabase_add_verification_token.sql
   ```

2. **Actualizar UserLogin.tsx:**
   - Import: `import { createSession } from '../services/sessionService'`
   - Línea 181: Reemplazar `localStorage.setItem` con `createSession(userData.id)`

3. **Actualizar SepeiUnido.tsx:**
   - Línea 61: Reemplazar lectura de localStorage con `getCurrentUser()`

4. **Probar flujo completo:**
   - Registro → Verificación → Login → Votación → Logout

5. **Desplegar cambios:**
   ```bash
   npm run build
   git add .
   git commit -m "feat: Migrar autenticación de localStorage a Supabase sessions"
   git push
   ```
