/**
 * Cuánto hace que un usuario entró por última vez, resuelto en un único sitio.
 *
 * El panel de administración usa esto para dos cosas a la vez —pintar la columna
 * "Último acceso" y filtrar por tramos— y las dos tienen que contar igual. Por eso
 * los umbrales viven aquí y no repartidos por los componentes.
 *
 * Dos decisiones que no son obvias:
 *
 * 1. `sin_datos` NO es lo mismo que "lleva meses sin entrar", y por eso tiene tramo
 *    propio (gris, no rojo). `users.lastlogin` estuvo roto hasta el 2026-09-14 y una
 *    migración lo reconstruyó desde `user_sessions`; quien aun así se quede a NULL es
 *    que no tiene ni una sesión registrada. Meterlo en el tramo peor sería inventarse
 *    un dato.
 *
 * 2. Los tramos son contiguos y son cuatro a propósito. Un tramo de color solo se
 *    justifica si lleva a una decisión distinta: entre alguien de 15 días y alguien de
 *    40 solo cambia lo que haces con el segundo (avisarle por otra vía), así que el
 *    corte está en el mes y no antes.
 */
export type TramoActividad = 'hoy' | 'semana' | 'mes' | 'dormido' | 'sin_datos';

export interface Actividad {
  tramo: TramoActividad;
  /** Para la celda de la tabla, que es estrecha: "hoy", "6 d", "2 m", "—". */
  corto: string;
  /** Frase completa, para el tooltip y los lectores de pantalla. */
  texto: string;
  /** Fecha y hora exactas, o cadena vacía si no hay dato. */
  absoluto: string;
}

const UNA_HORA_MS = 1000 * 60 * 60;
const UN_DIA_MS = UNA_HORA_MS * 24;

/** Días a partir de los cuales se considera que el usuario está dormido. */
export const DIAS_DORMIDO = 30;

export function calcularActividad(
  ultimoAcceso: string | null | undefined,
  ahora: Date = new Date()
): Actividad {
  if (!ultimoAcceso) {
    return { tramo: 'sin_datos', corto: '—', texto: 'Sin registro de acceso', absoluto: '' };
  }

  const fecha = new Date(ultimoAcceso);
  const diff = ahora.getTime() - fecha.getTime();

  // Una fecha ilegible se trata como falta de dato, nunca como "hace NaN días".
  if (!Number.isFinite(diff)) {
    return { tramo: 'sin_datos', corto: '—', texto: 'Sin registro de acceso', absoluto: '' };
  }

  const absoluto = fecha.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Una fecha en el futuro (reloj descuadrado) es acceso de ahora mismo, no un error.
  if (diff < UNA_HORA_MS) {
    return { tramo: 'hoy', corto: 'ahora', texto: 'Hace menos de una hora', absoluto };
  }

  const dias = Math.floor(diff / UN_DIA_MS);

  if (dias < 1) {
    const horas = Math.floor(diff / UNA_HORA_MS);
    return {
      tramo: 'hoy',
      corto: `${horas} h`,
      texto: `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`,
      absoluto,
    };
  }

  if (dias < DIAS_DORMIDO) {
    return {
      tramo: dias <= 7 ? 'semana' : 'mes',
      corto: `${dias} d`,
      texto: `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`,
      absoluto,
    };
  }

  // Pasado el trimestre los días dejan de decir nada ("243 d" no se lee), pero antes
  // sí: entre 31 y 89 días el número exacto es lo que permite decidir a quién avisar.
  return {
    tramo: 'dormido',
    corto: dias < 90 ? `${dias} d` : `${Math.floor(dias / 30)} m`,
    texto: `Hace ${dias} días`,
    absoluto,
  };
}

/** Un usuario cuenta como activo si ha entrado dentro del último mes. */
export function esActivo(tramo: TramoActividad): boolean {
  return tramo === 'hoy' || tramo === 'semana' || tramo === 'mes';
}
