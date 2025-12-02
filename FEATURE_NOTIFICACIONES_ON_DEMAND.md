# Feature: Notificaciones bajo demanda + Emails externos

## Rama: `feature/notification-on-demand`

## Descripción General

Sistema completo que permite:
1. ✅ **Notificar anuncios existentes** - En cualquier momento, no solo al crear
2. ✅ **Notificar votaciones existentes** - Enviar recordatorio de votación activa
3. ✅ **Enviar resultados de votaciones** - Email especial con gráficos y ganador
4. ✅ **Gestionar emails externos** - Agregar contactos que no son usuarios registrados

---

## Commits Realizados

### 1. `9954db4` - Notificaciones bajo demanda
**Archivos modificados:**
- `src/services/emailNotificationService.ts` (+215 líneas)
- `src/components/AnnouncementsManager.tsx` (+20 líneas)
- `src/components/VotingManager.tsx` (+80 líneas)

**Funcionalidades:**
- Botón Mail (naranja) en cada anuncio existente
- Botón Mail (naranja) en cada votación existente
- Botón BarChart3 (verde) para resultados (solo si votación finalizada)
- Nueva función `sendVotingResultsNotification()` con templates HTML profesionales
- Templates incluyen: ganador destacado, gráficos CSS, estadísticas completas

### 2. `c75b440` - Sistema emails externos
**Archivos creados:**
- `src/services/externalEmailsDatabase.ts` (147 líneas)
- `src/components/ExternalEmailsManager.tsx` (267 líneas)
- `supabase_create_external_emails.sql` (45 líneas)

**Archivos modificados:**
- `src/components/NotificationModal.tsx` (refactor completo)
- `src/components/AdminPanel.tsx` (nuevo tab)

**Funcionalidades:**
- CRUD completo para emails externos
- UI gestión con tabla, formulario modal, búsqueda
- NotificationModal con secciones separadas (usuarios azul, externos morado)
- Validación formato email, prevención duplicados
- Toggle activo/inactivo

### 3. `3280b4e` - Fix errores TypeScript
**Correcciones:**
- Import correcto de supabase
- Interfaz `ResultadoVotacion` con campos correctos

---

## Arquitectura del Sistema

### 1. Servicio de Emails Externos
**Archivo:** `src/services/externalEmailsDatabase.ts`

```typescript
interface ExternalEmail {
  id: string;
  email: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Funciones disponibles:
- getAllExternalEmails()
- getActiveExternalEmails()
- createExternalEmail(email, nombre, descripcion?)
- updateExternalEmail(id, updates)
- deleteExternalEmail(id)
- toggleExternalEmailStatus(id, activo)
```

### 2. Base de Datos
**Tabla:** `external_emails`
```sql
CREATE TABLE external_emails (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Características:**
- Índice en `email` para búsquedas rápidas
- Índice parcial en `activo = true`
- Trigger automático para `updated_at`
- Constraint UNIQUE en email

### 3. Componentes React

#### ExternalEmailsManager
**Ubicación:** `src/components/ExternalEmailsManager.tsx`

**Features:**
- Tabla con columnas: Email | Nombre | Descripción | Estado | Acciones
- Modal agregar/editar con validación
- Botones: Editar (azul), Eliminar (rojo)
- Toggle activo/inactivo (verde/gris)
- Confirmación antes de eliminar
- Validación formato email (regex)
- Prevención duplicados (manejo error 23505)

#### NotificationModal (refactorizado)
**Ubicación:** `src/components/NotificationModal.tsx`

**Cambios principales:**
```typescript
// ANTES: Solo usuarios
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// DESPUÉS: Usuarios + Externos
const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
const [selectedExternalIds, setSelectedExternalIds] = useState<Set<string>>(new Set());
```

**UI:**
- Sección "👥 Usuarios Registrados" (azul)
- Sección "📧 Contactos Externos" (morado)
- Cada sección con "Seleccionar todos"
- Búsqueda funciona en ambas listas
- Stats: X usuarios | Y externos | Z seleccionados

**Flujo:**
1. Cargar usuarios + emails externos activos
2. Mostrar en secciones separadas
3. Permitir selección múltiple
4. Al confirmar → combinar ambas listas
5. Enviar a función de notificación

#### AdminPanel
**Ubicación:** `src/components/AdminPanel.tsx`

**Nuevo tab:**
```tsx
<button onClick={() => setActiveTab('external-emails')}>
  <Mail className="w-5 h-5" />
  Emails Externos
</button>

{activeTab === 'external-emails' && (
  <ExternalEmailsManager />
)}
```

---

## Flujos de Usuario

### Flujo 1: Notificar anuncio existente
1. Admin accede a pestaña "Anuncios"
2. Ve lista de anuncios con botón Mail (naranja) en cada uno
3. Click en Mail → se abre NotificationModal
4. Modal carga usuarios + emails externos
5. Admin selecciona destinatarios
6. Confirma → envío secuencial con delay 500ms
7. Alert con estadísticas (exitosos/fallidos)

### Flujo 2: Enviar resultados de votación
1. Admin accede a pestaña "Votaciones"
2. Ve votación finalizada (fecha_fin < now)
3. Aparece botón BarChart3 (verde)
4. Click → sistema carga resultados desde Supabase
5. Formatea: ordena por votos desc, extrae porcentajes
6. Abre NotificationModal con destinatarios
7. Admin selecciona y confirma
8. Se envía template especial:
   - Header verde "Resultados de {tipo}"
   - Box destacado con 🏆 ganador
   - Gráficos de barras CSS para cada opción
   - Estadísticas: total participantes
   - Botón CTA "Ver detalles"

### Flujo 3: Gestionar emails externos
1. Admin accede a pestaña "Emails Externos"
2. Ve tabla con todos los contactos
3. Click "Agregar Email" → modal con formulario
4. Completa: email, nombre, descripción (opcional)
5. Guarda → validación formato email
6. Si duplicado → error claro
7. Email agregado aparece en tabla
8. Admin puede:
   - Editar (pencil azul)
   - Eliminar (trash rojo + confirmación)
   - Toggle activo/inactivo
9. Solo emails activos aparecen en NotificationModal

---

## Templates de Email

### Template Resultados de Votación
**Función:** `sendVotingResultsNotification()`

**HTML:**
```html
<div style="max-width:600px; background:#1e293b; padding:32px;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#10b981,#059669); padding:24px;">
    <h1 style="color:white;">Resultados de {tipo}</h1>
  </div>
  
  <!-- Winner Box -->
  <div style="background:#059669; padding:20px; margin:24px 0;">
    <p style="color:#d1fae5;">🏆 Opción más votada</p>
    <h2 style="color:white;">{ganador.opcion}</h2>
    <p style="color:white; font-size:32px;">{ganador.votos} votos ({ganador.porcentaje}%)</p>
  </div>
  
  <!-- Resultados completos -->
  <div>
    <h3>Resultados completos:</h3>
    {resultados.map(r => (
      <div>
        <p>{r.opcion}</p>
        <div style="background:#0f172a; height:8px;">
          <div style="background:#3b82f6; width:{r.porcentaje}%; height:100%;"></div>
        </div>
        <p>{r.votos} votos ({r.porcentaje}%)</p>
      </div>
    ))}
  </div>
  
  <!-- Stats -->
  <div style="background:#0f172a; padding:16px;">
    <p>👥 Total de participantes: {total_votos}</p>
  </div>
  
  <!-- CTA -->
  <a href="{url}" style="background:#f97316; color:white; padding:12px 24px;">
    Ver detalles completos
  </a>
</div>
```

**Texto plano:**
```
RESULTADOS DE {tipo}

🏆 OPCIÓN MÁS VOTADA
{ganador.opcion}
{ganador.votos} votos ({ganador.porcentaje}%)

RESULTADOS COMPLETOS:
{resultados.map(r => 
  `- ${r.opcion}: ${r.votos} votos (${r.porcentaje}%)`
)}

Total participantes: {total_votos}

Ver detalles: {url}
```

---

## Base de Datos

### Ejecutar SQL en Supabase

**Paso 1:** Ir a proyecto en Supabase
**Paso 2:** SQL Editor → New query
**Paso 3:** Copiar contenido de `supabase_create_external_emails.sql`
**Paso 4:** Run (Ctrl+Enter)
**Paso 5:** Verificar:
```sql
SELECT * FROM external_emails;
```

### Tabla `external_emails`

**Campos:**
- `id` (UUID, PK): Identificador único
- `email` (VARCHAR(255), UNIQUE, NOT NULL): Email del contacto
- `nombre` (VARCHAR(100), NOT NULL): Nombre completo
- `descripcion` (TEXT, NULL): Ej: "Presidente provincial", "Contacto prensa"
- `activo` (BOOLEAN, DEFAULT true): Si aparece en modal notificaciones
- `created_at` (TIMESTAMP, DEFAULT NOW())
- `updated_at` (TIMESTAMP, DEFAULT NOW(), AUTO-UPDATE)

**Índices:**
- `idx_external_emails_email` en `email`
- `idx_external_emails_activo` en `activo WHERE activo = true` (parcial)

**Triggers:**
- `trigger_update_external_emails_updated_at` → actualiza `updated_at` en UPDATE

---

## Testing

### 1. Testing Notificaciones Bajo Demanda

**Test 1: Notificar anuncio existente**
1. Crear anuncio en producción (SIN marcar checkbox notificar)
2. Ir a lista de anuncios
3. Verificar que aparece botón Mail (naranja)
4. Click → modal debe abrir
5. Seleccionar 2-3 usuarios
6. Confirmar
7. Verificar alert con estadísticas
8. Revisar emails recibidos

**Test 2: Notificar votación existente**
1. Crear votación activa (fecha_fin > now)
2. No marcar checkbox notificar
3. Ir a lista votaciones
4. Verificar botón Mail (naranja)
5. Click → modal
6. Seleccionar destinatarios
7. Confirmar
8. Verificar emails

**Test 3: Enviar resultados**
1. Esperar a que votación finalice (fecha_fin < now)
2. Verificar que aparece botón BarChart3 (verde)
3. Click → debe cargar resultados
4. Modal debe abrir con destinatarios
5. Confirmar
6. Verificar template especial:
   - Header verde
   - Ganador destacado
   - Gráficos de barras
   - Estadísticas
7. Verificar texto plano correcto

### 2. Testing Emails Externos

**Test 1: Agregar email**
1. Ir a tab "Emails Externos"
2. Click "Agregar Email"
3. Completar:
   - Email: `prueba@example.com`
   - Nombre: `Contacto Prueba`
   - Descripción: `Test externo`
4. Guardar
5. Verificar aparece en tabla

**Test 2: Validación email**
1. Agregar email inválido: `invalid-email`
2. Debe mostrar error: "Formato de email inválido"

**Test 3: Prevención duplicados**
1. Agregar email existente
2. Debe mostrar error: "Este email ya existe"

**Test 4: Editar email**
1. Click botón Editar (azul) en email de prueba
2. Cambiar nombre
3. Guardar
4. Verificar cambio en tabla

**Test 5: Toggle activo/inactivo**
1. Click en badge "Activo" (verde)
2. Debe cambiar a "Inactivo" (gris)
3. Ir a cualquier modal de notificación
4. Verificar que email NO aparece
5. Toggle de nuevo a activo
6. Verificar que SÍ aparece en modal

**Test 6: Eliminar email**
1. Click botón Eliminar (rojo)
2. Verificar confirmación: "¿Eliminar el contacto X?"
3. Confirmar
4. Verificar desaparece de tabla

**Test 7: NotificationModal con externos**
1. Agregar 2 emails externos activos
2. Crear anuncio y notificar
3. En modal verificar:
   - Sección "Usuarios Registrados" (azul)
   - Sección "Contactos Externos" (morado)
   - Stats: "X usuarios | Y externos | 0 seleccionados"
4. Seleccionar 1 usuario + 1 externo
5. Stats debe mostrar: "2 seleccionados"
6. Confirmar
7. Verificar ambos reciben email

**Test 8: Búsqueda en modal**
1. Abrir modal con usuarios + externos
2. Buscar nombre de usuario → debe filtrar solo usuarios
3. Buscar email externo → debe filtrar solo externos
4. Buscar descripción externa → debe filtrar

---

## Problemas Conocidos

### 1. Errores TypeScript (no críticos)
**Archivo:** `src/services/emailNotificationService.ts`
**Error:** `Property 'env' does not exist on type 'ImportMeta'`
**Líneas:** 61, 121, 425
**Impacto:** Solo desarrollo (warnings), no afecta producción
**Solución futura:** Agregar tipos Vite en tsconfig.json

### 2. Rate Limit Resend
**Problema:** 2 emails/segundo máximo
**Solución implementada:** Envío secuencial con delay 500ms
**Estado:** ✅ RESUELTO (commit e015cab en main)

---

## Próximos Pasos

### Antes de merge a main:
1. ✅ Ejecutar SQL en Supabase producción
2. ⏳ Testing completo (todos los flujos)
3. ⏳ Verificar rate limit con 29 usuarios
4. ⏳ Probar resultados con votación real finalizada
5. ⏳ Agregar 2-3 emails externos reales
6. ⏳ Merge a main

### Features futuras (opcional):
- Grupos de emails externos (ej: "Presidentes provinciales", "Prensa")
- Plantillas personalizadas por admin
- Historial de notificaciones enviadas
- Reenvío automático de fallos
- Estadísticas de apertura de emails (requiere Resend Webhooks)

---

## Estadísticas

**Líneas agregadas:** ~1200
**Archivos creados:** 3
**Archivos modificados:** 5
**Commits:** 3
**Tiempo desarrollo:** ~3 horas
**Estado:** ✅ Completado, pendiente testing

---

## Comandos Git

### Ver cambios:
```bash
git log --oneline feature/notification-on-demand
```

### Ver diff:
```bash
git diff main..feature/notification-on-demand
```

### Testing local:
```bash
npm run dev
```

### Merge a main:
```bash
git checkout main
git merge feature/notification-on-demand
git push origin main
```

---

## Contacto
Para dudas sobre esta feature contactar al desarrollador o revisar commits con detalle.

**Documentación generada:** 2024
**Rama:** feature/notification-on-demand
**Estado:** ✅ Completo, pendiente testing y merge
