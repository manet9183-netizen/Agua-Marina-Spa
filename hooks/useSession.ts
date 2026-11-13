import { usuarioActual } from '@/lib/api';
import { useDb } from '@/lib/store';

/**
 * Sesión actual derivada del store.
 * `listo` es false hasta que se lee AsyncStorage; las rutas protegidas esperan
 * a `listo` antes de redirigir para no "parpadear" a /login con una sesión válida.
 */
export function useSession() {
  const db = useDb();
  const usuario = usuarioActual(db);
  return { listo: db.hidratado, usuario, rol: usuario?.rol ?? null, configuracion: db.configuracion };
}
