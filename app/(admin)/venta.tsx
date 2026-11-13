import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Cargando, Notice } from '@/components/ui/Feedback';
import { Card, Columnas, PageHeader } from '@/components/ui/Layout';
import { colors } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, obtenerCatalogo, registrarVenta } from '@/lib/api';
import { dinero } from '@/lib/format';
import { useDb } from '@/lib/store';
import type { MetodoPago, Producto, Venta } from '@/lib/types';

/**
 * INT-08 · Punto de venta (CU-05, ENT-07, SAL-06; RF-M04-01/02/04, RNB-03/07).
 *  - El cobro ocurre FUERA del sistema (efectivo, terminal o transferencia): aquí
 *    solo se registra qué se vendió, a quién y cómo se pagó. No hay ticket.
 *  - Búsqueda por nombre o código de barras. NOTA: la lectura con la cámara del
 *    teléfono (RNF-02) es una función de la app móvil; en web se acepta teclear el
 *    código o usar un lector USB (que "teclea" el código y envía Enter).
 *  - El total mostrado es INFORMATIVO; la API lo recalcula con precios vigentes.
 *  - Si falta existencia en UNA línea se rechaza TODA la venta (sin ventas parciales).
 */
interface Linea {
  tipo: 'producto' | 'servicio';
  idItem: string;
  nombre: string;
  precio: number;
  cantidad: number;
  tope?: number; // existencia disponible (solo productos)
}
const METODOS: MetodoPago[] = ['Efectivo', 'Terminal bancaria', 'Transferencia'];

export default function PuntoDeVenta() {
  const db = useDb();
  const { datos, cargando } = useAsync(() => obtenerCatalogo(), [db.revision]);
  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('Efectivo');
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ venta: Venta; alertas: Producto[] } | null>(null);

  const q = busqueda.trim().toLowerCase();
  const coincidencias = !datos || !q
    ? []
    : [
        ...datos.productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigoBarras === busqueda.trim()).map((p) => ({ tipo: 'producto' as const, id: p.id, nombre: p.nombre, precio: p.precio, tope: p.stock, agotado: p.agotado })),
        ...datos.servicios.filter((s) => s.nombre.toLowerCase().includes(q)).map((s) => ({ tipo: 'servicio' as const, id: s.id, nombre: s.nombre, precio: s.precio, tope: undefined, agotado: false })),
      ].slice(0, 8);

  const agregar = (c: (typeof coincidencias)[number]) => {
    if (c.agotado) return setError(`"${c.nombre}" está agotado: no se puede vender (RNB-07).`);
    setError(undefined);
    setLineas((prev) => {
      const ya = prev.find((l) => l.idItem === c.id && l.tipo === c.tipo);
      if (ya) return prev.map((l) => (l === ya ? { ...l, cantidad: Math.min(l.cantidad + 1, l.tope ?? Infinity) } : l));
      return [...prev, { tipo: c.tipo, idItem: c.id, nombre: c.nombre, precio: c.precio, cantidad: 1, tope: c.tope }];
    });
    setBusqueda('');
  };

  const cambiar = (l: Linea, delta: number) =>
    setLineas((prev) =>
      prev.flatMap((x) => {
        if (x !== l) return [x];
        const n = Math.min(x.cantidad + delta, x.tope ?? Infinity);
        return n <= 0 ? [] : [{ ...x, cantidad: n }];
      }),
    );

  const total = lineas.reduce((a, l) => a + l.cantidad * l.precio, 0);

  const registrar = async () => {
    setError(undefined);
    setEnviando(true);
    try {
      const r = await registrarVenta({
        lineas: lineas.map((l) => ({ tipo: l.tipo, idItem: l.idItem, cantidad: l.cantidad })),
        metodoPago: metodo,
        correoCliente: correo,
        nombreCliente: nombre,
      });
      setResultado(r);
      setLineas([]);
      setCorreo('');
      setNombre('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar la venta.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <PageHeader sobretitulo="Administración" titulo="Nueva venta" descripcion="Registra ventas de productos y servicios. El cobro se realiza fuera del sistema." />

      {resultado ? (
        <Card style={{ marginBottom: 16, gap: 6 }}>
          <Notice tipo="exito">Venta registrada. Total: {dinero(resultado.venta.total)} · {resultado.venta.metodoPago}</Notice>
          {resultado.venta.lineas.map((l) => (
            <Text key={l.idItem} style={styles.sub}>{l.cantidad} × {l.nombre} · {dinero(l.precioUnitario)} c/u</Text>
          ))}
          {resultado.alertas.map((p) => (
            <Notice key={p.id} tipo="aviso">Alerta de stock mínimo: «{p.nombre}» quedó con {p.stock} (mínimo {p.stockMinimo}). Revisa Inventario.</Notice>
          ))}
          <View style={{ alignSelf: 'flex-start' }}>
            <Button compacto variante="secundario" titulo="Nueva venta" onPress={() => setResultado(null)} />
          </View>
        </Card>
      ) : null}

      <Columnas gap={20}>
        <View style={{ flex: 1, alignSelf: 'stretch', gap: 12 }}>
          <Card>
            <Field etiqueta="Buscar producto o servicio (nombre o código de barras)" placeholder="Ej. Crema, 7501234567890…" value={busqueda} onChangeText={setBusqueda} autoCapitalize="none" />
            {cargando && !datos ? <Cargando /> : null}
            <View style={{ gap: 8 }}>
              {coincidencias.map((c) => (
                <View key={`${c.tipo}-${c.id}`} style={styles.fila}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nombre}>{c.nombre}</Text>
                    <Text style={styles.sub}>
                      {c.tipo === 'producto' ? (c.agotado ? 'Agotado' : `Existencia: ${c.tope}`) : 'Servicio'} · {dinero(c.precio)}
                    </Text>
                  </View>
                  <Button compacto titulo="Agregar" deshabilitado={c.agotado} onPress={() => agregar(c)} />
                </View>
              ))}
              {q && datos && !coincidencias.length ? <Text style={styles.sub}>Sin resultados.</Text> : null}
            </View>
          </Card>
        </View>

        <View style={{ flex: 1, alignSelf: 'stretch' }}>
          <Card style={{ gap: 4 }}>
            <Text style={styles.titulo}>Venta actual</Text>
            {!lineas.length ? <Text style={styles.sub}>Agrega artículos desde la búsqueda.</Text> : null}
            {lineas.map((l) => (
              <View key={`${l.tipo}-${l.idItem}`} style={styles.fila}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre}>{l.nombre}</Text>
                  <Text style={styles.sub}>{l.cantidad} × {dinero(l.precio)} = {dinero(l.cantidad * l.precio)}</Text>
                </View>
                <Button compacto variante="secundario" titulo="−" onPress={() => cambiar(l, -1)} />
                <Button compacto variante="secundario" titulo="+" onPress={() => cambiar(l, 1)} />
              </View>
            ))}

            <View style={{ height: 8 }} />
            <Field etiqueta="Cliente (opcional) · correo de su cuenta" autoCapitalize="none" keyboardType="email-address" value={correo} onChangeText={setCorreo} placeholder="Buscar por correo" />
            {!correo.trim() ? <Field etiqueta="o solo el nombre" value={nombre} onChangeText={setNombre} placeholder="Escribir nombre" /> : null}
            <Text style={styles.etiqueta}>Método de pago</Text>
            <View style={styles.chips}>
              {METODOS.map((m) => <Chip key={m} texto={m} activo={metodo === m} onPress={() => setMetodo(m)} />)}
            </View>
            <Text style={styles.total}>Total: {dinero(total)}</Text>
            {error ? <Notice tipo="error">{error}</Notice> : null}
            <Button bloque titulo="Registrar venta" deshabilitado={!lineas.length} cargando={enviando} onPress={registrar} />
          </Card>
        </View>
      </Columnas>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borde },
  nombre: { fontSize: 14, fontWeight: '600', color: colors.texto },
  sub: { fontSize: 12, color: colors.textoSecundario },
  titulo: { fontSize: 18, fontWeight: 'bold', color: colors.texto, marginBottom: 8 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colors.textoEtiqueta, marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  total: { fontSize: 24, fontWeight: 'bold', color: colors.primario, marginVertical: 10 },
});
