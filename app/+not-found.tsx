import { PaginaError } from '@/components/PaginaError';

/** Error 404: cualquier ruta que no exista. */
export default function NoEncontrada() {
  return <PaginaError codigo={404} />;
}
