import { Platform } from 'react-native';

/**
 * Tokens de diseño de la app móvil. Mismos valores que `paletaClara` de la versión web
 * (constants/theme.ts de AguaMarinaSpaWeb), pero como hexadecimales reales: en la web los
 * colores son variables CSS (para el modo oscuro), algo que React Native no tiene.
 *
 * Origen de la paleta:
 *  - primario*  → púrpura de la app (login.styles.ts).
 *  - acento*    → verde azulado del documento de diseño.
 *  - loto/agua/marino → logotipo y carteles del spa.
 */
export const colors = {
  primario: '#6b21a8', primarioSuave: '#f3e8ff', primarioOscuro: '#4c1577',
  acento: '#1c8a8f', acentoFuerte: '#1c8a8f', acentoOscuro: '#146a6e', acentoSuave: '#d9f0f1',
  loto: '#d9638f', lotoSuave: '#fbe6ee', marino: '#0f3b45', agua: '#bfe6ee', aguaSuave: '#e7f4f7', perla: '#faf7f5',
  fondoOscuro: '#121212', superficie: '#ffffff', fondoClaro: '#f6f4f8',
  borde: '#e2dfe6', bordeInput: '#c9c6cf',
  texto: '#16141a', textoSecundario: '#5f5b66', textoTenue: '#8a8691', textoSobreOscuro: '#ffffff', textoEtiqueta: '#33303a',
  exito: '#15803d', exitoFondo: '#dcfce7', peligro: '#b91c1c', peligroFondo: '#fee2e2',
  aviso: '#b45309', avisoFondo: '#fef3c7', info: '#1d4ed8', infoFondo: '#dbeafe',
} as const;

export type ColorKey = keyof typeof colors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 } as const;
export const radius = { input: 10, boton: 12, tarjeta: 20, pill: 999 } as const;
export const MAX_ANCHO = 1120;
export const breakpoints = { movil: 640, escritorio: 960 } as const;

/** Titulares serif (afín a los carteles). Sin fuentes descargables: se usa la serif del sistema. */
export const fonts = {
  titulo: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }) as string,
} as const;

export const shadow = {
  tarjeta: { shadowColor: '#1b1330', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
} as const;
