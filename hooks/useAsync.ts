import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos asíncronos con estados "cargando / error / datos".
 *
 * REGLA DE DISEÑO: la pantalla ESPERA al servidor. Cada vez que cambian las
 * dependencias (otra fecha, otro filtro, datos invalidados por una mutación) los
 * datos anteriores se descartan (`datos = null`) y la pantalla muestra el esqueleto
 * hasta que llega la respuesta. Así nunca se enseña información vieja ni un "Sin
 * resultados" falso mientras la red va lenta. El esqueleto y el badge de <Cargando>
 * son SOLO un indicador de que la información viene en camino.
 *
 * `recargar()` (reintento manual) CONSERVA los datos visibles y marca `actualizando`.
 * También descarta respuestas de peticiones viejas (condición de carrera al cambiar rápido de fecha).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const ultima = useRef(0);

  const cargar = useCallback(
    (conservar: boolean) => {
      const id = ++ultima.current;
      setCargando(true);
      setError(null);
      if (!conservar) setDatos(null);
      fn()
        .then((d) => {
          if (id === ultima.current) setDatos(d);
        })
        .catch((e: unknown) => {
          if (id === ultima.current) setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.');
        })
        .finally(() => {
          if (id === ultima.current) setCargando(false);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => cargar(false), [cargar]);
  const recargar = useCallback(() => cargar(true), [cargar]);

  return { datos, error, cargando, recargar, actualizando: cargando && datos !== null };
}
