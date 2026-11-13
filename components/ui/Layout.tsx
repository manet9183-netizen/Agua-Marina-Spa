import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MAX_ANCHO, colors, fonts, radius, shadow } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';

/** Centra el contenido con ancho máximo (web) y aplica márgenes laterales móviles. */
export function Container({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { esMovil } = useLayout();
  return (
    <View style={[{ width: '100%', maxWidth: MAX_ANCHO, alignSelf: 'center', paddingHorizontal: esMovil ? 16 : 24 }, style]}>
      {children}
    </View>
  );
}

/** Tarjeta blanca de bordes redondeados (radio 20 = `card` de la app). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.tarjeta, style]}>{children}</View>;
}

/** Encabezado de página: sobretítulo morado en mayúsculas + título (patrón de la pantalla de login). */
export function PageHeader({
  sobretitulo,
  titulo,
  descripcion,
  acciones,
}: {
  sobretitulo?: string;
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  const { esMovil } = useLayout();
  return (
    <View style={[styles.encabezado, { flexDirection: esMovil ? 'column' : 'row' }]}>
      <View style={{ flex: 1 }}>
        {sobretitulo ? <Text style={styles.sobretitulo}>{sobretitulo.toUpperCase()}</Text> : null}
        <Text accessibilityRole="header" style={styles.titulo}>
          {titulo}
        </Text>
        {descripcion ? <Text style={styles.descripcion}>{descripcion}</Text> : null}
      </View>
      {acciones ? <View style={styles.acciones}>{acciones}</View> : null}
    </View>
  );
}

/** Fila que se apila en móvil y se reparte en columnas en escritorio. */
export function Columnas({ children, gap = 16 }: { children: ReactNode; gap?: number }) {
  const { esEscritorio } = useLayout();
  return <View style={{ flexDirection: esEscritorio ? 'row' : 'column', gap, alignItems: 'flex-start' }}>{children}</View>;
}

const styles = StyleSheet.create({
  tarjeta: { backgroundColor: colors.superficie, borderRadius: radius.tarjeta, padding: 20, ...shadow.tarjeta },
  encabezado: { gap: 12, marginBottom: 20, alignItems: 'flex-start' },
  sobretitulo: { color: colors.primario, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  titulo: { fontSize: 30, fontWeight: 'bold', color: colors.texto, marginTop: 4, fontFamily: fonts.titulo },
  descripcion: { color: colors.textoSecundario, fontSize: 14, marginTop: 4 },
  acciones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
