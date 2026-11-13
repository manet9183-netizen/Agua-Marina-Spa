import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Container } from '@/components/ui/Layout';
import { colors } from '@/constants/theme';

/**
 * Marco común de cada pantalla (reemplaza al `PageShell` de la web): área con scroll,
 * margen inferior seguro (barra de gestos) y teclado que no tapa los campos.
 *  - `completo`: sin contenedor central (la pantalla controla su propio ancho; lo usa la home).
 *  - `oscuro`: fondo oscuro de login/registro, igual que en la web y en la app original.
 * La cabecera y la navegación las ponen los layouts de Expo Router (Stack / Tabs).
 */
export function Pantalla({ children, oscuro, completo }: { children: ReactNode; oscuro?: boolean; completo?: boolean }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={[styles.raiz, oscuro && { backgroundColor: colors.fondoOscuro }]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: completo ? 0 : bottom + 24 }}>
        {completo ? children : <Container style={{ paddingVertical: 20 }}>{children}</Container>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.fondoClaro },
});
