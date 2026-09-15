/**
 * Formateo de fechas que pueden no existir.
 *
 * Varias columnas de fecha son NULLABLE en Postgres (`announcements.fecha_publicacion`
 * y `fecha_creacion`, entre otras). Antes se pasaban directas a `new Date(...)`, y ahí
 * está la trampa: **`new Date(null)` no falla, devuelve el 1 de enero de 1970**. Un
 * anuncio sin fecha no habría dado ningún error: habría enseñado «1/1/1970» a todo el
 * que abriera el tablón. Lo mismo con una fecha ilegible, que da `Invalid Date`.
 *
 * Por eso el formateo pasa por aquí: lo que no es una fecha se dice, no se inventa.
 */
export function formatearFecha(
  valor: string | null | undefined,
  opciones?: Intl.DateTimeFormatOptions
): string {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return fecha.toLocaleDateString('es-ES', opciones);
}
