/**
 * Smoke test de las funciones serverless: comprueba que ARRANCAN, no que funcionen.
 *
 * El 2026-09-13 un import sin extensión `.js` en `api/auth.ts` dejó la función de
 * autenticación sin cargar durante 20 horas: nadie pudo entrar, registrarse ni
 * recuperar su contraseña, y los que ya tenían sesión la perdieron. El CI estuvo en
 * verde todo el tiempo, porque `tsconfig.json` solo mira `src/` y `api/` no se tipa.
 *
 * La señal que lo delataba es la que se comprueba aquí:
 *
 *   - función viva  → responde JSON, aunque sea un 401 o un 405.
 *   - función muerta→ Vercel devuelve `FUNCTION_INVOCATION_FAILED` en `text/plain`.
 *
 * Por eso el criterio NO es el código de estado, sino "¿ha contestado la función o
 * ha contestado Vercel por ella?". Así se caza cualquier causa que impida arrancar
 * —un import roto, una variable de entorno ausente, una dependencia que no resuelve—
 * y no solo la de aquel día.
 *
 * ⚠️ Todas las peticiones son INOCUAS a propósito: provocan un rechazo en la primera
 * línea del handler (método no permitido, o falta de credencial). Ninguna escribe en
 * la base de datos ni envía correos. En particular se evitan `admin?resource=login` y
 * `auth?action=login`: este script también corre periódicamente, y llamarlos dejaría
 * un rastro de intentos fallidos en `admin_login_attempts` que acabaría bloqueando la
 * IP por el propio sistema de seguridad del panel.
 *
 * Uso:  node scripts/smoke.mjs https://www.sepeiunido.org
 */

const base = (process.argv[2] || process.env.SMOKE_BASE_URL || '').replace(/\/$/, '');

if (!base) {
  console.error('Falta la URL base.  Uso: node scripts/smoke.mjs https://www.sepeiunido.org');
  process.exit(2);
}

/**
 * Las 12 funciones del plan Hobby, con una petición que cada una rechaza sin efectos.
 * `espera` documenta el estado que devuelve hoy; no es el criterio de fallo (ver
 * `comprobar`), solo sirve para que un cambio de comportamiento se vea en el informe.
 */
const CHECKS = [
  // El fallo de 2026-09-13 vivía aquí. Sin cabecera Authorization, `handleSession`
  // corta en su primera línea con 401 y no llega a consultar nada.
  { nombre: 'auth',                ruta: '/api/auth?action=session',      metodo: 'GET',  espera: 401 },
  // Sin token de admin: `verifyAdminToken` rechaza antes de tocar Supabase.
  { nombre: 'admin',               ruta: '/api/admin?resource=users',     metodo: 'GET',  espera: 401 },
  { nombre: 'boe-search',          ruta: '/api/boe-search',               metodo: 'PUT',  espera: 405 },
  { nombre: 'send-email',          ruta: '/api/send-email',               metodo: 'GET',  espera: 405 },
  { nombre: 'suggestions',         ruta: '/api/suggestions?action=create', metodo: 'PUT', espera: 405 },
  { nombre: 'voting',              ruta: '/api/voting?action=active',     metodo: 'PUT',  espera: 405 },
  { nombre: 'view-file',           ruta: '/api/view-file',                metodo: 'POST', espera: 405 },
  { nombre: 'telegram-link-code',  ruta: '/api/telegram-link-code',       metodo: 'GET',  espera: 405 },
  { nombre: 'telegram-send',       ruta: '/api/telegram-send',            metodo: 'GET',  espera: 405 },
  { nombre: 'telegram-status',     ruta: '/api/telegram-status',          metodo: 'POST', espera: 405 },
  { nombre: 'telegram-unlink',     ruta: '/api/telegram-unlink',          metodo: 'GET',  espera: 405 },
  // Este contesta 200 "Webhook active" a todo lo que no sea POST, a propósito.
  { nombre: 'telegram-webhook',    ruta: '/api/telegram-webhook',         metodo: 'GET',  espera: 200 },
];

/** La portada: si esto falla, es el despliegue entero, no una función. */
const PORTADA = { nombre: 'portada (/)', ruta: '/', metodo: 'GET', espera: 200 };

const TIMEOUT_MS = 15000;

async function comprobar({ nombre, ruta, metodo, espera }) {
  const url = `${base}${ruta}`;

  let res;
  try {
    res = await fetch(url, { method: metodo, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    return { nombre, ok: false, detalle: `no responde (${error.name}: ${error.message})` };
  }

  const tipo = res.headers.get('content-type') || '(sin content-type)';
  const esPortada = ruta === '/';
  const esperado = esPortada ? 'text/html' : 'application/json';

  // Un 5xx siempre es fallo: las funciones vivas rechazan con 4xx.
  if (res.status >= 500) {
    const pista = res.headers.get('x-vercel-error');
    return {
      nombre,
      ok: false,
      detalle: `HTTP ${res.status}${pista ? ` (${pista})` : ''} — la función no ha arrancado`,
    };
  }

  // El corazón de la prueba: que conteste la función y no Vercel por ella.
  if (!tipo.includes(esperado)) {
    return { nombre, ok: false, detalle: `HTTP ${res.status} con content-type "${tipo}", se esperaba ${esperado}` };
  }

  // Para las funciones, además el cuerpo tiene que ser JSON de verdad: es exactamente
  // el paso que reventaba en el cliente y acababa mostrando "Error de conexión".
  if (!esPortada) {
    const cuerpo = await res.text();
    try {
      JSON.parse(cuerpo);
    } catch {
      return { nombre, ok: false, detalle: `HTTP ${res.status} con cuerpo que no es JSON: ${cuerpo.slice(0, 80)}` };
    }
  }

  const aviso = res.status !== espera ? ` (esperaba ${espera}, cambio de comportamiento)` : '';
  return { nombre, ok: true, detalle: `HTTP ${res.status}${aviso}` };
}

const resultados = [];
for (const check of [PORTADA, ...CHECKS]) {
  resultados.push(await comprobar(check));
}

console.log(`\nSmoke test contra ${base}\n`);
for (const r of resultados) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.nombre.padEnd(20)} ${r.detalle}`);
}

const fallos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} correctos\n`);

if (fallos.length > 0) {
  console.error(`FALLO: ${fallos.map((f) => f.nombre).join(', ')} no responden como funciones vivas.`);
  process.exit(1);
}
