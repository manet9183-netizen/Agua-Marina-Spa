import type { ImageSourcePropType } from 'react-native';

import type { ImagenKey } from './types';

/**
 * Registro de imágenes. Metro necesita `require` estático, por eso no se arma la
 * ruta dinámicamente: cada imagen se declara aquí y el resto del código usa la
 * clave (ImagenKey). Así el catálogo (datos) no depende de rutas de archivos.
 */
export const imagenes: Record<ImagenKey, ImageSourcePropType> = {
  limpieza: require('../assets/images/limpieza-profunda.jpg'),
  lifting: require('../assets/images/facial-lifting-oro.jpg'),
  organika: require('../assets/images/organika-ritual-contour.jpg'),
  promociones: require('../assets/images/promociones-especiales.jpg'),
  papa: require('../assets/images/promocion-papa.jpg'),
  logo: require('../assets/images/logo.jpg'),
};
