import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SkeletonLista } from '@/components/ui/Skeleton';

import { colors, radius } from '@/constants/theme';

type Tipo = 'exito' | 'error' | 'aviso' | 'info';

const paleta: Record<Tipo, { fondo: string; texto: string }> = {
  exito: { fondo: colors.exitoFondo, texto: colors.exito },
  error: { fondo: colors.peligroFondo, texto: colors.peligro },
  aviso: { fondo: colors.avisoFondo, texto: colors.aviso },
  info: { fondo: colors.infoFondo, texto: colors.info },
};

/** Aviso en línea (éxito/error/aviso/info). Reemplaza a los "toasts" de la app móvil. */
export function Notice({ tipo = 'info', children }: { tipo?: Tipo; children: ReactNode }) {
  return (
    <View
      accessibilityRole={tipo === 'error' ? 'alert' : undefined}
      style={[styles.aviso, { backgroundColor: paleta[tipo].fondo }]}>
      <Text style={[styles.avisoTexto, { color: paleta[tipo].texto }]}>{children}</Text>
    </View>
  );
}

/** Etiqueta de estado (Confirmada, Agotado, ...). */
export function Badge({ texto, tipo = 'info' }: { texto: string; tipo?: Tipo }) {
  return (
    <View style={[styles.badge, { backgroundColor: paleta[tipo].fondo }]}>
      <Text style={[styles.badgeTexto, { color: paleta[tipo].texto }]}>{texto}</Text>
    </View>
  );
}

/**
 * Estado de carga: esqueleto + badge. Es SOLO un indicador de que la información viene
 * en camino (la pantalla no muestra datos hasta que el servidor responde; ver hooks/useAsync).
 * Si la red tarda, el badge cambia para que la persona sepa que sigue trabajando y no se
 * quedó colgado.
 */
export function Cargando({ filas = 3 }: { filas?: number }) {
  const [lento, setLento] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLento(true), 4000);
    return () => clearTimeout(id);
  }, []);
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
      <Badge tipo={lento ? 'aviso' : 'info'} texto={lento ? 'Conexión lenta: sigue cargando…' : 'Cargando…'} />
      <SkeletonLista filas={filas} />
    </View>
  );
}

/** Error al cargar datos, con reintento. */
export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <View style={{ gap: 8, alignItems: 'flex-start' }}>
      <Notice tipo="error">{mensaje}</Notice>
      {onReintentar ? <Button compacto variante="secundario" titulo="Reintentar" onPress={onReintentar} /> : null}
    </View>
  );
}

export function Vacio({ titulo, detalle, children }: { titulo: string; detalle?: string; children?: ReactNode }) {
  return (
    <View style={styles.centro}>
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      {detalle ? <Text style={styles.centroTexto}>{detalle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: { padding: 12, borderRadius: radius.input, marginBottom: 12 },
  avisoTexto: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  centro: { alignItems: 'center', padding: 32, gap: 8 },
  centroTexto: { color: colors.textoSecundario, fontSize: 14, textAlign: 'center' },
  vacioTitulo: { color: colors.texto, fontSize: 16, fontWeight: '700' },
});
