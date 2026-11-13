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
import { ApiError, cambiarActivo, guardarElementoCatalogo, obtenerCatalogo } from '@/lib/api';
import { dinero, duracion } from '@/lib/format';
import { useDb } from '@/lib/store';
import type { Producto, Servicio } from '@/lib/types';
import { hayErrores, validarEntero, validarPrecio, type Errores } from '@/lib/validation';

/**
 * INT-07 · Gestión de catálogo (CU-09, ENT-06 "Alta y edición de servicio o
 * producto", RF-M02-02). Un MISMO formulario sirve para servicios y productos: al
 * elegir "Servicio" desaparecen existencia/mínimo/código y aparece "Duración".
 *  - La categoría es texto libre (sin tabla aparte), como pide el diseño.
 *  - Deshabilitar NO borra: es baja lógica con un interruptor en la lista.
 *  - En EDICIÓN no se modifica la existencia (solo con movimientos, en Inventario),
 *    para que el kárdex siempre cuadre.
 */
type Tipo = 'servicio' | 'producto';
type Campo = 'nombre' | 'precio' | 'categoria' | 'duracion' | 'stock' | 'minimo' | 'codigo';
interface Form {
  id?: string;
  tipo: Tipo;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: string;
  duracion: string;
  stock: string;
  minimo: string;
  codigo: string;
}
const vacio = (tipo: Tipo): Form => ({ tipo, nombre: '', descripcion: '', categoria: '', precio: '', duracion: '60', stock: '0', minimo: '3', codigo: '' });

export default function GestionCatalogo() {
  const db = useDb();
  const { datos, cargando, error, recargar } = useAsync(() => obtenerCatalogo(true), [db.revision]);
  const [pestana, setPestana] = useState<Tipo>('servicio');
  const [form, setForm] = useState<Form | null>(null);
  const [mensaje, setMensaje] = useState<string>();

  const lista = (pestana === 'servicio' ? datos?.servicios : datos?.productos) ?? [];

  const alternar = async (id: string, activo: boolean) => {
    await cambiarActivo(pestana, id, !activo);
    recargar();
  };

  const editar = (el: Servicio | Producto) =>
    setForm({
      id: el.id,
      tipo: pestana,
      nombre: el.nombre,
      descripcion: el.descripcion,
      categoria: el.categoria,
      precio: String(el.precio),
      duracion: 'duracionMin' in el ? String(el.duracionMin) : '60',
      stock: 'stock' in el ? String(el.stock) : '0',
      minimo: 'stockMinimo' in el ? String(el.stockMinimo) : '3',
      codigo: 'codigoBarras' in el ? el.codigoBarras ?? '' : '',
    });

  return (
    <Pantalla>
      <PageHeader
        sobretitulo="Administración"
        titulo="Gestión de catálogo"
        descripcion="Agrega, edita o deshabilita servicios y productos."
        acciones={<Button compacto titulo={`+ Nuevo ${pestana}`} onPress={() => { setMensaje(undefined); setForm(vacio(pestana)); }} />}
      />
      {mensaje ? <Notice tipo="exito">{mensaje}</Notice> : null}
      <Columnas gap={20}>
        <View style={{ flex: 2, alignSelf: 'stretch', gap: 12 }}>
          <View style={styles.chips}>
            <Chip texto="Servicios" activo={pestana === 'servicio'} onPress={() => { setPestana('servicio'); setForm(null); }} />
            <Chip texto="Productos" activo={pestana === 'producto'} onPress={() => { setPestana('producto'); setForm(null); }} />
          </View>
          {cargando && !datos ? <Cargando /> : null}
          {error ? <ErrorCarga mensaje={error} onReintentar={recargar} /> : null}
          {lista.map((el) => (
            <Card key={el.id} style={[styles.fila, !el.activo && { opacity: 0.55 }]}>
              <View style={{ flex: 1, gap: 2, minWidth: 200 }}>
                <Text style={styles.nombre}>{el.nombre}</Text>
                <Text style={styles.sub}>
                  {el.categoria} · {dinero(el.precio)}
                  {'duracionMin' in el ? ` · ${duracion(el.duracionMin)}` : ` · stock ${'stock' in el ? el.stock : ''}`}
                </Text>
                {!el.activo ? <Badge tipo="aviso" texto="Deshabilitado" /> : null}
              </View>
              <View style={styles.chips}>
                <Button compacto variante="secundario" titulo="Editar" onPress={() => { setMensaje(undefined); editar(el); }} />
                <Button compacto variante="fantasma" titulo={el.activo ? 'Deshabilitar' : 'Habilitar'} onPress={() => alternar(el.id, el.activo)} />
              </View>
            </Card>
          ))}
        </View>
        {form ? (
          <View style={{ flex: 1, alignSelf: 'stretch', minWidth: 280 }}>
            <Formulario
              key={form.id ?? 'nuevo'}
              inicial={form}
              onCancelar={() => setForm(null)}
              onGuardado={(t) => {
                setForm(null);
                setMensaje(t);
                recargar();
              }}
            />
          </View>
        ) : null}
      </Columnas>
    </Pantalla>
  );
}

function Formulario({ inicial, onCancelar, onGuardado }: { inicial: Form; onCancelar: () => void; onGuardado: (msg: string) => void }) {
  const [f, setF] = useState<Form>(inicial);
  const [err, setErr] = useState<Errores<Campo>>({});
  const [errorApi, setErrorApi] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const esServicio = f.tipo === 'servicio';
  const editando = !!f.id;
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    setErrorApi(undefined);
    const e: Errores<Campo> = {
      nombre: f.nombre.trim() ? (f.nombre.length > 100 ? 'Máximo 100 caracteres.' : undefined) : 'El nombre es obligatorio.',
      categoria: f.categoria.trim() ? undefined : 'La categoría es obligatoria.',
      precio: validarPrecio(f.precio),
      duracion: esServicio ? validarEntero(f.duracion, 'La duración', 1) : undefined,
      stock: !esServicio && !editando ? validarEntero(f.stock, 'La existencia inicial') : undefined,
      minimo: !esServicio ? validarEntero(f.minimo, 'El stock mínimo') : undefined,
    };
    setErr(e);
    if (hayErrores(e)) return;
    setCargando(true);
    try {
      const base = { id: f.id, nombre: f.nombre, descripcion: f.descripcion, categoria: f.categoria, precio: Number(f.precio) };
      await guardarElementoCatalogo(
        esServicio
          ? { tipo: 'servicio', ...base, duracionMin: Number(f.duracion) }
          : { tipo: 'producto', ...base, stock: Number(f.stock), stockMinimo: Number(f.minimo), codigoBarras: f.codigo },
      );
      onGuardado(`${esServicio ? 'Servicio' : 'Producto'} guardado correctamente.`);
    } catch (ex) {
      if (ex instanceof ApiError && ex.detalle?.campo === 'codigoBarras') setErr({ codigo: ex.message });
      else setErrorApi(ex instanceof ApiError ? ex.message : 'No se pudo guardar.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card>
      <Text style={styles.titulo}>{editando ? 'Editar' : 'Nuevo'} {esServicio ? 'servicio' : 'producto'}</Text>
      {!editando ? (
        <View style={[styles.chips, { marginBottom: 12 }]}>
          <Chip texto="Servicio" activo={esServicio} onPress={() => setF({ ...f, tipo: 'servicio' })} />
          <Chip texto="Producto" activo={!esServicio} onPress={() => setF({ ...f, tipo: 'producto' })} />
        </View>
      ) : null}
      {errorApi ? <Notice tipo="error">{errorApi}</Notice> : null}
      <Field etiqueta="Nombre" value={f.nombre} onChangeText={set('nombre')} error={err.nombre} maxLength={100} />
      <Field etiqueta="Descripción" multiline value={f.descripcion} onChangeText={set('descripcion')} />
      <Field etiqueta="Categoría" value={f.categoria} onChangeText={set('categoria')} error={err.categoria} ayuda="Texto libre; si es nueva se crea al guardar." />
      <Field etiqueta="Precio (MXN)" keyboardType="decimal-pad" value={f.precio} onChangeText={set('precio')} error={err.precio} />
      {esServicio ? (
        <Field etiqueta="Duración (minutos)" keyboardType="numeric" value={f.duracion} onChangeText={set('duracion')} error={err.duracion} />
      ) : (
        <>
          {!editando ? <Field etiqueta="Existencia inicial" keyboardType="numeric" value={f.stock} onChangeText={set('stock')} error={err.stock} /> : null}
          <Field etiqueta="Stock mínimo" keyboardType="numeric" value={f.minimo} onChangeText={set('minimo')} error={err.minimo} />
          <Field etiqueta="Código de barras (opcional)" value={f.codigo} onChangeText={set('codigo')} error={err.codigo} maxLength={50} />
        </>
      )}
      <Button bloque titulo="Guardar" cargando={cargando} onPress={guardar} />
      <View style={{ height: 8 }} />
      <Button bloque variante="secundario" titulo="Cancelar" onPress={onCancelar} />
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: 16 },
  nombre: { fontSize: 15, fontWeight: 'bold', color: colors.texto },
  sub: { fontSize: 12, color: colors.textoSecundario },
  titulo: { fontSize: 18, fontWeight: 'bold', color: colors.texto, marginBottom: 12 },
});
