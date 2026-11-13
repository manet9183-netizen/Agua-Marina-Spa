import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Badge, Cargando, Notice, ErrorCarga } from '@/components/ui/Feedback';
import { Card, Columnas, PageHeader } from '@/components/ui/Layout';
import { colors } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, obtenerInventario, registrarMovimiento } from '@/lib/api';
import { useDb } from '@/lib/store';
import type { MovimientoInventario } from '@/lib/types';

/**
 * INT-09 · Inventario y alertas de stock (CU-06, ENT-08, SAL-07; RF-M04-02/03, RNB-04).
 *  - Alerta cuando existencia <= mínimo (RNB-04): se resalta en la tabla y en un
 *    aviso superior. En la app móvil además será una notificación push; en web la
 *    alerta es visual (las push requieren service worker y quedan como mejora).
 *  - Ningún movimiento puede dejar el stock en negativo (lo valida la API).
 *  - "Ajuste" fija la existencia al conteo físico indicado.
 */
const TIPOS: MovimientoInventario['tipo'][] = ['entrada', 'salida', 'ajuste'];

export default function Inventario() {
  const db = useDb();
  const { datos, cargando, error, recargar } = useAsync(() => obtenerInventario(), [db.revision]);
  const [idProducto, setIdProducto] = useState<string>('');
  const [tipo, setTipo] = useState<MovimientoInventario['tipo']>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'exito' | 'error' | 'aviso'; texto: string }>();
  const [enviando, setEnviando] = useState(false);

  const enAlerta = (datos?.productos ?? []).filter((p) => p.enAlerta);
  const nombreDe = (id: string) => datos?.productos.find((p) => p.id === id)?.nombre ?? id;

  const guardar = async () => {
    setMsg(undefined);
    if (!idProducto) return setMsg({ tipo: 'error', texto: 'Elige un producto.' });
    const n = Number(cantidad);
    if (!cantidad.trim() || !Number.isInteger(n) || n < 0) return setMsg({ tipo: 'error', texto: 'La cantidad debe ser un entero válido.' });
    setEnviando(true);
    try {
      const r = await registrarMovimiento(idProducto, tipo, n, motivo);
      setMsg(
        r.enAlerta
          ? { tipo: 'aviso', texto: `Movimiento guardado. "${r.producto.nombre}" está en o bajo su stock mínimo.` }
          : { tipo: 'exito', texto: 'Movimiento guardado.' },
      );
      setCantidad('');
      setMotivo('');
    } catch (e) {
      setMsg({ tipo: 'error', texto: e instanceof ApiError ? e.message : 'No se pudo guardar.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <PageHeader sobretitulo="Administración" titulo="Inventario" descripcion="Existencias, alertas de stock mínimo y movimientos." />
      {enAlerta.length ? (
        <Notice tipo="aviso">
          Stock mínimo alcanzado en: {enAlerta.map((p) => `${p.nombre} (${p.stock})`).join(' · ')}
        </Notice>
      ) : null}
      {error ? <ErrorCarga mensaje={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <Cargando /> : null}

      <Columnas gap={20}>
        <View style={{ flex: 2, alignSelf: 'stretch', gap: 12 }}>
          {(datos?.productos ?? []).map((p) => (
            <Card key={p.id} style={[styles.fila, p.enAlerta && { borderWidth: 1, borderColor: colors.aviso }]}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={styles.nombre}>{p.nombre}</Text>
                <Text style={styles.sub}>Mínimo: {p.stockMinimo}{p.codigoBarras ? ` · ${p.codigoBarras}` : ''}{!p.activo ? ' · deshabilitado' : ''}</Text>
              </View>
              <Text style={[styles.stock, p.enAlerta && { color: colors.aviso }]}>{p.stock}</Text>
              {p.stock <= 0 ? <Badge tipo="error" texto="Agotado" /> : p.enAlerta ? <Badge tipo="aviso" texto="Stock mínimo" /> : <Badge tipo="exito" texto="OK" />}
            </Card>
          ))}

          <Text style={styles.titulo}>Últimos movimientos</Text>
          <Card>
            {(datos?.movimientos ?? []).map((m) => (
              <View key={m.id} style={styles.mov}>
                <Text style={styles.sub}>{new Date(m.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                <Text style={[styles.nombre, { flex: 1 }]}>{nombreDe(m.idProducto)}</Text>
                <Text style={styles.sub}>{m.tipo} {m.cantidad} · {m.motivo}</Text>
              </View>
            ))}
          </Card>
        </View>

        <View style={{ flex: 1, alignSelf: 'stretch', minWidth: 280 }}>
          <Card>
            <Text style={styles.titulo}>Registrar movimiento</Text>
            <Text style={styles.etiqueta}>Producto</Text>
            <View style={styles.chips}>
              {(datos?.productos ?? []).map((p) => <Chip key={p.id} texto={p.nombre} activo={idProducto === p.id} onPress={() => setIdProducto(p.id)} />)}
            </View>
            <Text style={styles.etiqueta}>Tipo</Text>
            <View style={styles.chips}>
              {TIPOS.map((t) => <Chip key={t} texto={t === 'ajuste' ? 'ajuste (conteo)' : t} activo={tipo === t} onPress={() => setTipo(t)} />)}
            </View>
            <Field etiqueta={tipo === 'ajuste' ? 'Existencia real contada' : 'Cantidad'} keyboardType="numeric" value={cantidad} onChangeText={setCantidad} />
            <Field etiqueta="Motivo" placeholder="Ej. Compra a proveedor, merma…" value={motivo} onChangeText={setMotivo} />
            {msg ? <Notice tipo={msg.tipo}>{msg.texto}</Notice> : null}
            <Button bloque titulo="Guardar movimiento" cargando={enviando} onPress={guardar} />
          </Card>
        </View>
      </Columnas>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 16 },
  nombre: { fontSize: 14, fontWeight: 'bold', color: colors.texto },
  sub: { fontSize: 12, color: colors.textoSecundario },
  stock: { fontSize: 26, fontWeight: 'bold', color: colors.texto, minWidth: 40, textAlign: 'right' },
  titulo: { fontSize: 18, fontWeight: 'bold', color: colors.texto, marginBottom: 8 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colors.textoEtiqueta, marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  mov: { flexDirection: 'row', gap: 12, paddingVertical: 6, flexWrap: 'wrap' },
});
