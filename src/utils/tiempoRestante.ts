/**
 * Cuánto queda para que se cierre una votación, calculado en un único sitio.
 *
 * Antes se calculaba en dos: la tarjeta de `VotingBoard` lo hacía en el cliente
 * (días y, por debajo de un día, horas) y el servidor devolvía aparte un
 * `daysRemaining` redondeado hacia arriba con `Math.ceil` para el badge del
 * botón flotante. La misma votación decía "4 horas restantes" en la tarjeta y
 * "1d" en el botón, a la vez y en la misma pantalla.
 *
 * El servidor sigue diciendo *cuál* es la votación que cierra antes; el cuánto
 * queda se deriva siempre de su `fecha_fin` aquí.
 */
export interface TiempoRestante {
  /** La fecha de cierre ya ha pasado. */
  finalizado: boolean;
  /** Texto completo: "3 días restantes", "4 horas restantes", "Menos de 1 hora". */
  texto: string;
  /** Versión corta, para el badge del botón flotante: "3d", "4h", "<1h". */
  corto: string;
}

const UN_DIA_MS = 1000 * 60 * 60 * 24;
const UNA_HORA_MS = 1000 * 60 * 60;

export function calcularTiempoRestante(
  fechaFin: string,
  ahora: Date = new Date()
): TiempoRestante {
  const diff = new Date(fechaFin).getTime() - ahora.getTime();

  // NaN incluido: una fecha ilegible se trata como cerrada, nunca como "quedan NaN días".
  if (!Number.isFinite(diff) || diff <= 0) {
    return { finalizado: true, texto: 'Finalizada', corto: '—' };
  }

  const dias = Math.floor(diff / UN_DIA_MS);
  const horas = Math.floor((diff % UN_DIA_MS) / UNA_HORA_MS);

  if (dias > 0) {
    return {
      finalizado: false,
      texto: `${dias} ${dias === 1 ? 'día restante' : 'días restantes'}`,
      corto: `${dias}d`,
    };
  }

  if (horas > 0) {
    return {
      finalizado: false,
      texto: `${horas} ${horas === 1 ? 'hora restante' : 'horas restantes'}`,
      corto: `${horas}h`,
    };
  }

  return { finalizado: false, texto: 'Menos de 1 hora', corto: '<1h' };
}
