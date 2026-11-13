import { API_URL, modoRemoto } from './config';
import { ApiError } from './errors';
import { limpiarSesion } from './store';

/**
 * Cliente HTTP hacia la API real (server/). Se activa SOLO si EXPO_PUBLIC_API_URL
 * está definida; si no, lib/api.ts usa el mock del navegador.
 *
 *  - Sin secretos aquí: lo único "público" es la URL base. Las llaves (JWT_SECRET,
 *    DATA_KEY, credenciales de BD) viven solo en server/.env. Todo lo que empieza con
 *    EXPO_PUBLIC_ termina dentro del JavaScript que descarga el navegador: no pongas
 *    nada sensible ahí. Los endpoints sí son visibles en el navegador (no se pueden
 *    ocultar); se protegen con autenticación, CORS, rate limit y validación en el servidor.
 *  - `credentials: 'include'` envía la cookie de sesión HttpOnly (el JS nunca ve el token).
 *  - `X-Requested-With` es la defensa CSRF que exige el servidor.
 *  - Tiempo límite de 10 s para no dejar la pantalla colgada.
 */
export { API_URL, modoRemoto };

export async function http<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${API_URL}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      signal: ctrl.signal,
    });
    if (res.status === 204) return undefined as T;
    const json = (await res.json().catch(() => ({}))) as { error?: string; campo?: string; alternativos?: string[] };
    // Sesión caducada en el servidor: se limpia la local y RutaProtegida lleva al login.
    if (res.status === 401 && !ruta.startsWith('/auth/')) limpiarSesion();
    if (!res.ok) throw new ApiError(res.status, json.error ?? 'Ocurrió un error.', { campo: json.campo, alternativos: json.alternativos });
    return json as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
  } finally {
    clearTimeout(timer);
  }
}
