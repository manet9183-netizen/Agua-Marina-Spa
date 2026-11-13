import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { modoRemoto } from './config';
import { VERSION_DB, crearSeed, crearVacio } from './seed';
import type { DbState } from './types';

/**
 * Store global mínimo (patrón "external store" de React) que hace de BASE DE DATOS mock
 * mientras no se use el backend Node.js/MySQL del diseño. Misma API que la versión web
 * (`useDb`, `setEstado`, `hidratar`…) para que `lib/api.ts` y las pantallas sean casi idénticas.
 *
 * PERSISTENCIA: AsyncStorage (en la web era localStorage). Es asíncrona, así que `hidratar()`
 * es una promesa; el layout raíz espera a `hidratado` antes de quitar la pantalla de carga.
 */
const CLAVE = 'aguamarina.db';

let estado: DbState = modoRemoto ? crearVacio() : crearSeed();
const oyentes = new Set<() => void>();

export const getEstado = () => estado;

export function subscribe(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function persistir() {
  const { hidratado: _omitido, revision: _rev, ...persistible } = estado;
  // Sin await: si falla (cuota, almacenamiento lleno) la app sigue funcionando en memoria.
  AsyncStorage.setItem(CLAVE, JSON.stringify(persistible)).catch(() => undefined);
}

/** Reemplaza el estado completo y avisa a las pantallas suscritas. */
export function setEstado(siguiente: DbState) {
  estado = { ...siguiente, revision: estado.revision + 1 };
  persistir();
  oyentes.forEach((o) => o());
}

/** Lee AsyncStorage (si hay datos válidos de la misma versión) y marca hidratado. */
export async function hidratar() {
  if (estado.hidratado) return;
  let base = estado;
  try {
    const crudo = await AsyncStorage.getItem(CLAVE);
    if (crudo) {
      const guardado = JSON.parse(crudo) as DbState;
      if (guardado.version === VERSION_DB) base = guardado;
    }
  } catch {
    // JSON corrupto o almacenamiento no disponible → se usa el seed.
  }
  estado = { ...base, hidratado: true, revision: estado.revision + 1 };
  oyentes.forEach((o) => o());
}

/** Borra todo y vuelve a los datos de demostración (útil en pruebas). */
export function reiniciarDatos() {
  setEstado({ ...(modoRemoto ? crearVacio() : crearSeed()), hidratado: true });
}

/** Cierra la sesión local (la sesión del servidor caducó o fue revocada). */
export function limpiarSesion() {
  if (estado.sesion) setEstado({ ...estado, sesion: null });
}

/** Avisa a las pantallas que los datos del servidor cambiaron (tras una mutación remota). */
export function invalidar() {
  setEstado({ ...estado });
}

/** Hook: devuelve el estado y re-renderiza al cambiar. */
export function useDb(): DbState {
  return useSyncExternalStore(subscribe, getEstado, getEstado);
}
