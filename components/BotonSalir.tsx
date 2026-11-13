import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';
import { cerrarSesion } from '@/lib/api';

/** Botón "Salir" para la cabecera de las zonas protegidas: cierra sesión y vuelve al login. */
export function BotonSalir() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      hitSlop={8}
      onPress={() => {
        cerrarSesion();
        router.replace('/login');
      }}
      style={styles.boton}>
      <Text style={styles.texto}>Salir</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { marginRight: 14, paddingVertical: 4, paddingHorizontal: 6 },
  texto: { color: colors.primario, fontWeight: '700', fontSize: 15 },
});
