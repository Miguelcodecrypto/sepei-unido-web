# Sistema de Votaciones - Sepei Unido

## Descripción
Sistema completo de votaciones y encuestas para usuarios registrados con gestión desde el panel de administración.

## Características Principales

### 🗳️ Tipos de Votación
- **Votación**: Para decisiones con opciones específicas
- **Encuesta**: Para recopilar opiniones
- **Referéndum**: Para decisiones importantes del movimiento

### ✨ Funcionalidades

#### Para Administradores
- Crear y editar votaciones con múltiples opciones
- Configurar fechas de inicio y fin
- Publicar/despublicar votaciones
- Hacer resultados públicos o privados
- Permitir respuestas múltiples (opcional)
- Ver resultados en tiempo real con gráficas
- Exportar datos de votaciones

#### Para Usuarios
- Ver votaciones activas
- Votar solo si está registrado
- Un voto por usuario por votación
- Ver resultados si están configurados como públicos
- Indicador de tiempo restante
- Confirmación visual de voto registrado

## Configuración Inicial

### 1. Base de Datos
Ejecuta el script SQL en Supabase:
```bash
supabase_create_voting_system.sql
```

Este script crea:
- Tabla `votaciones` con todos los campos necesarios
- Tabla `opciones_votacion` para las opciones de cada votación
- Tabla `votos` para registrar los votos
- Funciones RPC para obtener resultados
- Políticas RLS para seguridad

### 2. Permisos
Las políticas RLS están configuradas para:
- ✅ Todos pueden ver votaciones publicadas
- ✅ Solo admins pueden crear/editar/eliminar
- ✅ Solo usuarios autenticados pueden votar
- ✅ Los resultados son visibles según configuración

## Uso del Sistema

### Crear una Votación (Admin)

1. **Acceder al Panel Admin** → Pestaña "Votaciones"
2. **Clic en "Nueva Votación"**
3. **Completar el formulario:**
   - **Título**: Nombre descriptivo de la votación
   - **Descripción**: Contexto adicional (opcional)
   - **Tipo**: Seleccionar votación/encuesta/referéndum
   - **Fecha Inicio**: Cuándo empieza la votación
   - **Fecha Fin**: Cuándo termina
   - **Opciones**: Añadir mínimo 2 opciones (puedes añadir más)
   
4. **Configurar Opciones:**
   - ☑️ **Publicar inmediatamente**: Si está desmarcado, queda en borrador
   - ☑️ **Resultados públicos**: Si los usuarios pueden ver resultados
   - ☑️ **Permitir múltiples respuestas**: Para encuestas con selección múltiple

5. **Clic en "Crear Votación"**

### Gestionar Votaciones Existentes

#### Ver Resultados
- Clic en el icono de gráfica (📊) para ver resultados detallados
- Muestra número de votos y porcentajes por opción
- Gráfica visual de barras

#### Publicar/Despublicar
- Botón verde ✓ = Publicado (visible para usuarios)
- Botón gris ✗ = No publicado (solo visible para admins)

#### Mostrar/Ocultar Resultados
- Icono ojo 👁️ = Resultados públicos
- Icono ojo tachado = Resultados privados

#### Editar
- Clic en el icono de lápiz ✏️
- Puedes cambiar todo excepto los votos ya registrados
- Si ya hay votos, considera crear una nueva votación

#### Eliminar
- Clic en el icono de papelera 🗑️
- **¡Cuidado!** Esto elimina la votación y todos los votos

### Estados de una Votación

1. **No publicada**: Solo visible en admin
2. **Programada**: Publicada pero aún no ha empezado
3. **Activa**: En curso, usuarios pueden votar
4. **Finalizada**: Terminó, no se aceptan más votos

## Para los Usuarios

### Cómo Votar

1. **Estar registrado e iniciar sesión**
2. **Navegar a la sección "Votaciones Activas"**
3. **Leer título y descripción**
4. **Seleccionar una o más opciones** (según configuración)
5. **Clic en "Votar"**
6. **Confirmación**: Aparece mensaje de éxito
7. **Indicador visual**: Badge "Ya votaste" ✓

### Restricciones
- ❌ No se puede votar dos veces en la misma votación
- ❌ No se puede votar sin estar registrado
- ❌ No se puede votar antes de la fecha de inicio
- ❌ No se puede votar después de la fecha de fin

### Ver Resultados
Si el admin configuró los resultados como públicos:
- Botón "Ver Resultados" disponible
- Gráfica de barras con porcentajes
- Número total de participantes

## Ejemplos de Uso

### Votación Simple
```
Título: ¿Qué día prefieres para la asamblea?
Tipo: Votación
Opciones:
  - Lunes 15 de enero
  - Miércoles 17 de enero
  - Viernes 19 de enero
Múltiples respuestas: NO
Resultados públicos: SÍ
```

### Encuesta Múltiple
```
Título: ¿Qué temas te interesan? (puedes elegir varios)
Tipo: Encuesta
Opciones:
  - Condiciones laborales
  - Formación y capacitación
  - Equipamiento
  - Promociones internas
  - Conciliación familiar
Múltiples respuestas: SÍ
Resultados públicos: SÍ
```

### Referéndum Importante
```
Título: Propuesta de modificación de estatutos
Tipo: Referéndum
Opciones:
  - A favor
  - En contra
  - Abstención
Múltiples respuestas: NO
Resultados públicos: NO (hasta que finalice)
```

## Seguridad y Privacidad

### Protección de Datos
- Los votos están vinculados al ID de usuario, no al email visible
- Solo los admins pueden ver quién votó qué
- Las políticas RLS protegen contra accesos no autorizados

### Integridad del Voto
- Constraint UNIQUE previene votos duplicados
- Verificación en backend y frontend
- Registro de timestamp de cada voto

### Auditoría
- Fecha de creación de cada votación
- Fecha de cada voto emitido
- Contador de vistas y participantes

## Solución de Problemas

### "No puedo ver la opción de votar"
- ✅ Verifica que estás registrado e iniciaste sesión
- ✅ Verifica que la votación está activa (entre fechas)
- ✅ Verifica que no hayas votado ya

### "Los resultados no se muestran"
- ✅ El admin debe marcar "Resultados públicos"
- ✅ Debe haber al menos un voto registrado

### "Error al crear votación"
- ✅ Verifica que tienes rol de admin
- ✅ Asegúrate de completar todos los campos obligatorios
- ✅ Añade mínimo 2 opciones
- ✅ La fecha fin debe ser posterior a la fecha inicio

### "No aparece mi votación en la página principal"
- ✅ Marca como "Publicado"
- ✅ Verifica que las fechas estén correctas
- ✅ Refresca la página

## Mejores Prácticas

### Para Admins
1. **Título claro y conciso**: Los usuarios deben entender de qué se trata
2. **Descripción detallada**: Proporciona contexto si es necesario
3. **Opciones equilibradas**: No sesgues las opciones
4. **Tiempo suficiente**: Da al menos 3-7 días para votaciones importantes
5. **Resultados públicos**: Aumenta la transparencia y participación
6. **Anunciar votaciones**: Usa el tablón de anuncios para notificar

### Para Usuarios
1. **Lee bien las opciones**: Asegúrate de entender todas
2. **Vota con tiempo**: No esperes al último día
3. **Participa activamente**: Tu voz cuenta
4. **Revisa resultados**: Mantente informado de las decisiones

## API Reference

### Funciones Principales

```typescript
// Obtener votaciones activas
const votaciones = await getVotacionesActivas();

// Emitir voto
const success = await emitirVoto(votacionId, [opcionId]);

// Obtener resultados
const resultados = await getResultadosVotacion(votacionId);

// Verificar si ya votó
const yaVoto = await usuarioYaVoto(votacionId, userId);
```

## Próximas Mejoras (Roadmap)

- [ ] Exportar resultados a PDF
- [ ] Notificaciones por email de nuevas votaciones
- [ ] Gráficas más avanzadas (circular, donut)
- [ ] Comentarios en votaciones
- [ ] Votaciones con ranking (1ra, 2da, 3ra opción)
- [ ] Delegación de voto
- [ ] Integración con sistema de notificaciones push

## Soporte

Si tienes problemas o sugerencias, contacta con el administrador del sistema o abre un issue en el repositorio.

---

**Versión**: 1.0.0
**Última actualización**: Noviembre 2024
