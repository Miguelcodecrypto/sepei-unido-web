# 🤖 Guía de Configuración del Bot de Telegram - SEPEI Unido

## 📋 Resumen

Este documento explica cómo configurar el sistema de notificaciones por Telegram para la plataforma SEPEI Unido.

## 🚀 Paso 1: Crear el Bot en Telegram

1. Abre Telegram y busca **@BotFather**
2. Envía el comando `/newbot`
3. Sigue las instrucciones:
   - **Nombre del bot**: `SEPEI Unido Bot`
   - **Username del bot**: `SepeiUnidoBot` (debe terminar en "bot")
4. BotFather te dará un **token** como este:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
5. **Guarda este token de forma segura**

### Configurar el Bot (Opcional pero recomendado)

Envía estos comandos a @BotFather:

```
/setdescription
```
> Bot oficial del Movimiento SEPEI Unido. Recibe notificaciones de anuncios, votaciones y más.

```
/setabouttext
```
> 🔴 Movimiento SEPEI Unido - Notificaciones en tiempo real

```
/setuserpic
```
> (Sube el logo de SEPEI Unido)

```
/setcommands
```
> start - Iniciar el bot
> estado - Ver estado de vinculación
> desvincular - Desvincular cuenta
> ayuda - Ver comandos disponibles

---

## 🔧 Paso 2: Configurar Variables de Entorno

### En Vercel:

1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Settings → Environment Variables
3. Añade:

| Variable | Valor |
|----------|-------|
| `TELEGRAM_BOT_TOKEN` | `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` |

4. **Importante**: Marca todas las opciones (Production, Preview, Development)
5. Haz clic en "Save"

### Para desarrollo local:

Añade en tu archivo `.env.local`:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## 🗄️ Paso 3: Ejecutar Migración de Base de Datos

1. Ve al SQL Editor de Supabase
2. Copia y pega el contenido de `supabase_add_telegram_support.sql`
3. Ejecuta el script
4. Verifica que se crearon las columnas:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name LIKE 'telegram%';
```

Deberías ver:
- `telegram_chat_id`
- `telegram_username`
- `telegram_linked_at`

---

## 🌐 Paso 4: Configurar el Webhook

Después de desplegar en Vercel, configura el webhook de Telegram.

### Usando curl (Terminal/CMD):

```bash
curl "https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://sepeiunido.org/api/telegram-webhook"
```

Reemplaza:
- `<TU_TOKEN>` con tu token de bot
- `sepeiunido.org` con tu dominio real

### Respuesta esperada:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### Verificar el webhook:
```bash
curl "https://api.telegram.org/bot<TU_TOKEN>/getWebhookInfo"
```

---

## 🧪 Paso 5: Probar el Bot

1. Abre Telegram
2. Busca tu bot: `@SepeiUnidoBot`
3. Envía `/start`
4. Deberías recibir el mensaje de bienvenida

### Probar vinculación:
1. Inicia sesión en la web
2. Ve a tu perfil / configuración
3. Busca "Notificaciones Telegram"
4. Genera un código
5. Envía el código al bot
6. ¡Listo! Tu cuenta está vinculada

---

## 📁 Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `src/services/telegramNotificationService.ts` | Servicio principal de Telegram |
| `src/components/TelegramLink.tsx` | Componente UI para vincular cuentas |
| `api/telegram-send.ts` | API para enviar mensajes |
| `api/telegram-webhook.ts` | Webhook que recibe mensajes del bot |
| `api/telegram-link-code.ts` | Gestión de códigos de vinculación |
| `api/telegram-status.ts` | Verificar estado de vinculación |
| `api/telegram-unlink.ts` | Desvincular cuenta |
| `supabase_add_telegram_support.sql` | Migración de base de datos |

---

## 🔗 Integrar en el Perfil de Usuario

Para añadir el componente de vinculación en el perfil:

```tsx
import TelegramLink from '../components/TelegramLink';

// En tu componente de perfil:
<TelegramLink 
  userId={currentUser.id}
  onStatusChange={(linked) => console.log('Telegram linked:', linked)}
/>
```

---

## 📤 Enviar Notificaciones

### Desde el código:

```typescript
import { 
  sendAnnouncementTelegram,
  sendVotingTelegram,
  sendVotingResultsTelegram
} from '../services/telegramNotificationService';

// Obtener usuarios con Telegram vinculado
const { data: recipients } = await supabase
  .from('usuarios')
  .select('id, telegram_chat_id, nombre, apellidos')
  .not('telegram_chat_id', 'is', null);

// Enviar notificación de anuncio
await sendAnnouncementTelegram(recipients, {
  titulo: 'Nuevo anuncio importante',
  descripcion: 'Descripción del anuncio...',
  categoria: 'General',
  url: 'https://sepeiunido.org/anuncios'
});

// Enviar notificación de votación
await sendVotingTelegram(recipients, {
  titulo: 'Nueva votación disponible',
  descripcion: 'Participa en esta votación...',
  fecha_fin: '2026-02-15',
  url: 'https://sepeiunido.org/votaciones'
});
```

---

## 💰 Costes

**¡100% GRATUITO!** 🎉

La API de Telegram Bot es completamente gratuita:
- Sin límite de mensajes
- Sin costes por usuario
- Sin necesidad de tarjeta de crédito

---

## 🔒 Seguridad

- Los tokens de bot nunca se exponen al frontend
- Los códigos de vinculación expiran en 15 minutos
- Solo usuarios verificados pueden vincular Telegram
- El webhook solo responde a Telegram

---

## 🐛 Solución de Problemas

### El bot no responde:
1. Verifica que el webhook está configurado: `getWebhookInfo`
2. Revisa los logs en Vercel
3. Asegúrate de que `TELEGRAM_BOT_TOKEN` está configurado

### Error al vincular:
1. Verifica que la migración SQL se ejecutó
2. Comprueba que el código no ha expirado
3. Revisa los logs de la API

### Mensajes no se envían:
1. Verifica que el usuario tiene `telegram_chat_id`
2. El usuario puede haber bloqueado el bot
3. Revisa rate limits de Telegram (30 msg/seg)

---

## 📞 Soporte

Si tienes problemas, revisa:
1. Logs de Vercel
2. Logs de Supabase
3. `getWebhookInfo` de Telegram
