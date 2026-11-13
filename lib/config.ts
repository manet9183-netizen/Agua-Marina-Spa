/**
 * Configuración pública de ejecución. `EXPO_PUBLIC_*` termina dentro del JavaScript del
 * navegador: aquí NUNCA va nada secreto (ver lib/http.ts).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
/** true = usa la API real (server/); false = modo demostración con datos en el navegador. */
export const modoRemoto = API_URL.length > 0;
