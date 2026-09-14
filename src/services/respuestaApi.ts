/**
 * Leer respuestas de `/api/*` sin que un fallo del servidor se disfrace de fallo de red.
 *
 * El 2026-09-13 `/api/auth` dejó de arrancar y Vercel respondía
 * `FUNCTION_INVOCATION_FAILED` en `text/plain`. El código hacía `await response.json()`
 * sin protección, así que el parseo lanzaba y caía en el mismo `catch` que un corte de
 * red, mostrando «Error de conexión». Resultado: durante 20 horas la web le dijo a cada
 * usuario que revisara SU conexión mientras el problema estaba en el servidor. Nadie
 * avisó porque el mensaje no invitaba a hacerlo.
 *
 * El criterio de `motivoDeRechazo()` en votingDatabase.ts ya distinguía bien los dos
 * casos; esto lo generaliza para el resto de servicios.
 *
 *   - el `fetch` lanza          → no hay red, DNS o CORS: culpa del lado del usuario.
 *   - responde pero no es JSON  → la función no arrancó: culpa del servidor.
 *   - responde 5xx              → el servidor ha fallado: culpa del servidor.
 *   - responde 4xx con JSON     → el mensaje del servidor, que está escrito para leerse.
 */

/**
 * Parsea el cuerpo como JSON. Devuelve `null` si no lo era — que es justo la señal de
 * que ha contestado la plataforma y no la función.
 */
export async function jsonONada(response: Response): Promise<any | null> {
  try {
    const texto = await response.text();
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

/** Mensaje para cuando el `fetch` ni siquiera llegó a responder. */
export const MENSAJE_SIN_RED =
  'No se ha podido conectar. Comprueba tu conexión a internet e inténtalo de nuevo.';

/**
 * Mensaje honesto para una respuesta que sí llegó.
 *
 * @param status  código HTTP recibido.
 * @param datos   cuerpo ya parseado, o `null` si no era JSON.
 * @param porDefecto  qué decir en un 4xx que no traiga mensaje propio.
 */
export function mensajeDeFallo(status: number, datos: any | null, porDefecto: string): string {
  // Sin JSON no ha contestado la función, sino la plataforma: es un fallo del servidor
  // por mucho que el código sea un 200.
  if (datos === null) {
    return 'El servidor no está respondiendo correctamente. No es tu conexión: inténtalo de nuevo en unos minutos.';
  }
  if (status >= 500) {
    return 'El servidor ha fallado. Inténtalo de nuevo en unos minutos.';
  }
  const mensaje = typeof datos?.error === 'string' ? datos.error.trim() : '';
  return mensaje || porDefecto;
}
