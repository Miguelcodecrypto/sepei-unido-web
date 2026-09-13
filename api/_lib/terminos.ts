/**
 * Versión del texto de términos que se acepta al registrarse.
 *
 * Vive en `api/_lib/` porque la usan los dos lados: el servidor la guarda en
 * `users.version_terminos` al crear la cuenta (`api/auth.ts`) y el modal la
 * muestra al pie del texto (`src/components/TermsModal.tsx`), de forma que
 * quien acepta sabe qué versión está aceptando.
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
 */
export const VERSION_TERMINOS = '2.0';

/** Fecha de la versión vigente, para mostrarla junto al texto. */
export const FECHA_TERMINOS = '13 de septiembre de 2026';
