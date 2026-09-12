/**
 * Identidad visual de los correos de SEPEI UNIDO, en un único sitio.
 *
 * Vive en `api/_lib/` porque los correos salen de los dos lados: los avisos del
 * panel se componen en el navegador (`src/services/emailNotificationService.ts`)
 * y los que nacen de un flujo público los compone el servidor
 * (`api/_lib/plantillasEmail.ts`). Este archivo no importa nada, así que puede
 * consumirse desde ambos sin arrastrar dependencias.
 *
 * ## Reglas del HTML de correo que aquí se dan por sabidas
 *
 * 1. **Ningún color va solo en un `linear-gradient`.** Yahoo Mail y Outlook de
 *    escritorio no los pintan: el fondo desaparece y el texto blanco encima se
 *    queda invisible. Por eso todo lleva `bgcolor` en la celda y
 *    `background-color` en el estilo, con el gradiente después como mejora para
 *    quien sepa dibujarlo. Es lo que hacía que los correos llegaran "sin
 *    cabecera": la cabecera estaba, pero en blanco sobre blanco.
 * 2. **Nada de imágenes en la identidad.** La mitad de los clientes bloquea las
 *    imágenes remotas por defecto, así que un logo en PNG sale como un hueco la
 *    primera vez que alguien abre el correo. La marca se dibuja con texto y
 *    color, que se ve siempre.
 * 3. **Todo en tablas y con estilos en línea.** No hay `<style>` que sobreviva a
 *    Gmail, ni flexbox, ni grid.
 * 4. **Tipografía del sistema.** Las webfonts no cargan de forma fiable.
 */

export const MARCA = {
  nombre: 'SEPEI UNIDO',
  /** ⚠️ ASINDICAL, nunca "sindical": es el eje de la identidad del movimiento. */
  lema: 'Movimiento asindical · Diputación de Albacete',
  web: 'https://www.sepeiunido.org',
};

/** Los mismos colores de la web (slate + naranja/rojo de la llama). */
export const COLOR = {
  fondo: '#eef2f7',
  papel: '#ffffff',
  tinta: '#0f172a',
  tintaSuave: '#475569',
  tintaTenue: '#94a3b8',
  borde: '#e2e8f0',
  naranja: '#f97316',
  naranjaClaro: '#fb923c',
  rojo: '#dc2626',
  verde: '#16a34a',
  azul: '#2563eb',
};

export const FUENTE =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Color de la píldora que dice de qué va el correo. */
export type TonoEtiqueta = 'votacion' | 'resultados' | 'anuncio' | 'aviso';

const TONOS: Record<TonoEtiqueta, string> = {
  votacion: COLOR.naranja,
  resultados: COLOR.verde,
  anuncio: COLOR.azul,
  aviso: COLOR.rojo,
};

/**
 * Botón que se ve en cualquier cliente: el color va en `bgcolor` del `<td>`,
 * nunca solo en el `<a>`, y el `<a>` es quien lleva el relleno para que toda la
 * superficie sea clicable.
 */
export function boton(url: string, texto: string, color: string = COLOR.rojo): string {
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="${color}" style="border-radius: 8px; background-color: ${color};">
                    <a href="${url}" style="display: inline-block; padding: 15px 42px; color: #ffffff; text-decoration: none; font-family: ${FUENTE}; font-size: 16px; font-weight: bold; letter-spacing: 0.3px;">
                      ${texto}
                    </a>
                  </td>
                </tr>
              </table>`;
}

/**
 * La dirección escrita debajo del botón. Red de seguridad: si un cliente
 * estropea el botón, el enlace sigue a la vista y se puede copiar.
 */
export function enlaceDeRespaldo(url: string): string {
  return `
              <p style="margin: 18px 0 0 0; font-family: ${FUENTE}; font-size: 12px; line-height: 1.6; color: ${COLOR.tintaTenue}; text-align: center; word-break: break-all;">
                ¿No ves el botón? Copia esta dirección en tu navegador:<br />
                <a href="${url}" style="color: ${COLOR.azul}; text-decoration: underline;">${url}</a>
              </p>`;
}

/** Recuadro para el contenido que hay que destacar (el título de la votación, el anuncio…). */
export function tarjeta(contenido: string, color: string = COLOR.naranja): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td bgcolor="${color}" width="4" style="background-color: ${color}; width: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
                  <td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 20px 24px; border-radius: 0 8px 8px 0;">
                    ${contenido}
                  </td>
                </tr>
              </table>`;
}

/**
 * Ficha de datos (quién escribe, en qué parque, con qué teléfono). Va en una
 * tabla real, con la etiqueta y el valor en celdas distintas: en móvil se
 * estrecha sola y no hay que jugársela a que el cliente entienda `flex`.
 */
export function tablaDatos(filas: Array<[string, string]>): string {
  const cuerpo = filas
    .map(
      ([etiqueta, valor]) => `
                  <tr>
                    <td style="font-family: ${FUENTE}; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLOR.tintaTenue}; padding: 7px 14px 7px 0; vertical-align: top; white-space: nowrap;">${etiqueta}</td>
                    <td style="font-family: ${FUENTE}; font-size: 14px; line-height: 1.5; color: ${COLOR.tinta}; padding: 7px 0; vertical-align: top;">${valor}</td>
                  </tr>`
    )
    .join('');

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 26px 0; border-top: 1px solid ${COLOR.borde}; border-bottom: 1px solid ${COLOR.borde};">
                ${cuerpo}
              </table>`;
}

interface DocumentoOpciones {
  /** Lo que se lee en la bandeja de entrada junto al asunto, antes de abrir. */
  preheader: string;
  /** La píldora de la cabecera: "Nueva votación", "Resultados"… */
  etiqueta: string;
  tono: TonoEtiqueta;
  /** El cuerpo, ya montado en `<tr><td>` o HTML suelto. */
  contenido: string;
  /** Una línea en el pie explicando por qué recibe esto. */
  motivo?: string;
}

/**
 * El sobre común: cabecera de marca, cuerpo y pie. Todas las plantillas pasan
 * por aquí, que es lo que hace que los correos se parezcan entre sí.
 */
export function documento({ preheader, etiqueta, tono, contenido, motivo }: DocumentoOpciones): string {
  const acento = TONOS[tono];

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${MARCA.nombre}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLOR.fondo}; -webkit-text-size-adjust: 100%;">

  <!-- Texto de previsualización: se lee en la bandeja, no en el correo abierto. -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${COLOR.fondo};">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.fondo}" style="background-color: ${COLOR.fondo};">
    <tr>
      <td align="center" style="padding: 28px 12px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: ${COLOR.papel}; border-radius: 12px; overflow: hidden; border: 1px solid ${COLOR.borde};">

          <!-- Cabecera. Fondo oscuro SÓLIDO (el de la web), con el gradiente
               detrás solo como adorno para quien lo pinte. -->
          <tr>
            <td bgcolor="${COLOR.tinta}" style="background-color: ${COLOR.tinta}; background: linear-gradient(135deg, #1e293b 0%, ${COLOR.tinta} 60%); padding: 32px 30px 26px 30px; text-align: center;">
              <p style="margin: 0; font-family: ${FUENTE}; font-size: 27px; font-weight: 800; letter-spacing: 2px; color: #ffffff; line-height: 1.1;">
                SEPEI <span style="color: ${COLOR.naranjaClaro};">UNIDO</span>
              </p>
              <p style="margin: 10px 0 0 0; font-family: ${FUENTE}; font-size: 11px; font-weight: bold; letter-spacing: 1.4px; text-transform: uppercase; color: ${COLOR.naranjaClaro};">
                ${MARCA.lema}
              </p>
            </td>
          </tr>

          <!-- Filo de color: separa la cabecera del cuerpo y marca de qué va el correo. -->
          <tr>
            <td bgcolor="${acento}" height="4" style="background-color: ${acento}; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding: 32px 30px 34px 30px;">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td bgcolor="${acento}" style="background-color: ${acento}; border-radius: 20px; padding: 5px 14px;">
                    <span style="font-family: ${FUENTE}; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">${etiqueta}</span>
                  </td>
                </tr>
              </table>

              ${contenido}

            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td bgcolor="#f8fafc" style="background-color: #f8fafc; border-top: 1px solid ${COLOR.borde}; padding: 26px 30px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-family: ${FUENTE}; font-size: 13px; font-weight: bold; color: ${COLOR.tinta};">
                ${MARCA.nombre}
              </p>
              <p style="margin: 0 0 14px 0; font-family: ${FUENTE}; font-size: 12px; color: ${COLOR.tintaSuave};">
                <a href="${MARCA.web}" style="color: ${COLOR.azul}; text-decoration: none;">www.sepeiunido.org</a>
              </p>
              ${motivo ? `<p style="margin: 0 0 10px 0; font-family: ${FUENTE}; font-size: 11px; line-height: 1.6; color: ${COLOR.tintaTenue};">${motivo}</p>` : ''}
              <p style="margin: 0; font-family: ${FUENTE}; font-size: 11px; color: ${COLOR.tintaTenue};">
                © ${new Date().getFullYear()} ${MARCA.nombre}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
