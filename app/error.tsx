import { useLocalSearchParams } from 'expo-router';

import { PaginaError, codigoValido } from '@/components/PaginaError';

/** Pantalla genérica de error: /error?codigo=503 (también 401, 403, 429, 500 y 0 = sin conexión). */
export default function Error() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  return <PaginaError codigo={codigoValido(Number(codigo ?? 500))} />;
}
