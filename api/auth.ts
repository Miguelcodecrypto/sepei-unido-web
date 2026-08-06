/**
 * Endpoint único de autenticación de usuario (Vercel Hobby limita a 12 funciones serverless
 * por deployment, así que login/sesión/registro/verificación/contraseña se consolidan aquí
 * y se despachan por ?action=).
 */
import { randomBytes, randomUUID } from 'crypto';
import { getSupabaseAdmin } from './_lib/supabaseAdmin';
import { getBearerToken } from './_lib/adminAuth';
import { generateTempPassword } from './_lib/password';
import { sendEmailViaResend } from './_lib/resend';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const VERIFICATION_TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const GENERIC_RESET_MESSAGE = 'Si el email está registrado, recibirás un correo con una nueva contraseña temporal.';

function getClientIP(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function toPublicUser(user: any) {
  const { id, dni, nombre, apellidos, email, verified, autorizado_votar, requires_password_change } = user;
  return { id, dni, nombre, apellidos, email, verified, autorizado_votar, requires_password_change };
}

// ---- action=login ----
async function handleLogin(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { dni, password } = req.body || {};
  if (!dni || !password || typeof dni !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Faltan DNI o contraseña' });
  }

  const { data: user, error: userError } = await supabase
    .from('users').select('*').eq('dni', dni.toUpperCase().trim()).maybeSingle();

  if (userError) {
    console.error('Error al buscar usuario:', userError);
    return res.status(500).json({ error: 'Error interno' });
  }
  if (!user || !(user as any).password) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const bcrypt = await import('bcryptjs');
  const isValid = await bcrypt.compare(password, (user as any).password);
  if (!isValid) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  if (!(user as any).verified) {
    return res.status(403).json({ error: 'Tu cuenta aún no está verificada. Revisa tu email.' });
  }

  const sessionToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const { error: sessionError } = await supabase.from('user_sessions').insert({
    user_id: (user as any).id,
    session_token: sessionToken,
    expires_at: expiresAt,
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'] || 'unknown',
    is_active: true,
  });
  if (sessionError) {
    console.error('Error al crear sesión:', sessionError);
    return res.status(500).json({ error: 'Error al crear sesión' });
  }

  await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', (user as any).id);

  return res.status(200).json({ sessionToken, user: toPublicUser(user) });
}

// ---- action=session (GET) ----
async function handleSession(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Falta token de sesión' });

  const { data: session, error: sessionError } = await supabase
    .from('user_sessions').select('*').eq('session_token', token).eq('is_active', true).maybeSingle();

  if (sessionError || !session) return res.status(401).json({ error: 'Sesión no encontrada o inactiva' });

  if (new Date((session as any).expires_at) < new Date()) {
    await supabase.from('user_sessions').update({ is_active: false }).eq('session_token', token);
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, dni, nombre, apellidos, email, verified, autorizado_votar, requires_password_change')
    .eq('id', (session as any).user_id)
    .single();

  if (userError || !user) return res.status(404).json({ error: 'Usuario no encontrado' });

  await supabase.from('user_sessions').update({ last_activity: new Date().toISOString() }).eq('session_token', token);

  return res.status(200).json({ user });
}

// ---- action=logout ----
async function handleLogout(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const token = getBearerToken(req) || (req.body && req.body.sessionToken);
  if (!token) return res.status(400).json({ error: 'Falta token de sesión' });

  await supabase.from('user_sessions').update({ is_active: false }).eq('session_token', token);
  return res.status(200).json({ success: true });
}

// ---- action=register ----
async function handleRegister(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const {
    nombre, apellidos, dni, email, telefono, parque_sepei,
    terminos_aceptados, generatePassword,
    certificado_nif, certificado_thumbprint, certificado_fecha_validacion, certificado_valido,
  } = req.body || {};

  if (!nombre || !email) return res.status(400).json({ error: 'Faltan nombre o email' });

  const normalizedDni = typeof dni === 'string' && dni.trim() ? dni.toUpperCase().trim() : undefined;
  const normalizedEmail = String(email).trim().toLowerCase();

  if (normalizedDni) {
    const { data: existingByDni } = await supabase.from('users').select('id').eq('dni', normalizedDni).maybeSingle();
    if (existingByDni) return res.status(409).json({ error: 'dni_duplicado' });
  }

  const { data: existingByEmail } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle();
  if (existingByEmail) return res.status(409).json({ error: 'email_duplicado' });

  const insertData: Record<string, any> = {
    nombre: String(nombre).trim(),
    apellidos: apellidos ? String(apellidos).trim() : undefined,
    dni: normalizedDni,
    email: normalizedEmail,
    telefono: telefono ? String(telefono).trim() : undefined,
    parque_sepei: parque_sepei ? String(parque_sepei).trim() : undefined,
    registration_ip: getClientIP(req),
    terminos_aceptados: !!terminos_aceptados,
    // certificado_nif/thumbprint/fecha se guardan como referencia, pero certificado_valido
    // NUNCA se toma del cliente: este endpoint no valida la cadena X.509 del certificado
    // FNMT server-side, así que no hay base real para confiar en esa afirmación.
    certificado_nif, certificado_thumbprint, certificado_fecha_validacion,
    certificado_valido: false,
    version_terminos: '1.0',
    verified: false,
  };

  let tempPassword: string | undefined;
  let verificationToken: string | undefined;

  if (generatePassword) {
    tempPassword = generateTempPassword(12);
    const bcrypt = await import('bcryptjs');
    insertData.password = await bcrypt.hash(tempPassword, 10);
    insertData.requires_password_change = true;
  }

  // Todo registro (con contraseña o por certificado) requiere verificación por email:
  // ningún camino queda "verified" solo por lo que el cliente afirme.
  verificationToken = randomUUID();
  insertData.verification_token = verificationToken;
  insertData.verification_token_expires_at = new Date(Date.now() + VERIFICATION_TOKEN_DURATION_MS).toISOString();

  const { data: user, error } = await supabase
    .from('users').insert([insertData]).select('id, nombre, apellidos, dni, email, verified').single();

  if (error) {
    console.error('Error al registrar usuario:', error);
    if (error.code === '23505') return res.status(409).json({ error: 'duplicado' });
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }

  return res.status(200).json({ user, tempPassword, verificationToken });
}

// ---- action=verify-email ----
async function handleVerifyEmail(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Falta token' });

  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, nombre, apellidos, dni, email, verified, fecha_registro, verification_token_expires_at')
    .eq('verification_token', token)
    .maybeSingle();

  if (findError || !user) return res.status(404).json({ status: 'invalid' });
  if ((user as any).verified) return res.status(409).json({ status: 'already_verified' });

  const expiresAt = (user as any).verification_token_expires_at;
  if (expiresAt && new Date(expiresAt) < new Date()) return res.status(410).json({ status: 'expired' });

  const { error: updateError } = await supabase
    .from('users')
    .update({ verified: true, verification_token: null, verification_token_expires_at: null })
    .eq('id', (user as any).id);

  if (updateError) {
    console.error('Error al verificar usuario:', updateError);
    return res.status(500).json({ status: 'error' });
  }

  const { verification_token_expires_at, ...publicUser } = user as any;
  return res.status(200).json({ status: 'success', user: publicUser });
}

// ---- action=change-password ----
async function handleChangePassword(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { dni, currentPassword, newPassword } = req.body || {};
  if (!dni || !currentPassword || !newPassword) return res.status(400).json({ error: 'Faltan datos' });

  const { data: user, error: findError } = await supabase
    .from('users').select('id, password').eq('dni', String(dni).toUpperCase().trim()).maybeSingle();

  if (findError || !user || !(user as any).password) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const bcrypt = await import('bcryptjs');
  const isValid = await bcrypt.compare(currentPassword, (user as any).password);
  if (!isValid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedNewPassword, requires_password_change: false, password_changed_at: new Date().toISOString() })
    .eq('id', (user as any).id);

  if (updateError) {
    console.error('Error al actualizar contraseña:', updateError);
    return res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }

  return res.status(200).json({ success: true });
}

// ---- action=forgot-password ----
async function handleForgotPassword(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Falta email' });

  const normalizedEmail = email.trim().toLowerCase();
  const { data: user } = await supabase
    .from('users').select('id, nombre, dni, email, verified').eq('email', normalizedEmail).maybeSingle();

  if (!user) return res.status(200).json({ success: true, message: GENERIC_RESET_MESSAGE });

  if (!(user as any).verified) {
    return res.status(200).json({
      success: false,
      message: 'Tu cuenta aún no está verificada. Revisa el email de verificación que te enviamos.',
    });
  }

  const tempPassword = generateTempPassword(12);
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedPassword, requires_password_change: true, password_changed_at: null })
    .eq('id', (user as any).id);

  if (updateError) {
    console.error('Error al resetear contraseña:', updateError);
    return res.status(200).json({ success: false, message: 'No se pudo restablecer la contraseña. Inténtalo de nuevo más tarde.' });
  }

  const html = `
    <p>Hola ${(user as any).nombre},</p>
    <p>Tu nueva contraseña temporal es: <strong>${tempPassword}</strong></p>
    <p>Deberás cambiarla al iniciar sesión.</p>
    <p>Si no has solicitado este cambio, contacta con el administrador.</p>
  `;
  const emailSent = await sendEmailViaResend({
    to: (user as any).email,
    subject: 'Restablecimiento de contraseña - SEPEI UNIDO',
    html,
    text: `Tu nueva contraseña temporal es: ${tempPassword}`,
  });

  if (!emailSent) {
    return res.status(200).json({
      success: false,
      message: 'La contraseña se ha restablecido, pero hubo un error al enviar el email. Inténtalo de nuevo en unos minutos.',
    });
  }

  return res.status(200).json({ success: true, message: GENERIC_RESET_MESSAGE });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  const action = req.query.action as string;
  const supabase = getSupabaseAdmin();

  try {
    if (action === 'session') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      return await handleSession(req, res, supabase);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    switch (action) {
      case 'login': return await handleLogin(req, res, supabase);
      case 'logout': return await handleLogout(req, res, supabase);
      case 'register': return await handleRegister(req, res, supabase);
      case 'verify-email': return await handleVerifyEmail(req, res, supabase);
      case 'change-password': return await handleChangePassword(req, res, supabase);
      case 'forgot-password': return await handleForgotPassword(req, res, supabase);
      default: return res.status(400).json({ error: 'Acción no reconocida' });
    }
  } catch (error: any) {
    console.error(`Error en auth?action=${action}:`, error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
