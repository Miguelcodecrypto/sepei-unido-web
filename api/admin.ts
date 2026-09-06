/**
 * Endpoint único de administración (Vercel Hobby limita a 12 funciones serverless
 * por deployment, así que login/gestión de usuarios/seguridad se consolidan aquí
 * y se despachan por ?resource=).
 */
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { createAdminToken, verifyAdminToken, getBearerToken } from './_lib/adminAuth.js';
import { getClientIP, checkLoginAllowed, recordLoginAttempt } from './_lib/adminSecurity.js';
import { generateTempPassword } from './_lib/password.js';

const USERS_PUBLIC_COLUMNS = [
  'id', 'nombre', 'apellidos', 'dni', 'email', 'telefono', 'parque_sepei',
  'fecha_registro', 'terminos_aceptados', 'fecha_aceptacion_terminos', 'version_terminos',
  'certificado_nif', 'certificado_thumbprint', 'certificado_fecha_validacion', 'certificado_valido',
  'autorizado_votar', 'telegram_chat_id', 'telegram_username', 'telegram_linked_at',
  'verified', 'email_notifications',
].join(', ');

function passwordMatches(input: string, expected: string): boolean {
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}

// ---- resource=login (sin autenticación previa) ----
async function handleLogin(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD no está configurada en el servidor');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Falta la contraseña' });
  }

  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  const gate = await checkLoginAllowed(ip);
  if (!gate.allowed) return res.status(429).json({ error: gate.message });

  const success = passwordMatches(password, adminPassword);
  await recordLoginAttempt(ip, userAgent, success);

  if (!success) return res.status(401).json({ error: 'Contraseña incorrecta' });

  return res.status(200).json({ token: createAdminToken() });
}

// ---- resource=users (protegido) ----
async function handleUsers(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('users').select(USERS_PUBLIC_COLUMNS).order('fecha_registro', { ascending: false });
    if (error) {
      console.error('Error al listar usuarios:', error);
      return res.status(500).json({ error: 'Error al listar usuarios' });
    }
    return res.status(200).json({ users: data || [] });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Falta id' });
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar usuario:', error);
      return res.status(500).json({ error: 'Error al eliminar usuario' });
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PATCH') {
    const { action, userId } = req.body || {};
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'Falta userId' });

    if (action === 'toggle_voting') {
      const { autorizado } = req.body;
      const { error } = await supabase.from('users').update({ autorizado_votar: !!autorizado }).eq('id', userId);
      if (error) {
        console.error('Error al actualizar autorización de voto:', error);
        return res.status(500).json({ error: 'Error al actualizar autorización' });
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'reset_password') {
      const tempPassword = generateTempPassword(12);
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const { error } = await supabase
        .from('users')
        .update({ password: hashedPassword, requires_password_change: true, password_changed_at: null })
        .eq('id', userId);

      if (error) {
        console.error('Error al resetear contraseña:', error);
        return res.status(500).json({ error: 'Error al resetear contraseña' });
      }
      return res.status(200).json({ success: true, tempPassword });
    }

    return res.status(400).json({ error: 'Acción no reconocida' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BULK_CONTACTS = 2000;

// ---- resource=external_emails (protegido) ----
async function handleExternalEmails(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('external_emails').select('*').order('nombre', { ascending: true });
    if (error) {
      console.error('Error al listar emails externos:', error);
      return res.status(500).json({ error: 'Error al listar emails externos' });
    }
    return res.status(200).json({ externalEmails: data || [] });
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'create') {
      const { email, nombre, descripcion } = req.body || {};
      if (typeof email !== 'string' || typeof nombre !== 'string' || !email.trim() || !nombre.trim()) {
        return res.status(400).json({ error: 'Email y nombre son obligatorios' });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Formato de email inválido' });
      }

      const { data, error } = await supabase
        .from('external_emails')
        .insert([{ email: normalizedEmail, nombre: nombre.trim(), descripcion: descripcion?.trim() || null, activo: true }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Este email ya existe' });
        console.error('Error al crear email externo:', error);
        return res.status(500).json({ error: 'Error al crear email externo' });
      }
      return res.status(200).json({ externalEmail: data });
    }

    if (action === 'bulk_create') {
      const { contacts } = req.body || {};
      if (!Array.isArray(contacts)) return res.status(400).json({ error: 'Falta el array de contactos' });
      if (contacts.length === 0) return res.status(400).json({ error: 'El archivo no contiene contactos' });
      if (contacts.length > MAX_BULK_CONTACTS) {
        return res.status(400).json({ error: `Máximo ${MAX_BULK_CONTACTS} contactos por importación` });
      }

      const invalid: Array<{ row: number; reason: string }> = [];
      const seenInFile = new Set<string>();
      const toInsert: Array<{ email: string; nombre: string; descripcion: string | null }> = [];

      contacts.forEach((contact: any, index: number) => {
        const row = index + 1;
        const rawEmail = typeof contact?.email === 'string' ? contact.email.trim().toLowerCase() : '';
        const rawNombre = typeof contact?.nombre === 'string' ? contact.nombre.trim() : '';
        const rawDescripcion = typeof contact?.descripcion === 'string' ? contact.descripcion.trim() : '';

        if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
          invalid.push({ row, reason: 'Email inválido o vacío' });
          return;
        }
        if (!rawNombre) {
          invalid.push({ row, reason: 'Falta el nombre' });
          return;
        }
        if (seenInFile.has(rawEmail)) {
          invalid.push({ row, reason: 'Email duplicado dentro del propio archivo' });
          return;
        }
        seenInFile.add(rawEmail);
        toInsert.push({ email: rawEmail, nombre: rawNombre, descripcion: rawDescripcion || null });
      });

      let alreadyExists = 0;
      let created = 0;

      if (toInsert.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from('external_emails')
          .select('email')
          .in('email', toInsert.map((c) => c.email));

        if (existingError) {
          console.error('Error al comprobar emails existentes:', existingError);
          return res.status(500).json({ error: 'Error al comprobar emails existentes' });
        }

        const existingSet = new Set((existingRows || []).map((r: any) => r.email));
        alreadyExists = toInsert.filter((c) => existingSet.has(c.email)).length;
        const finalInsert = toInsert
          .filter((c) => !existingSet.has(c.email))
          .map((c) => ({ ...c, activo: true }));

        if (finalInsert.length > 0) {
          const { error: insertError } = await supabase.from('external_emails').insert(finalInsert);
          if (insertError) {
            console.error('Error al importar emails externos:', insertError);
            return res.status(500).json({ error: 'Error al importar emails externos' });
          }
          created = finalInsert.length;
        }
      }

      return res.status(200).json({ created, alreadyExists, invalid });
    }

    return res.status(400).json({ error: 'Acción no reconocida' });
  }

  if (req.method === 'PATCH') {
    const { id, updates } = req.body || {};
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Falta id' });
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Faltan datos a actualizar' });

    const allowedFields = ['email', 'nombre', 'descripcion', 'activo'];
    const sanitized: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in updates) sanitized[field] = updates[field];
    }
    if (typeof sanitized.email === 'string') {
      sanitized.email = sanitized.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(sanitized.email)) return res.status(400).json({ error: 'Formato de email inválido' });
    }
    if (Object.keys(sanitized).length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    const { error } = await supabase.from('external_emails').update(sanitized).eq('id', id);
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Este email ya existe' });
      console.error('Error al actualizar email externo:', error);
      return res.status(500).json({ error: 'Error al actualizar email externo' });
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Falta id' });
    const { error } = await supabase.from('external_emails').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar email externo:', error);
      return res.status(500).json({ error: 'Error al eliminar email externo' });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ---- resource=announcements (protegido) ----
// La lectura pública (solo publicados) sigue haciéndose con la anon key desde
// getPublishedAnnouncements; aquí van las operaciones que no debe poder hacer
// cualquier visitante: listar borradores y crear/editar/borrar.
const ANNOUNCEMENT_WRITABLE_COLUMNS = [
  'titulo',
  'contenido',
  'categoria',
  'imagen_url',
  'archivo_url',
  'archivo_nombre',
  'archivo_tipo',
  'publicado',
  'destacado',
  'es_html',
  'fecha_publicacion',
  'autor',
];

const ATTACHMENT_WRITABLE_COLUMNS = ['announcement_id', 'url', 'nombre', 'tipo', 'categoria'];

function pickColumns(source: Record<string, any>, allowed: string[]): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const field of allowed) {
    if (field in source) picked[field] = source[field];
  }
  return picked;
}

async function handleAnnouncements(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  // Listado completo del panel (incluye borradores, que la política pública no deja ver)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, attachments:announcements_attachments(*)')
      .order('fecha_publicacion', { ascending: false });

    if (error) {
      console.error('Error al listar anuncios:', error);
      return res.status(500).json({ error: 'Error al listar anuncios' });
    }
    return res.status(200).json({ announcements: data || [] });
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'create') {
      const { announcement } = req.body || {};
      if (!announcement || typeof announcement.titulo !== 'string' || !announcement.titulo.trim()) {
        return res.status(400).json({ error: 'El título es obligatorio' });
      }

      const values = pickColumns(announcement, ANNOUNCEMENT_WRITABLE_COLUMNS);
      values.es_html = values.es_html || false;
      values.vistas = 0;

      const { data, error } = await supabase
        .from('announcements')
        .insert([values])
        .select('*, attachments:announcements_attachments(*)')
        .single();

      if (error) {
        console.error('Error al crear anuncio:', error);
        return res.status(500).json({ error: 'Error al crear anuncio' });
      }
      return res.status(200).json({ announcement: data });
    }

    if (action === 'add_attachment') {
      const { attachment } = req.body || {};
      if (!attachment || typeof attachment.announcement_id !== 'string' || typeof attachment.url !== 'string') {
        return res.status(400).json({ error: 'Faltan announcement_id o url' });
      }

      const { data, error } = await supabase
        .from('announcements_attachments')
        .insert([pickColumns(attachment, ATTACHMENT_WRITABLE_COLUMNS)])
        .select()
        .single();

      if (error) {
        console.error('Error al crear adjunto:', error);
        return res.status(500).json({ error: 'Error al crear adjunto' });
      }
      return res.status(200).json({ attachment: data });
    }

    return res.status(400).json({ error: 'Acción no reconocida' });
  }

  if (req.method === 'PATCH') {
    const { id, updates } = req.body || {};
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Falta id' });
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Faltan updates' });

    const sanitized = pickColumns(updates, ANNOUNCEMENT_WRITABLE_COLUMNS);
    if (Object.keys(sanitized).length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    const { error } = await supabase.from('announcements').update(sanitized).eq('id', id);
    if (error) {
      console.error('Error al actualizar anuncio:', error);
      return res.status(500).json({ error: 'Error al actualizar anuncio' });
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { id, attachment_id } = req.query;

    if (typeof attachment_id === 'string' && attachment_id) {
      const { error } = await supabase.from('announcements_attachments').delete().eq('id', attachment_id);
      if (error) {
        console.error('Error al eliminar adjunto:', error);
        return res.status(500).json({ error: 'Error al eliminar adjunto' });
      }
      return res.status(200).json({ success: true });
    }

    if (typeof id === 'string' && id) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) {
        console.error('Error al eliminar anuncio:', error);
        return res.status(500).json({ error: 'Error al eliminar anuncio' });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Falta id o attachment_id' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ---- resource=analytics (protegido) ----
// El tracking (INSERT en site_visits/user_interactions) se queda en el cliente
// con la anon key: es de alto volumen y no vale la pena pasarlo por una función
// serverless. Lo que pasa por aquí son las LECTURAS del dashboard, que antes
// hacía el navegador directamente contra las tablas — sin RLS, así que
// cualquiera con la anon key podía leer la IP y el user-agent de todas las
// visitas, incluidas las de usuarios identificados (PII bajo RGPD).

function startDateFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function parseDays(value: any, fallback = 30): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 365);
}

async function analyticsSummary(supabase: ReturnType<typeof getSupabaseAdmin>, days: number) {
  const startDate = startDateFromDays(days);

  // Los totales se piden con count exacto y head: PostgREST devuelve como mucho
  // 1000 filas por consulta, así que contar en JS sobre el resultado daría cifras
  // mal en cuanto la tabla crece (ya hay más de 3000 visitas).
  const totalQuery = supabase
    .from('site_visits')
    .select('*', { count: 'exact', head: true })
    .gte('visited_at', startDate);
  const authQuery = supabase
    .from('site_visits')
    .select('*', { count: 'exact', head: true })
    .not('user_id', 'is', null)
    .gte('visited_at', startDate);
  const anonQuery = supabase
    .from('site_visits')
    .select('*', { count: 'exact', head: true })
    .is('user_id', null)
    .gte('visited_at', startDate);

  const [totalRes, authRes, anonRes] = await Promise.all([totalQuery, authQuery, anonQuery]);
  if (totalRes.error) throw totalRes.error;

  // Para los distintos sí hacen falta las filas. Se sube el límite explícitamente
  // por el mismo motivo de arriba.
  const { data: visits, error } = await supabase
    .from('site_visits')
    .select('user_id, session_id')
    .gte('visited_at', startDate)
    .limit(100000);

  if (error) throw error;

  const rows = visits || [];
  const authenticated = rows.filter((v: any) => v.user_id);
  const anonymous = rows.filter((v: any) => !v.user_id);

  const { data: byDay } = await supabase
    .from('analytics_summary')
    .select('visit_date, visits')
    .gte('visit_date', startDate.split('T')[0])
    .order('visit_date', { ascending: false })
    .limit(days);

  return {
    totalVisits: totalRes.count || 0,
    uniqueUsers: new Set(authenticated.map((v: any) => v.user_id)).size,
    authenticatedVisits: authRes.count || 0,
    anonymousVisits: anonRes.count || 0,
    uniqueSessions: new Set(anonymous.map((v: any) => v.session_id)).size,
    pageViews: totalRes.count || 0,
    visitsByDay: (byDay || []).map((d: any) => ({ date: d.visit_date, visits: d.visits })),
  };
}

async function analyticsSections(supabase: ReturnType<typeof getSupabaseAdmin>, days: number) {
  const { data, error } = await supabase
    .from('user_interactions')
    .select('section')
    .gte('created_at', startDateFromDays(days))
    .limit(100000);

  if (error) throw error;

  const counts: Record<string, number> = {
    announcements: 0, voting: 0, suggestions: 0, admin: 0, interinos: 0,
  };
  for (const row of data || []) {
    if ((row as any).section in counts) counts[(row as any).section]++;
  }
  return counts;
}

async function analyticsTopUsers(supabase: ReturnType<typeof getSupabaseAdmin>, limit: number) {
  const { data, error } = await supabase.rpc('get_top_active_users', { limit_count: limit });
  if (error) throw error;
  return data || [];
}

async function analyticsInterinos(supabase: ReturnType<typeof getSupabaseAdmin>, days: number) {
  const { data, error } = await supabase
    .from('user_interactions')
    .select('user_id, interaction_type, duration_seconds, created_at')
    .eq('section', 'interinos')
    .gte('created_at', startDateFromDays(days))
    .limit(100000);

  if (error) throw error;
  const interactions = (data || []) as any[];

  const interactionsByType: Record<string, number> = {};
  const userInteractionCount: Record<string, number> = {};
  const visitsByDayMap: Record<string, number> = {};
  let durationSum = 0;
  let durationCount = 0;

  for (const i of interactions) {
    interactionsByType[i.interaction_type] = (interactionsByType[i.interaction_type] || 0) + 1;
    if (i.user_id) userInteractionCount[i.user_id] = (userInteractionCount[i.user_id] || 0) + 1;
    if (i.duration_seconds) { durationSum += i.duration_seconds; durationCount++; }
    const date = new Date(i.created_at).toISOString().split('T')[0];
    visitsByDayMap[date] = (visitsByDayMap[date] || 0) + 1;
  }

  // Nombres de los usuarios más activos: aquí se resuelven con service_role, así
  // el cliente ya no necesita descargarse la lista completa de usuarios.
  const userIds = Object.keys(userInteractionCount);
  let topUsers: Array<{ user_id: string; user_name: string; interactions: number }> = [];
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, nombre, apellidos')
      .in('id', userIds);

    topUsers = Object.entries(userInteractionCount)
      .map(([userId, count]) => {
        const user = (users || []).find((u: any) => u.id === userId) as any;
        return {
          user_id: userId,
          user_name: user ? `${user.nombre} ${user.apellidos || ''}`.trim() : 'Usuario',
          interactions: count,
        };
      })
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 10);
  }

  const totalInteractions = interactions.length;

  return {
    totalVisits: interactionsByType['view_interinos'] || interactionsByType['enter_section'] || totalInteractions,
    uniqueUsers: new Set(interactions.filter((i) => i.user_id).map((i) => i.user_id)).size,
    totalInteractions,
    interactionsByType,
    averageTimeSeconds: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    topUsers,
    visitsByDay: Object.entries(visitsByDayMap)
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, days),
    documentDownloads: interactionsByType['download_document'] || interactionsByType['view_bibliography'] || 0,
    linkClicks: interactionsByType['click_link'] || interactionsByType['view_link'] || 0,
    courseViews: interactionsByType['view_course'] || interactionsByType['click_course'] || 0,
  };
}

async function analyticsInterinosContent(supabase: ReturnType<typeof getSupabaseAdmin>) {
  // OJO: la versión anterior filtraba por .eq('activo', true) y esa columna NO
  // existe en interinos_bibliografia (error 42703). La consulta fallaba siempre
  // y el panel mostraba 0 en todos los contadores, en silencio.
  const { data, error } = await supabase.from('interinos_bibliografia').select('categoria');
  if (error) throw error;

  const rows = (data || []) as any[];
  const documentsByCategory: Record<string, number> = {};
  for (const row of rows) {
    documentsByCategory[row.categoria] = (documentsByCategory[row.categoria] || 0) + 1;
  }
  const countOf = (categoria: string) => rows.filter((c) => c.categoria === categoria).length;

  return {
    totalDocuments: countOf('formacion_bibliografia'),
    totalCourses: countOf('formacion_curso'),
    totalLinks: countOf('formacion_enlace'),
    totalNews: countOf('noticias_destacadas'),
    totalOposiciones: countOf('oposiciones'),
    documentsByCategory,
  };
}

async function handleAnalytics(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const detail = req.query.detail as string;
  const days = parseDays(req.query.days);

  if (detail === 'summary') {
    return res.status(200).json({ summary: await analyticsSummary(supabase, days) });
  }
  if (detail === 'sections') {
    return res.status(200).json({ sections: await analyticsSections(supabase, days) });
  }
  if (detail === 'top_users') {
    const limit = parseDays(req.query.limit, 10);
    return res.status(200).json({ users: await analyticsTopUsers(supabase, limit) });
  }
  if (detail === 'interinos') {
    return res.status(200).json({ interinos: await analyticsInterinos(supabase, days) });
  }
  if (detail === 'interinos_content') {
    return res.status(200).json({ stats: await analyticsInterinosContent(supabase) });
  }

  return res.status(400).json({ error: 'detail no reconocido' });
}

// ---- resource=interinos (protegido) ----
// La lectura sigue siendo pública con la anon key (getInterinosContenido): la
// bibliografía de Interinos está pensada para verse sin login. Lo que pasa por
// aquí es la escritura, que antes hacía el navegador directamente contra la
// tabla — sin RLS ni políticas, así que cualquiera con la anon key del bundle
// podía crear o borrar recursos de la sección.
const INTERINOS_WRITABLE_COLUMNS = ['titulo', 'descripcion', 'url', 'nombre', 'tipo', 'categoria', 'created_by'];

const INTERINOS_CATEGORIAS = [
  'bibliografia',
  'formacion_bibliografia',
  'formacion_curso',
  'formacion_enlace',
  'noticias_destacadas',
  'oposiciones',
];

async function handleInterinos(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (req.method === 'POST') {
    const { item } = req.body || {};
    if (!item || typeof item.titulo !== 'string' || !item.titulo.trim()) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    if (typeof item.url !== 'string' || !item.url.trim()) {
      return res.status(400).json({ error: 'La url es obligatoria' });
    }

    const values = pickColumns(item, INTERINOS_WRITABLE_COLUMNS);
    values.categoria = values.categoria || 'bibliografia';
    if (!INTERINOS_CATEGORIAS.includes(values.categoria)) {
      return res.status(400).json({ error: 'Categoría no reconocida' });
    }
    values.created_by = values.created_by || null;

    const { data, error } = await supabase
      .from('interinos_bibliografia')
      .insert([values])
      .select()
      .single();

    if (error) {
      console.error('Error al crear contenido de interinos:', error);
      return res.status(500).json({ error: 'Error al crear contenido de interinos' });
    }
    return res.status(200).json({ item: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (typeof id !== 'string' || !id) return res.status(400).json({ error: 'Falta id' });

    const { error } = await supabase.from('interinos_bibliografia').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar contenido de interinos:', error);
      return res.status(500).json({ error: 'Error al eliminar contenido de interinos' });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ---- resource=security (protegido) ----
async function handleSecurity(req: any, res: any, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (req.method === 'GET') {
    const { detail } = req.query;

    if (detail === 'stats') {
      const { data, error } = await supabase.rpc('get_security_stats');
      if (error) return res.status(500).json({ error: 'Error al obtener estadísticas' });
      return res.status(200).json({ stats: data });
    }

    if (detail === 'attempts') {
      const { data, error } = await supabase
        .from('admin_login_attempts')
        .select('id, ip_address, attempt_number, success, user_agent, country, city, blocked, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return res.status(500).json({ error: 'Error al obtener intentos' });
      return res.status(200).json({ attempts: data || [] });
    }

    if (detail === 'blocked') {
      const { data, error } = await supabase.from('blocked_ips').select('*').order('blocked_at', { ascending: false });
      if (error) return res.status(500).json({ error: 'Error al obtener IPs bloqueadas' });
      return res.status(200).json({ blocked: data || [] });
    }

    return res.status(400).json({ error: 'detail no reconocido' });
  }

  if (req.method === 'POST') {
    const { action, ip } = req.body || {};
    if (action === 'unblock' && ip) {
      const { error } = await supabase.from('blocked_ips').delete().eq('ip_address', ip);
      if (error) return res.status(500).json({ error: 'Error al desbloquear IP' });
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'Acción no reconocida' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  const resource = req.query.resource as string;

  try {
    if (resource === 'login') {
      return await handleLogin(req, res);
    }

    if (!verifyAdminToken(getBearerToken(req))) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const supabase = getSupabaseAdmin();

    if (resource === 'users') return await handleUsers(req, res, supabase);
    if (resource === 'external_emails') return await handleExternalEmails(req, res, supabase);
    if (resource === 'announcements') return await handleAnnouncements(req, res, supabase);
    if (resource === 'analytics') return await handleAnalytics(req, res, supabase);
    if (resource === 'interinos') return await handleInterinos(req, res, supabase);
    if (resource === 'security') return await handleSecurity(req, res, supabase);

    return res.status(400).json({ error: 'resource no reconocido' });
  } catch (error: any) {
    console.error(`Error en admin?resource=${resource}:`, error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
