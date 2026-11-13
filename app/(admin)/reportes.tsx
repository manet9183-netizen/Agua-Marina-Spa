import { Pantalla } from '@/components/Pantalla';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarrasAgrupadas, BarrasApiladas, Dona, GraficaLinea, Ranking } from '@/components/Graficas';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Cargando, ErrorCarga } from '@/components/ui/Feedback';
import { Card, PageHeader } from '@/components/ui/Layout';
import { colors, fonts } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useLayout } from '@/hooks/useLayout';
import { generarDashboard, type Comparacion } from '@/lib/api';
import { claveDia, sumarDias } from '@/lib/dates';
import { dinero } from '@/lib/format';
import { useDb } from '@/lib/store';

/**
 * INT-10 · Reportes → DASHBOARD de negocio (CU-07, RF-M05-01/02 ampliados).
 *  - Periodo: atajos (este mes, mes pasado, 30/90 días, este año, año pasado) o fechas.
 *  - Comparación: contra el periodo anterior (misma duración) o contra el mismo
 *    periodo del año pasado; todas las tarjetas muestran la variación %.
 *  - Para cancelaciones, una BAJA es buena (verde) y una SUBIDA mala (rojo): por eso
 *    cada KPI declara `masEsMejor`.
 *  - Solo lectura. La administradora es la única con acceso (ruta protegida + API).
 */
const FORMATO = /^\d{4}-\d{2}-\d{2}$/;
const hoy = new Date();
const mesIni = (m: number) => new Date(hoy.getFullYear(), hoy.getMonth() + m, 1);
const mesFin = (m: number) => new Date(hoy.getFullYear(), hoy.getMonth() + m + 1, 0);

const ATAJOS: { id: string; texto: string; rango: () => [Date, Date] }[] = [
  { id: 'mes', texto: 'Este mes', rango: () => [mesIni(0), sumarDias(hoy, -1)] },
  { id: 'mespas', texto: 'Mes pasado', rango: () => [mesIni(-1), mesFin(-1)] },
  { id: '30', texto: 'Últimos 30 días', rango: () => [sumarDias(hoy, -30), sumarDias(hoy, -1)] },
  { id: '90', texto: 'Últimos 90 días', rango: () => [sumarDias(hoy, -90), sumarDias(hoy, -1)] },
  { id: 'anio', texto: 'Este año', rango: () => [new Date(hoy.getFullYear(), 0, 1), sumarDias(hoy, -1)] },
  { id: 'aniopas', texto: 'Año pasado', rango: () => [new Date(hoy.getFullYear() - 1, 0, 1), new Date(hoy.getFullYear() - 1, 11, 31)] },
];
const COMPARACIONES: { id: Comparacion; texto: string }[] = [
  { id: 'anterior', texto: 'vs periodo anterior' },
  { id: 'anio', texto: 'vs mismo periodo del año pasado' },
  { id: 'ninguna', texto: 'Sin comparar' },
];

export default function Reportes() {
  const db = useDb();
  const { esMovil, esEscritorio } = useLayout();
  const [atajo, setAtajo] = useState('30');
  const [desde, setDesde] = useState(claveDia(sumarDias(hoy, -30)));
  const [hasta, setHasta] = useState(claveDia(sumarDias(hoy, -1)));
  const [comparar, setComparar] = useState<Comparacion>('anterior');
  const validos = FORMATO.test(desde) && FORMATO.test(hasta) && desde <= hasta;

  const { datos, cargando, error, recargar } = useAsync(
    () => (validos ? generarDashboard(desde, hasta, comparar) : Promise.reject(new Error('Revisa las fechas del periodo.'))),
    [desde, hasta, comparar, db.revision],
  );

  const elegir = (id: string) => {
    const a = ATAJOS.find((x) => x.id === id)!;
    const [d, h] = a.rango();
    setAtajo(id); setDesde(claveDia(d)); setHasta(claveDia(h));
  };

  const A = datos?.actual; const C = datos?.comparado ?? null;
  const etiquetaComp = comparar === 'anio' ? 'Mismo periodo, año pasado' : comparar === 'anterior' ? 'Periodo anterior' : undefined;
  const cols = esEscritorio ? 3 : esMovil ? 1 : 2;

  return (
    <Pantalla>
      <PageHeader sobretitulo="Administración" titulo="Reportes" descripcion="Cómo va el negocio y cómo se compara con meses y años anteriores." />

      <Card style={{ gap: 14, marginBottom: 20 }}>
        <View style={styles.chips}>{ATAJOS.map((a) => <Chip key={a.id} texto={a.texto} activo={atajo === a.id} onPress={() => elegir(a.id)} />)}</View>
        <View style={styles.chips}>{COMPARACIONES.map((c) => <Chip key={c.id} texto={c.texto} activo={comparar === c.id} onPress={() => setComparar(c.id)} />)}</View>
        <View style={styles.rango}>
          <View style={{ flex: 1, minWidth: 150 }}><Field etiqueta="Desde (AAAA-MM-DD)" value={desde} onChangeText={(v) => { setDesde(v); setAtajo(''); }} error={!FORMATO.test(desde) ? 'Formato AAAA-MM-DD' : desde > hasta ? 'No puede ser posterior al fin.' : undefined} /></View>
          <View style={{ flex: 1, minWidth: 150 }}><Field etiqueta="Hasta (AAAA-MM-DD)" value={hasta} onChangeText={(v) => { setHasta(v); setAtajo(''); }} error={!FORMATO.test(hasta) ? 'Formato AAAA-MM-DD' : undefined} /></View>
        </View>
        {datos?.rango.comparadoDesde ? <Text style={styles.nota}>Comparando con {datos.rango.comparadoDesde} → {datos.rango.comparadoHasta}</Text> : null}
      </Card>

      {cargando && !datos ? <Cargando /> : null}
      {error && validos ? <ErrorCarga mensaje={error} onReintentar={recargar} /> : null}

      {datos && A ? (
        <View style={{ gap: 20 }}>
          <View style={styles.kpis}>
            <Kpi ancho={cols} titulo="Ingresos" valor={dinero(A.ingresos)} a={A.ingresos} c={C?.ingresos} sub={`Servicios ${dinero(A.ingresosServicios)} · Productos ${dinero(A.ingresosProductos)}`} />
            <Kpi ancho={cols} titulo="Citas" valor={String(A.citas)} a={A.citas} c={C?.citas} sub={`${A.finalizadas} finalizadas`} />
            <Kpi ancho={cols} titulo="Ticket promedio" valor={dinero(A.ticketPromedio)} a={A.ticketPromedio} c={C?.ticketPromedio} sub="Por servicio o venta" />
            <Kpi ancho={cols} titulo="Cancelaciones" valor={`${(A.tasaCancelacion * 100).toFixed(1)}%`} a={A.tasaCancelacion} c={C?.tasaCancelacion} sub={`${A.canceladas} canceladas · ${A.noShow} no se presentaron`} masEsMejor={false} />
            <Kpi ancho={cols} titulo="Clientes atendidos" valor={String(A.clientesUnicos)} a={A.clientesUnicos} c={C?.clientesUnicos} sub="Clientes distintos con cita" />
            <Kpi ancho={cols} titulo="Servicios vs productos" valor={`${Math.round((A.ingresosServicios / (A.ingresos || 1)) * 100)}%`} a={A.ingresosServicios} c={C?.ingresosServicios} sub="Del ingreso viene de servicios" />
          </View>

          <Panel titulo={`Ingresos por ${datos.granularidad}`} nota="Toca la gráfica para ver el detalle."><GraficaLinea datos={datos.serie} etiquetaActual="Periodo seleccionado" etiquetaComparado={etiquetaComp} /></Panel>
          <Panel titulo="Tendencia de los últimos 12 meses" nota="Terminando en el mes de la fecha final."><BarrasApiladas datos={datos.ultimos12} /></Panel>

          <View style={[styles.fila, { flexDirection: esEscritorio ? 'row' : 'column' }]}>
            <Panel titulo="De dónde vienen los ingresos" flex><Dona datos={datos.porCategoria.map((c) => ({ etiqueta: c.categoria, valor: c.ingresos }))} /></Panel>
            <Panel titulo="Citas por día de la semana" flex><BarrasAgrupadas datos={datos.citasPorDiaSemana} etiquetaComparado={etiquetaComp} /></Panel>
          </View>
          <View style={[styles.fila, { flexDirection: esEscritorio ? 'row' : 'column' }]}>
            <Panel titulo="Servicios que más ingresan" flex><Ranking datos={datos.topServicios.map((s) => ({ etiqueta: s.nombre, valor: s.ingresos, detalle: `${s.cantidad} servicio(s)` }))} /></Panel>
            <Panel titulo="Productos más vendidos" flex><Ranking color="loto" datos={datos.topProductos.map((s) => ({ etiqueta: s.nombre, valor: s.ingresos, detalle: `${s.cantidad} unidad(es)` }))} /></Panel>
          </View>
          <Panel titulo="Motivos de cancelación" nota="Ayudan a decidir recordatorios o políticas de anticipación."><Ranking color="aviso" formato={(n) => `${n}`} datos={datos.motivosCancelacion.map((m) => ({ etiqueta: m.motivo, valor: m.cantidad }))} /></Panel>
        </View>
      ) : null}
    </Pantalla>
  );
}

function Panel({ titulo, nota, children, flex }: { titulo: string; nota?: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <View style={flex ? { flex: 1, alignSelf: 'stretch' } : undefined}>
      <Card style={{ gap: 12, flex: flex ? 1 : undefined }}>
        <View>
          <Text style={styles.panelTitulo}>{titulo}</Text>
          {nota ? <Text style={styles.nota}>{nota}</Text> : null}
        </View>
        {children}
      </Card>
    </View>
  );
}

function Kpi({ titulo, valor, a, c, sub, masEsMejor = true, ancho }: { titulo: string; valor: string; a: number; c?: number | null; sub: string; masEsMejor?: boolean; ancho: number }) {
  const delta = c !== undefined && c !== null ? (c === 0 ? (a === 0 ? 0 : 1) : (a - c) / c) : null;
  const bueno = delta === null || delta === 0 ? null : (delta > 0) === masEsMejor;
  return (
    <View style={{ width: `${100 / ancho - 2}%`, flexGrow: 1, minWidth: 220 }}>
      <Card style={{ gap: 6 }}>
        <Text style={styles.kpiTitulo}>{titulo}</Text>
        <Text style={styles.kpiValor}>{valor}</Text>
        {delta !== null ? (
          <Text style={[styles.delta, { color: bueno === null ? colors.textoTenue : bueno ? colors.exito : colors.peligro }]}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} {Math.abs(delta * 100).toFixed(1)}%{c ? <Text style={styles.nota}>{'  vs ' + (titulo === 'Cancelaciones' ? `${(c * 100).toFixed(1)}%` : titulo.startsWith('Ingresos') || titulo === 'Ticket promedio' ? dinero(c) : Math.round(c))}</Text> : null}
          </Text>
        ) : <Text style={styles.nota}> </Text>}
        <Text style={styles.nota}>{sub}</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rango: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  fila: { gap: 20 },
  panelTitulo: { color: colors.texto, fontFamily: fonts.titulo, fontSize: 24, fontWeight: '600' },
  nota: { color: colors.textoTenue, fontSize: 12 },
  kpiTitulo: { color: colors.textoSecundario, fontSize: 13, fontWeight: '500' },
  kpiValor: { color: colors.texto, fontFamily: fonts.titulo, fontSize: 38, fontWeight: '600', lineHeight: 40 },
  delta: { fontSize: 13, fontWeight: '600' },
});
