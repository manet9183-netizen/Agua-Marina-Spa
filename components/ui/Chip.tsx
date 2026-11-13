import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '@/constants/theme';

/**
 * Opción seleccionable en forma de píldora: botones de horario (figura 8.4),
 * selector de día, selector de rol, filtros. Mismo lenguaje visual que `roleOption`
 * de la app (borde gris → borde y fondo morados al activarse).
 */
export function Chip({
  texto,
  activo,
  onPress,
  deshabilitado,
}: {
  texto: string;
  activo?: boolean;
  onPress?: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo, disabled: !!deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={[styles.chip, activo && styles.activo, deshabilitado && styles.deshabilitado]}>
      <Text style={[styles.texto, activo && styles.textoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borde,
    backgroundColor: colors.superficie,
  },
  activo: { borderColor: colors.acentoFuerte, backgroundColor: colors.acentoFuerte },
  deshabilitado: { opacity: 0.4 },
  texto: { fontSize: 13, fontWeight: '600', color: colors.texto },
  textoActivo: { color: colors.textoSobreOscuro },
});
