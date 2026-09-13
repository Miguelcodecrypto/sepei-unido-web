/**
 * Versión del texto de términos que se acepta al registrarse.
 *
 * Vive en `api/_lib/` porque la usan los dos lados: el servidor la guarda en
 * `users.version_terminos` al crear la cuenta (`api/auth.ts`) y la muestran los
 * dos puntos donde se consiente, de forma que quien acepta sabe qué versión
 * está aceptando.
 *
 * ⚠️ Hay DOS puntos de consentimiento, y el que se ve hoy no es el modal:
 * - `TraditionalRegistration.tsx`: la casilla del registro por email, que enlaza
 *   la política de privacidad. **Es la única vía de alta activa**, así que es el
 *   texto que acepta todo el mundo.
 * - `TermsModal.tsx`: el texto largo, que solo aparece tras cargar un certificado
 *   (`SepeiUnido.tsx`, `handleCertificateLoaded`). Esa vía está deshabilitada en
 *   producción ("PRÓXIMAMENTE"), así que hoy no lo ve nadie.
 * Si se cambia uno, revisar el otro: los dos se guardan con esta misma versión.
 *
 * ⚠️ Subir este número CADA VEZ que cambie el contenido legal del modal: es el
 * único registro de qué texto aceptó cada persona. Cambiar el texto sin subir
 * la versión deja consentimientos apuntando a un documento que ya no existe.
 *
 * Historial:
 * - 1.0 — texto inicial.
 * - 2.0 (2026-09-13) — declara DNI, parque, certificado FNMT, IP de registro,
 *   Telegram, último acceso, votaciones y analítica; retira "redes sociales"
 *   (campo que nunca existió); conservación unificada en 3 años de inactividad.
 * - 2.1 (2026-09-13) — la analítica deja de registrar la dirección IP, y con ella
 *   desaparece la llamada del navegador a api.ipify.org.
 */
export const VERSION_TERMINOS = '2.1';

/** Fecha de la versión vigente, para mostrarla junto al texto. */
export const FECHA_TERMINOS = '13 de septiembre de 2026';
