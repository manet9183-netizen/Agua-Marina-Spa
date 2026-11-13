import { useEffect, useState } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

/** Bloque "fantasma" que pulsa suavemente mientras llegan los datos. */
export function Skeleton({ ancho = '100%', alto = 16, radio = 8, style }: { ancho?: DimensionValue; alto?: number; radio?: number; style?: StyleProp<ViewStyle> }) {
  const [opacidad] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacidad]);
  return <Animated.View style={[{ width: ancho, height: alto, borderRadius: radio, backgroundColor: colors.borde, opacity: opacidad }, style]} />;
}

/** Tarjetas fantasma para listas/catálogos. */
export function SkeletonLista({ filas = 3 }: { filas?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Cargando" style={{ gap: 12 }}>
      {Array.from({ length: filas }, (_, i) => (
        <View key={i} style={{ gap: 10, padding: 18, borderRadius: 20 }}>
          <Skeleton ancho="38%" alto={14} />
          <Skeleton alto={12} />
          <Skeleton ancho="72%" alto={12} />
        </View>
      ))}
    </View>
  );
}
