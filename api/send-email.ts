/**
 * Envío de correo para el panel de administración (avisos de anuncios, votaciones y
 * resultados a las listas de destinatarios).
 *
 * Exige token de admin SIEMPRE. Antes solo se pedía cuando la petición traía
 * `attachments`, así que un envío simple no requería nada: cualquiera podía POSTear
 * aquí y escribir a cualquier dirección desde noreply@sepeiunido.org — suplantando al
 * movimiento ante sus propios compañeros y quemando la reputación del dominio en
 * Resend. Los correos que nacen de un flujo público (confirmación de una propuesta,
 * aviso de alta de un usuario) ya no pasan por aquí: los manda el servidor desde
 * `api/suggestions.ts` y `api/auth.ts`, que son quienes conocen al destinatario.
 *
 * ⚠️ Convive aquí una acción PÚBLICA, `?action=unsubscribe`, que NO envía nada:
 * solo da de baja a un contacto externo a partir del token aleatorio que lleva su
 * propio correo. Vive en este archivo por el límite de 12 funciones del plan
 * Hobby, no porque comparta permisos: el resto del endpoint sigue exigiendo token
 * de admin y no se ha relajado nada.
 */
import { sendEmailViaResend, type EmailAttachment } from './_lib/resend.js';
import { verifyAdminToken, getBearerToken } from './_lib/adminAuth.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

/** UUID v4 tal y como los genera `gen_random_uuid()`. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Baja de un contacto externo.
 *
 * Las dos acciones son POST a propósito. Gmail, Safe Links y los antivirus
 * corporativos ABREN los enlaces de los correos para escanearlos: si la baja se
 * ejecutara con el GET del enlace, se daría de baja a gente que nunca lo pidió.
 * Por eso el correo lleva a una página que pregunta, y la baja solo ocurre
 * cuando alguien pulsa el botón. Es el mismo razonamiento por el que no se vota
 * dentro del correo.
 */
async function handleUnsubscribe(req: any, res: any, soloConsultar: boolean) {
  const token = req.body?.token;
  if (typeof token !== 'string' || !UUID.test(token)) {
    return res.status(400).json({ error: 'Enlace de baja no válido' });
  }

  const supabase = getSupabaseAdmin();
  const { data: contacto, error } = await supabase
    .from('external_emails')
    .select('id, email, nombre, activo, baja_at')
    .eq('unsubscribe_token', token)
    .maybeSingle();

  if (error) {
    console.error('[UNSUBSCRIBE] Error al buscar el contacto:', error);
    return res.status(500).json({ error: 'No se ha podido completar la operación' });
  }

  // Un token que no existe no dice nada más: ni confirma ni desmiente direcciones.
  if (!contacto) {
    return res.status(404).json({ error: 'Enlace de baja no válido' });
  }

  const yaDeBaja = !(contacto as any).activo;

  if (soloConsultar) {
    return res.status(200).json({ email: (contacto as any).email, nombre: (contacto as any).nombre, yaDeBaja });
  }

  // Repetir la baja no es un error: el enlace sigue en su bandeja para siempre.
  if (yaDeBaja) {
    return res.status(200).json({ email: (contacto as any).email, yaDeBaja: true });
  }

  const { error: updateError } = await supabase
    .from('external_emails')
    .update({ activo: false, baja_at: new Date().toISOString() })
    .eq('id', (contacto as any).id);

  if (updateError) {
    console.error('[UNSUBSCRIBE] Error al dar de baja:', updateError);
    return res.status(500).json({ error: 'No se ha podido completar la baja' });
  }

  return res.status(200).json({ email: (contacto as any).email, yaDeBaja: true });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query?.action;
  if (action === 'unsubscribe' || action === 'unsubscribe-info') {
    return await handleUnsubscribe(req, res, action === 'unsubscribe-info');
  }

  if (!verifyAdminToken(getBearerToken(req))) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { to, subject, html, text, attachments } = req.body || {};
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let validatedAttachments: EmailAttachment[] | undefined;
  if (attachments != null) {
    if (!Array.isArray(attachments) || attachments.some((a: any) => typeof a?.path !== 'string' || typeof a?.filename !== 'string')) {
      return res.status(400).json({ error: 'Formato de adjuntos inválido' });
    }
    validatedAttachments = attachments;
  }

  const sent = await sendEmailViaResend({ to, subject, html, text, attachments: validatedAttachments });

  if (!sent) {
    return res.status(500).json({ error: 'Failed to send email' });
  }

  return res.status(200).json({ success: true });
}
