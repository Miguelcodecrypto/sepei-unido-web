/**
 * Plantillas de los emails que dispara un flujo PÚBLICO (envío de una propuesta y
 * alta de un usuario nuevo). Viven en el servidor a propósito: antes las componía
 * el navegador y las mandaba a `/api/send-email` con destinatario y HTML libres,
 * de modo que ese endpoint tenía que aceptar envíos sin autenticar — un open relay
 * con el que cualquiera podía escribir a quien quisiera desde noreply@sepeiunido.org.
 *
 * ⚠️ Los botones llevan el color en `bgcolor` del <td> y repetido en
 * `background-color`, nunca solo en un `linear-gradient`: Yahoo Mail y Outlook de
 * escritorio no lo pintan y el botón se queda blanco sobre blanco, invisible.
 * Ahora el cliente solo pide la acción (crear propuesta, registrarse) y es el
 * servidor quien decide a quién escribe y con qué contenido.
 */

/** Buzón que recibe los avisos internos del movimiento. */
export const EMAIL_ADMIN = 'sepeiunido@gmail.com';

import { documento, tarjeta, tablaDatos, boton, COLOR, FUENTE, MARCA } from './emailTheme.js';

/** Escapa lo que escribe el usuario: va dentro de HTML que se envía por correo. */
function esc(valor: string | undefined | null): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface SuggestionEmailData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  categoria: string;
  lugarTrabajo: string;
  asunto: string;
  descripcion: string;
}

export interface NewUserNotificationData {
  nombre: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  parque_sepei: string;
}

/**
 * HTML para confirmación de propuesta al usuario
 */
export function generateSuggestionConfirmationHTML(data: SuggestionEmailData): string {
  const contenido = `
              <p style="margin: 0 0 8px 0; font-family: ${FUENTE}; font-size: 22px; font-weight: bold; line-height: 1.3; color: ${COLOR.tinta};">
                Hemos recibido tu propuesta
              </p>
              <p style="margin: 0 0 26px 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.6; color: ${COLOR.tintaSuave};">
                Hola <strong style="color: ${COLOR.tinta};">${esc(data.nombre)} ${esc(data.apellidos)}</strong>, la hemos registrado y la revisaremos. Te contamos algo en cuanto la veamos.
              </p>

              ${tablaDatos([
                ['Asunto', esc(data.asunto)],
                ['Categoría', esc(data.categoria)],
                ['Lugar', esc(data.lugarTrabajo)],
              ])}

              ${tarjeta(`
                    <p style="margin: 0; font-family: ${FUENTE}; font-size: 14px; line-height: 1.65; color: ${COLOR.tintaSuave};">
                      Nos pondremos en contacto contigo por correo (<strong style="color: ${COLOR.tinta};">${esc(data.email)}</strong>)${data.telefono ? ` o por teléfono (<strong style="color: ${COLOR.tinta};">${esc(data.telefono)}</strong>)` : ''}.
                    </p>`, COLOR.verde)}`;

  return documento({
    preheader: `Tu propuesta "${esc(data.asunto)}" ha quedado registrada`,
    etiqueta: 'Propuesta recibida',
    tono: 'resultados',
    contenido,
    motivo: 'Recibes este correo porque has enviado una propuesta en SEPEI UNIDO.',
  });
}

export function generateSuggestionConfirmationText(data: SuggestionEmailData): string {
  return `
SEPEI UNIDO - Propuesta Recibida

Hola ${data.nombre} ${data.apellidos},

Hemos recibido tu propuesta correctamente. Nuestro equipo la revisará y nos pondremos en contacto contigo pronto.

RESUMEN DE TU PROPUESTA:
------------------------
Asunto: ${data.asunto}
Categoría: ${data.categoria}
Lugar de trabajo: ${data.lugarTrabajo}

CONTACTO:
---------
Email: ${data.email}
Teléfono: ${data.telefono}

Gracias por tu participación en SEPEI UNIDO.

© ${new Date().getFullYear()} SEPEI UNIDO
www.sepeiunido.org
  `;
}

/**
 * HTML para notificación a admin de nueva propuesta
 */

/**
 * HTML para notificación a admin de nueva propuesta
 */
export function generateSuggestionNotificationHTML(data: SuggestionEmailData): string {
  const contenido = `
              <p style="margin: 0 0 8px 0; font-family: ${FUENTE}; font-size: 22px; font-weight: bold; line-height: 1.3; color: ${COLOR.tinta};">
                Nueva propuesta de un compañero
              </p>
              <p style="margin: 0 0 26px 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.6; color: ${COLOR.tintaSuave};">
                ${esc(data.nombre)} ${esc(data.apellidos)} ha enviado una propuesta desde la web.
              </p>

              ${tablaDatos([
                ['Nombre', `${esc(data.nombre)} ${esc(data.apellidos)}`],
                ['Email', `<a href="mailto:${esc(data.email)}" style="color: ${COLOR.azul};">${esc(data.email)}</a>`],
                ['Teléfono', esc(data.telefono)],
                ['Categoría', esc(data.categoria)],
                ['Lugar', esc(data.lugarTrabajo)],
              ])}

              ${tarjeta(`
                    <p style="margin: 0 0 10px 0; font-family: ${FUENTE}; font-size: 16px; font-weight: bold; color: ${COLOR.tinta};">${esc(data.asunto)}</p>
                    <p style="margin: 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.65; color: ${COLOR.tintaSuave}; white-space: pre-line;">${esc(data.descripcion)}</p>`, COLOR.rojo)}

              ${boton(`${MARCA.web}/admin`, 'Abrir el panel', COLOR.tinta)}`;

  return documento({
    preheader: `${esc(data.nombre)} ${esc(data.apellidos)}: ${esc(data.asunto)}`,
    etiqueta: 'Propuesta nueva',
    tono: 'aviso',
    contenido,
    motivo: 'Aviso interno del panel de administración.',
  });
}

export function generateSuggestionNotificationText(data: SuggestionEmailData): string {
  return `
SEPEI UNIDO - Nueva Propuesta Recibida

DATOS DEL USUARIO:
------------------
Nombre: ${data.nombre} ${data.apellidos}
Email: ${data.email}
Teléfono: ${data.telefono}
Categoría: ${data.categoria}
Lugar de trabajo: ${data.lugarTrabajo}

PROPUESTA:
----------
Asunto: ${data.asunto}

Descripción:
${data.descripcion}

---

Accede al panel de administración para ver más detalles:
https://www.sepeiunido.org

© ${new Date().getFullYear()} SEPEI UNIDO
  `;
}

// ============================================
// NOTIFICACIONES A ADMIN (sepeiunido@gmail.com)
// ============================================

/**
 * HTML para notificación de nuevo usuario
 */
export function generateNewUserNotificationHTML(data: NewUserNotificationData): string {
  const contenido = `
              <p style="margin: 0 0 8px 0; font-family: ${FUENTE}; font-size: 22px; font-weight: bold; line-height: 1.3; color: ${COLOR.tinta};">
                Alta de un usuario nuevo
              </p>
              <p style="margin: 0 0 26px 0; font-family: ${FUENTE}; font-size: 15px; line-height: 1.6; color: ${COLOR.tintaSuave};">
                Se ha registrado <strong style="color: ${COLOR.tinta};">${esc(data.nombre)} ${esc(data.apellidos)}</strong> en la web.
              </p>

              ${tablaDatos([
                ['Nombre', `${esc(data.nombre)} ${esc(data.apellidos)}`],
                ['DNI', esc(data.dni)],
                ['Email', `<a href="mailto:${esc(data.email)}" style="color: ${COLOR.azul};">${esc(data.email)}</a>`],
                ['Teléfono', esc(data.telefono)],
                ['Parque', esc(data.parque_sepei)],
              ])}

              ${boton(`${MARCA.web}/admin`, 'Abrir el panel', COLOR.tinta)}`;

  return documento({
    preheader: `${esc(data.nombre)} ${esc(data.apellidos)} se ha registrado en la web`,
    etiqueta: 'Usuario nuevo',
    tono: 'resultados',
    contenido,
    motivo: 'Aviso interno del panel de administración.',
  });
}

export function generateNewUserNotificationText(data: NewUserNotificationData): string {
  return `
SEPEI UNIDO - Nuevo Usuario Registrado

DATOS DEL NUEVO USUARIO:
------------------------
Nombre: ${data.nombre} ${data.apellidos}
DNI: ${data.dni}
Email: ${data.email}
Teléfono: ${data.telefono}
Parque SEPEI: ${data.parque_sepei}

---

Accede al panel de administración para ver más detalles:
https://www.sepeiunido.org

© ${new Date().getFullYear()} SEPEI UNIDO
  `;
}
