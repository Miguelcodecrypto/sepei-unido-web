import { getSupabaseAdmin } from './_lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Falta token' });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, nombre, apellidos, dni, email, verified, fecha_registro, verification_token_expires_at')
      .eq('verification_token', token)
      .maybeSingle();

    if (findError || !user) {
      return res.status(404).json({ status: 'invalid' });
    }

    if ((user as any).verified) {
      return res.status(409).json({ status: 'already_verified' });
    }

    const expiresAt = (user as any).verification_token_expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.status(410).json({ status: 'expired' });
    }

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
  } catch (error: any) {
    console.error('Error en auth-verify-email:', error);
    return res.status(500).json({ status: 'error' });
  }
}
