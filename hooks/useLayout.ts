import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/constants/theme';

/**
 * Diseño responsivo con `useWindowDimensions`: el teléfono en vertical apila todo; una
 * tableta o el teléfono en horizontal reparten en columnas.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  return {
    ancho: width,
    esMovil: width < breakpoints.movil,
    esEscritorio: width >= breakpoints.escritorio,
  };
}
