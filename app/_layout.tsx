import { Stack } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { PantallaError } from '@/components/PaginaError';
import { colors } from '@/constants/theme';
import { hidratar, useDb } from '@/lib/store';

// La pantalla de carga se mantiene hasta leer la "base de datos" local (AsyncStorage).
SplashScreen.preventAutoHideAsync();

/** Error 500: cualquier fallo inesperado al dibujar una pantalla cae aquí (en lugar de dejarla en blanco). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <PantallaError codigo={500} error={error} onReintentar={retry} />;
}

/**
 * Layout raíz. Responsabilidades:
 *  1. Hidratar la base de datos mock desde AsyncStorage una sola vez.
 *  2. Declarar el Stack. La zona (admin) lleva pestañas inferiores y protección por rol; el login
 *     original no lleva cabecera y "Agendar cita" usa la cabecera nativa con "atrás".
 */
export default function RootLayout() {
  const { hidratado } = useDb();

  useEffect(() => {
    void hidratar();
  }, []);

  useEffect(() => {
    if (hidratado) void SplashScreen.hideAsync();
  }, [hidratado]);

  if (!hidratado) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTintColor: colors.primario, headerTitleStyle: { color: colors.texto } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="agendar-cita" options={{ title: 'Agendar cita' }} />
        <Stack.Screen name="error" options={{ title: 'Error' }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
