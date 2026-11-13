import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/constants/theme';

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';

interface Props {
  titulo: string;
  onPress?: () => void;
  variante?: Variante;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** `true` para que ocupe todo el ancho (formularios). */
  bloque?: boolean;
  compacto?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botón único de la app. Copia el estilo del botón "Ingresar" de la app
 * (fondo púrpura, radio 12, texto blanco en negrita) y añade variantes para las
 * acciones secundarias/destructivas que la app todavía no tiene.
 * Pressable con estado `pressed` para el feedback táctil.
 */
export function Button({ titulo, onPress, variante = 'primario', cargando, deshabilitado, bloque, compacto, style }: Props) {
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compacto && styles.compacto,
        bloque && styles.bloque,
        fondo[variante],
        pressed && !inactivo && hover[variante],
        inactivo && styles.inactivo,
        style,
      ]}>
      {cargando ? (
        <ActivityIndicator color={variante === 'primario' || variante === 'peligro' ? '#fff' : colors.acento} />
      ) : (
        <Text style={[styles.texto, texto[variante], compacto && styles.textoCompacto]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.boton,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  compacto: { paddingVertical: 8, paddingHorizontal: 14 },
  bloque: { alignSelf: 'stretch' },
  inactivo: { opacity: 0.5 },
  texto: { fontWeight: 'bold', fontSize: 15 },
  textoCompacto: { fontSize: 13 },
});

const fondo = StyleSheet.create({
  primario: { backgroundColor: colors.primario },
  secundario: { backgroundColor: colors.superficie, borderColor: colors.acento },
  peligro: { backgroundColor: colors.peligro },
  fantasma: { backgroundColor: 'transparent' },
});
const hover = StyleSheet.create({
  primario: { backgroundColor: colors.primarioOscuro },
  secundario: { backgroundColor: colors.acentoSuave },
  peligro: { opacity: 0.9 },
  fantasma: { backgroundColor: colors.primarioSuave },
});
const texto = StyleSheet.create({
  primario: { color: '#fff' },
  secundario: { color: colors.acentoOscuro },
  peligro: { color: '#fff' },
  fantasma: { color: colors.primario },
});
