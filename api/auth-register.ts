import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from './_lib/supabaseAdmin';
import { generateTempPassword } from './_lib/password';

const VERIFICATION_TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function getClientIP(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    nombre, apellidos, dni, email, telefono, parque_sepei,
    terminos_aceptados, generatePassword,
    certificado_nif, certificado_thumbprint, certificado_fecha_validacion, certificado_valido,
  } = req.body || {};

  if (!nombre || !email) {
    return res.status(400).json({ error: 'Faltan nombre o email' });
  }

  const normalizedDni = typeof dni === 'string' && dni.trim() ? dni.toUpperCase().trim() : undefined;
  const normalizedEmail = String(email).trim().toLowerCase();

  const supabase = getSupabaseAdmin();

  try {
    if (normalizedDni) {
      const { data: existingByDni } = await supabase
        .from('users').select('id').eq('dni', normalizedDni).maybeSingle();
      if (existingByDni) {
        return res.status(409).json({ error: 'dni_duplicado' });
      }
    }

    const { data: existingByEmail } = await supabase
      .from('users').select('id').eq('email', normalizedEmail).maybeSingle();
    if (existingByEmail) {
      return res.status(409).json({ error: 'email_duplicado' });
    }

    const insertData: Record<string, any> = {
      nombre: String(nombre).trim(),
      apellidos: apellidos ? String(apellidos).trim() : undefined,
      dni: normalizedDni,
      email: normalizedEmail,
      telefono: telefono ? String(telefono).trim() : undefined,
      parque_sepei: parque_sepei ? String(parque_sepei).trim() : undefined,
      registration_ip: getClientIP(req),
      terminos_aceptados: !!terminos_aceptados,
      certificado_nif,
      certificado_thumbprint,
      certificado_fecha_validacion,
      certificado_valido: !!certificado_valido,
      version_terminos: '1.0',
    };

    let tempPassword: string | undefined;
    let verificationToken: string | undefined;

    if (generatePassword) {
      tempPassword = generateTempPassword(12);
      const bcrypt = await import('bcryptjs');
      insertData.password = await bcrypt.hash(tempPassword, 10);
      insertData.requires_password_change = true;
      insertData.verified = false;
      verificationToken = randomUUID();
      insertData.verification_token = verificationToken;
      insertData.verification_token_expires_at = new Date(Date.now() + VERIFICATION_TOKEN_DURATION_MS).toISOString();
    } else {
      // Registro por certificado FNMT: la identidad ya quedó verificada por el certificado.
      insertData.verified = true;
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert([insertData])
      .select('id, nombre, apellidos, dni, email, verified')
      .single();

    if (error) {
      console.error('Error al registrar usuario:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'duplicado' });
      }
      return res.status(500).json({ error: 'Error al registrar usuario' });
    }

    return res.status(200).json({ user, tempPassword, verificationToken });
  } catch (error: any) {
    console.error('Error en auth-register:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
