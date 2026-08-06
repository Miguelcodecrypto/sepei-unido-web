import { getSupabaseAdmin } from './_lib/supabaseAdmin';
import { generateTempPassword } from './_lib/password';
import { sendEmailInternal } from './_lib/sendEmail';

const GENERIC_MESSAGE = 'Si el email está registrado, recibirás un correo con una nueva contraseña temporal.';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Falta email' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, nombre, dni, email, verified')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // No revelar si el email existe o no.
    if (!user) {
      return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
    }

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
      .update({
        password: hashedPassword,
        requires_password_change: true,
        password_changed_at: null,
      })
      .eq('id', (user as any).id);

    if (updateError) {
      console.error('Error al resetear contraseña:', updateError);
      return res.status(200).json({
        success: false,
        message: 'No se pudo restablecer la contraseña. Inténtalo de nuevo más tarde.',
      });
    }

    const html = `
      <p>Hola ${(user as any).nombre},</p>
      <p>Tu nueva contraseña temporal es: <strong>${tempPassword}</strong></p>
      <p>Deberás cambiarla al iniciar sesión.</p>
      <p>Si no has solicitado este cambio, contacta con el administrador.</p>
    `;
    const emailSent = await sendEmailInternal(req, {
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

    return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
  } catch (error: any) {
    console.error('Error en auth-forgot-password:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar la solicitud.' });
  }
}
