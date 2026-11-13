import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

/**
 * Páginas de error. Una sola pieza visual para todos los códigos, para que el sitio
 * se vea igual de cuidado cuando algo falla. Reglas de redacción: decir QUÉ pasó y
 * QUÉ puede hacer la persona; sin disculpas vagas ni jerga técnica.
 *
 *  - <PaginaError>  → dentro del marco normal (cabecera, menú). Para 404, 403, 401…
 *  - <PantallaError> → autónoma, SIN depender del router ni del store: se usa en el
 *    ErrorBoundary raíz (500), donde esas piezas podrían ser justo las que fallaron.
 */
export type CodigoError = 401 | 403 | 404 | 429 | 500 | 503 | 0;

const TEXTOS: Record<CodigoError, { cifra: string; titulo: string; detalle: string }> = {
  404: { cifra: '404', titulo: 'No encontramos esa página', detalle: 'La pantalla no existe o fue movida. Vuelve al inicio e inténtalo de nuevo.' },
  403: { cifra: '403', titulo: 'No tienes permiso para ver esto', detalle: 'Tu cuenta no tiene acceso a esta sección. Si crees que es un error, comunícate con la clínica.' },
  401: { cifra: '401', titulo: 'Tu sesión caducó', detalle: 'Por seguridad cerramos las sesiones después de un tiempo. Inicia sesión de nuevo para continuar.' },
  429: { cifra: '429', titulo: 'Demasiados intentos', detalle: 'Hiciste muchas solicitudes seguidas. Espera un momento e inténtalo de nuevo.' },
  500: { cifra: '500', titulo: 'Algo salió mal de nuestro lado', detalle: 'No pudimos mostrar esta pantalla. Tus datos están a salvo. Intenta de nuevo; si sigue igual, avísanos.' },
  503: { cifra: '503', titulo: 'Estamos en mantenimiento', detalle: 'El servicio no está disponible por un momento. Vuelve a intentarlo en unos minutos.' },
  0: { cifra: '···', titulo: 'Sin conexión', detalle: 'No pudimos comunicarnos con el servidor. Revisa tu internet e inténtalo otra vez.' },
};

export const codigoValido = (n: number): CodigoError => (n in TEXTOS ? (n as CodigoError) : 500);

function Cuerpo({ codigo, error, onReintentar }: { codigo: CodigoError; error?: Error; onReintentar?: () => void }) {
  const t = TEXTOS[codigo];
  // try/catch: en el ErrorBoundary raíz el router podría ser justo lo que falló.
  const ir = (href: '/' | '/login') => () => { try { router.replace(href); } catch { /* sin navegación posible */ } };
  return (
    <View style={styles.raiz}>
      <Text style={styles.cifra} accessibilityElementsHidden importantForAccessibility="no">{t.cifra}</Text>
      <Text accessibilityRole="header" style={styles.titulo}>{t.titulo}</Text>
      <Text style={styles.detalle}>{t.detalle}</Text>
      {__DEV__ && error ? <Text style={styles.dev}>{error.message}</Text> : null}
      <View style={styles.botones}>
        {onReintentar ? <Boton texto="Intentar de nuevo" principal onPress={onReintentar} /> : null}
        {codigo === 401 ? <Boton texto="Iniciar sesión" principal onPress={ir('/login')} /> : null}
        <Boton texto="Ir al inicio" principal={!onReintentar && codigo !== 401} onPress={ir('/')} />
      </View>
    </View>
  );
}

function Boton({ texto, principal, onPress }: { texto: string; principal?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.boton, principal ? styles.botonPrincipal : styles.botonSecundario]}>
      <Text style={[styles.botonTexto, { color: principal ? '#fff' : colors.acentoOscuro }]}>{texto}</Text>
    </Pressable>
  );
}

/** Error dentro de la navegación normal de la app (404, 403…). */
export function PaginaError({ codigo, onReintentar }: { codigo: CodigoError; onReintentar?: () => void }) {
  return (
    <View style={styles.pantalla}>
      <Cuerpo codigo={codigo} onReintentar={onReintentar} />
    </View>
  );
}

/** Error autónomo (sin router ni store): para el ErrorBoundary raíz. */
export function PantallaError({ codigo, error, onReintentar }: { codigo: CodigoError; error?: Error; onReintentar?: () => void }) {
  return (
    <View style={[styles.pantalla]}>
      <Cuerpo codigo={codigo} error={error} onReintentar={onReintentar} />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.perla, justifyContent: 'center', padding: 24 },
  raiz: { alignItems: 'center', gap: 14, paddingVertical: 56, paddingHorizontal: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  cifra: { color: colors.loto, fontFamily: fonts.titulo, fontSize: 120, lineHeight: 112, fontWeight: '500' },
  titulo: { color: colors.texto, fontFamily: fonts.titulo, fontSize: 38, lineHeight: 42, fontWeight: '600', textAlign: 'center' },
  detalle: { color: colors.textoSecundario, fontSize: 16, lineHeight: 25, textAlign: 'center' },
  dev: { color: colors.peligro, backgroundColor: colors.peligroFondo, padding: 10, borderRadius: 10, fontSize: 12, alignSelf: 'stretch' },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 10 },
  boton: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 999, borderWidth: 1 },
  botonPrincipal: { backgroundColor: colors.primario, borderColor: colors.primario },
  botonSecundario: { backgroundColor: colors.superficie, borderColor: colors.acento },
  botonTexto: { fontWeight: '600', fontSize: 15 },
});
