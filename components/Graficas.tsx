import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors, type ColorKey } from '@/constants/theme';
import { dinero } from '@/lib/format';

/**
 * Gráficas del dashboard con `react-native-svg` (en la web son <svg> del navegador).
 * Interacción: al tocar una columna/punto se muestra su valor exacto arriba.
 * Accesibilidad: cada gráfica tiene una etiqueta textual y la leyenda nunca depende solo del color.
 * Diferencias con la web: sin las animaciones de dibujo/crecimiento (CSS) ni modo oscuro.
 */
const compacto = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));

/** Eje Y con 4 intervalos de valor "redondo" (1, 2, 2.5, 5 × 10ⁿ): 0 · 10k · 20k · 30k · 40k. */
function escala(max: number) {
  const e = Math.floor(Math.log10(Math.max(max, 1) / 4));
  const k = [1, 2, 2.5, 5, 10].map((m) => m * Math.pow(10, e)).find((v) => v * 4 >= max) ?? 10 * Math.pow(10, e);
  return { tope: k * 4, marcas: [0, 1, 2, 3, 4].map((n) => n * k) };
}

// ───────────── Línea: periodo actual vs comparado ─────────────
export function GraficaLinea({ datos, etiquetaActual, etiquetaComparado }: { datos: { etiqueta: string; actual: number; comparado: number }[]; etiquetaActual: string; etiquetaComparado?: string }) {
  const [h, setH] = useState<number | null>(null);
  const W = 800, H = 280, m = { l: 52, r: 12, t: 16, b: 30 };
  const max = Math.max(1, ...datos.flatMap((d) => [d.actual, d.comparado]));
  const { tope, marcas } = escala(max);
  const x = (i: number) => m.l + (datos.length <= 1 ? 0 : (i / (datos.length - 1)) * (W - m.l - m.r));
  const y = (v: number) => m.t + (1 - v / tope) * (H - m.t - m.b);
  const ruta = (k: 'actual' | 'comparado') => datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(' ');
  const area = `${ruta('actual')} L${x(datos.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const paso = Math.max(1, Math.ceil(datos.length / 8));
  const sel = h !== null ? datos[h] : null;
  const anchoCol = (W - m.l - m.r) / datos.length;

  return (
    <View>
      <Text style={styles.lectura} accessibilityLiveRegion="polite">
        {sel ? `${sel.etiqueta}: ${dinero(sel.actual)}${etiquetaComparado ? ` · ${etiquetaComparado}: ${dinero(sel.comparado)}` : ''}` : 'Toca la gráfica para ver el detalle.'}
      </Text>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={200} accessibilityLabel={`Ingresos por periodo. Total ${dinero(datos.reduce((a, d) => a + d.actual, 0))}`}>
        {marcas.map((v) => (
          <G key={v}>
            <Line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={colors.borde} strokeWidth={1} />
            <SvgText x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize={13} fill={colors.textoTenue}>{compacto(v)}</SvgText>
          </G>
        ))}
        {datos.map((d, i) => (i % paso === 0 ? <SvgText key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={13} fill={colors.textoTenue}>{d.etiqueta}</SvgText> : null))}
        {etiquetaComparado ? <Path d={ruta('comparado')} fill="none" strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" stroke={colors.textoTenue} /> : null}
        <Path d={area} fill={colors.acento} opacity={0.12} />
        <Path d={ruta('actual')} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" stroke={colors.acentoFuerte} />
        {h !== null ? <Line x1={x(h)} x2={x(h)} y1={m.t} y2={y(0)} strokeWidth={1} stroke={colors.textoTenue} /> : null}
        {h !== null ? <Circle cx={x(h)} cy={y(datos[h].actual)} r={6} fill={colors.acentoFuerte} stroke={colors.superficie} strokeWidth={2} /> : null}
        {datos.map((_, i) => (
          <Rect key={i} x={x(i) - anchoCol / 2} y={m.t} width={anchoCol} height={H - m.t - m.b} fill="transparent" onPress={() => setH(i)} />
        ))}
      </Svg>
      <Leyenda items={[{ c: 'acentoFuerte', t: etiquetaActual }, ...(etiquetaComparado ? [{ c: 'textoTenue' as ColorKey, t: etiquetaComparado, punteada: true }] : [])]} />
    </View>
  );
}

// ───────────── Barras apiladas (12 meses) ─────────────
export function BarrasApiladas({ datos }: { datos: { mes: string; servicios: number; productos: number }[] }) {
  const [h, setH] = useState<number | null>(null);
  const W = 800, H = 260, m = { l: 52, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...datos.map((d) => d.servicios + d.productos));
  const { tope, marcas } = escala(max);
  const bw = (W - m.l - m.r) / datos.length;
  const y = (v: number) => m.t + (1 - v / tope) * (H - m.t - m.b);
  const sel = h !== null ? datos[h] : null;
  return (
    <View>
      <Text style={styles.lectura}>{sel ? `${sel.mes}: servicios ${dinero(sel.servicios)} · productos ${dinero(sel.productos)}` : 'Toca una columna para ver el detalle.'}</Text>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={200} accessibilityLabel="Ingresos de los últimos 12 meses por servicios y productos">
        {marcas.map((v) => (
          <G key={v}>
            <Line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={colors.borde} />
            <SvgText x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize={13} fill={colors.textoTenue}>{compacto(v)}</SvgText>
          </G>
        ))}
        {datos.map((d, i) => {
          const x0 = m.l + i * bw + bw * 0.18;
          const w = bw * 0.64;
          return (
            <G key={d.mes} opacity={h === null || h === i ? 1 : 0.45} onPress={() => setH(i)}>
              <Rect x={m.l + i * bw} y={m.t} width={bw} height={H - m.t - m.b} fill="transparent" />
              <Rect x={x0} y={y(d.servicios)} width={w} height={y(0) - y(d.servicios)} rx={3} fill={colors.acentoFuerte} />
              <Rect x={x0} y={y(d.servicios + d.productos)} width={w} height={y(d.servicios) - y(d.servicios + d.productos)} rx={3} fill={colors.loto} />
              <SvgText x={x0 + w / 2} y={H - 8} textAnchor="middle" fontSize={11.5} fill={colors.textoTenue}>{d.mes.slice(0, 3)}</SvgText>
            </G>
          );
        })}
      </Svg>
      <Leyenda items={[{ c: 'acentoFuerte', t: 'Servicios' }, { c: 'loto', t: 'Productos' }]} />
    </View>
  );
}

// ───────────── Barras agrupadas (por día de semana) ─────────────
export function BarrasAgrupadas({ datos, etiquetaComparado }: { datos: { dia: string; actual: number; comparado: number }[]; etiquetaComparado?: string }) {
  const W = 480, H = 200, m = { l: 28, r: 4, t: 8, b: 26 };
  const max = Math.max(1, ...datos.flatMap((d) => [d.actual, d.comparado]));
  const { tope } = escala(max);
  const bw = (W - m.l - m.r) / datos.length;
  const y = (v: number) => m.t + (1 - v / tope) * (H - m.t - m.b);
  return (
    <View>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={180} accessibilityLabel="Citas por día de la semana">
        <Line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke={colors.borde} />
        {datos.map((d, i) => {
          const x0 = m.l + i * bw + bw * 0.12;
          const w = (bw * 0.76) / (etiquetaComparado ? 2 : 1);
          return (
            <G key={d.dia}>
              <Rect x={x0} y={y(d.actual)} width={w} height={y(0) - y(d.actual)} rx={3} fill={colors.acentoFuerte} />
              {etiquetaComparado ? <Rect x={x0 + w + 2} y={y(d.comparado)} width={w} height={y(0) - y(d.comparado)} rx={3} fill={colors.textoTenue} opacity={0.55} /> : null}
              <SvgText x={m.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize={13} fill={colors.textoTenue}>{d.dia}</SvgText>
              <SvgText x={x0 + w / 2} y={y(d.actual) - 4} textAnchor="middle" fontSize={12} fill={colors.textoSecundario}>{d.actual || ''}</SvgText>
            </G>
          );
        })}
      </Svg>
      <Leyenda items={[{ c: 'acentoFuerte', t: 'Periodo actual' }, ...(etiquetaComparado ? [{ c: 'textoTenue' as ColorKey, t: etiquetaComparado }] : [])]} />
    </View>
  );
}

// ───────────── Dona ─────────────
const PALETA: ColorKey[] = ['acentoFuerte', 'loto', 'primario', 'marino', 'textoTenue', 'aviso'];
export function Dona({ datos, formato = dinero }: { datos: { etiqueta: string; valor: number }[]; formato?: (n: number) => string }) {
  const total = datos.reduce((a, d) => a + d.valor, 0) || 1;
  const R = 70, r = 46, c = 90;
  const segmentos = datos.reduce<{ a0: number; a1: number }[]>((acc, d) => {
    const a0 = acc.length ? acc[acc.length - 1].a1 : -Math.PI / 2;
    return [...acc, { a0, a1: a0 + Math.min(0.9999, d.valor / total) * Math.PI * 2 }];
  }, []);
  const arco = (a0: number, a1: number) => {
    const p = (a: number, rad: number) => `${c + rad * Math.cos(a)} ${c + rad * Math.sin(a)}`;
    const g = a1 - a0 > Math.PI ? 1 : 0;
    return `M${p(a0, R)} A${R} ${R} 0 ${g} 1 ${p(a1, R)} L${p(a1, r)} A${r} ${r} 0 ${g} 0 ${p(a0, r)} Z`;
  };
  return (
    <View style={styles.dona}>
      <Svg viewBox="0 0 180 180" width={170} height={170} accessibilityLabel="Ingresos por categoría">
        {datos.map((d, i) => {
          const { a0, a1 } = segmentos[i];
          return <Path key={d.etiqueta} d={arco(a0, a1 - 0.012)} fill={colors[PALETA[i % PALETA.length]]} />;
        })}
        <SvgText x={c} y={c - 2} textAnchor="middle" fontSize={11} fill={colors.textoTenue}>Total</SvgText>
        <SvgText x={c} y={c + 16} textAnchor="middle" fontSize={15} fontWeight="600" fill={colors.texto}>{compacto(total)}</SvgText>
      </Svg>
      <View style={{ flex: 1, minWidth: 160, gap: 8 }}>
        {datos.map((d, i) => (
          <View key={d.etiqueta} style={styles.filaLey}>
            <View style={[styles.cuadro, { backgroundColor: colors[PALETA[i % PALETA.length]] }]} />
            <Text style={styles.leyTexto} numberOfLines={1}>{d.etiqueta}</Text>
            <Text style={styles.leyValor}>{Math.round((d.valor / total) * 100)}% · {formato(d.valor)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ───────────── Barras horizontales (rankings) ─────────────
export function Ranking({ datos, formato = dinero, color = 'acentoFuerte' }: { datos: { etiqueta: string; valor: number; detalle?: string }[]; formato?: (n: number) => string; color?: ColorKey }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  if (!datos.length) return <Text style={styles.vacio}>Sin datos en este periodo.</Text>;
  return (
    <View style={{ gap: 12 }}>
      {datos.map((d) => (
        <View key={d.etiqueta} style={{ gap: 5 }}>
          <View style={styles.filaLey}>
            <Text style={[styles.leyTexto, { fontWeight: '500' }]} numberOfLines={1}>{d.etiqueta}</Text>
            <Text style={styles.leyValor}>{formato(d.valor)}</Text>
          </View>
          <View style={styles.pista}>
            <View style={[styles.relleno, { width: `${(d.valor / max) * 100}%`, backgroundColor: colors[color] }]} />
          </View>
          {d.detalle ? <Text style={styles.detalle}>{d.detalle}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function Leyenda({ items }: { items: { c: ColorKey; t: string; punteada?: boolean }[] }) {
  return (
    <View style={styles.ley}>
      {items.map((i) => (
        <View key={i.t} style={styles.filaLey}>
          <View style={[styles.cuadro, i.punteada ? { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors[i.c] } : { backgroundColor: colors[i.c] }]} />
          <Text style={styles.leyTexto}>{i.t}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lectura: { color: colors.texto, fontSize: 13, fontWeight: '500', minHeight: 20, marginBottom: 4 },
  ley: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
  filaLey: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cuadro: { width: 12, height: 12, borderRadius: 3 },
  leyTexto: { color: colors.textoSecundario, fontSize: 13, flex: 1 },
  leyValor: { color: colors.texto, fontSize: 13, fontWeight: '500' },
  dona: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 },
  pista: { height: 8, borderRadius: 4, backgroundColor: colors.aguaSuave, overflow: 'hidden' },
  relleno: { height: 8, borderRadius: 4 },
  detalle: { color: colors.textoTenue, fontSize: 12 },
  vacio: { color: colors.textoTenue, fontSize: 13 },
});
