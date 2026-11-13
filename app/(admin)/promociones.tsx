import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Badge, Cargando, ErrorCarga, Notice, Vacio } from '@/components/ui/Feedback';
import { Card, PageHeader } from '@/components/ui/Layout';
import { colors } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, cambiarPromocionActiva, guardarPromocion, obtenerCatalogo, obtenerPromociones } from '@/lib/api';
import { claveDia } from '@/lib/dates';
import { dinero } from '@/lib/format';
import { useDb } from '@/lib/store';
import type { Promocion } from '@/lib/types';
import { hayErrores, validarPrecio, type Errores } from '@/lib/validation';

/**
 * Promociones: la administradora agrega, edita y desactiva promociones (ej. "Promoción Papá").
 * Pueden ligarse a un servicio del catálogo y tener fecha de vigencia. Desactivar no borra.
 */
type Campo = 'titulo' | 'precio' | 'antes' | 'vigencia';
interface Form { id?: string; titulo: string; descripcion: string; precio: string; antes: string; idServicio: string; vigencia: string }
const vacio: Form = { titulo: '', descripcion: '', precio: '', antes: '', idServicio: '', vigencia: '' };
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export default function Promociones() {
  const db = useDb();
  const { datos, cargando, error, recargar } = useAsync(() => obtenerPromociones(), [db.revision]);
  const [form, setForm] = useState<Form | null>(null);
  const [mensaje, setMensaje] = useState<string>();
  const hoy = claveDia(new Date());

  const editar = (p: Promocion) =>
    setForm({ id: p.id, titulo: p.titulo, descripcion: p.descripcion, precio: String(p.precio), antes: p.precioAntes !== undefined ? String(p.precioAntes) : '', idServicio: p.idServicio ?? '', vigencia: p.vigenciaHasta ?? '' });

  return (
    <Pantalla>
      <PageHeader
        sobretitulo="Administración"
        titulo="Promociones"
        descripcion="Agrega, edita o desactiva las promociones del spa."
        acciones={<Button compacto titulo="+ Nueva promoción" onPress={() => { setMensaje(undefined); setForm(vacio); }} />}
      />
      {mensaje ? <Notice tipo="exito">{mensaje}</Notice> : null}
      {error ? <ErrorCarga mensaje={error} onReintentar={recargar} /> : null}
      {cargando && !datos ? <Cargando /> : null}
      {form ? (
        <Formulario key={form.id ?? 'nueva'} inicial={form} onCancelar={() => setForm(null)} onGuardado={(t) => { setForm(null); setMensaje(t); recargar(); }} />
      ) : null}
      {datos && !datos.length ? <Vacio titulo="Sin promociones" detalle="Agrega la primera con «Nueva promoción»." /> : null}
      <View style={{ gap: 12, marginTop: 12 }}>
        {(datos ?? []).map((p) => {
          const vencida = !!p.vigenciaHasta && p.vigenciaHasta < hoy;
          return (
            <Card key={p.id} style={[{ gap: 6 }, !p.activa && { opacity: 0.55 }]}>
              <View style={styles.fila}>
                <Text style={styles.titulo}>{p.titulo}</Text>
                {!p.activa ? <Badge tipo="aviso" texto="Desactivada" /> : vencida ? <Badge tipo="error" texto="Vencida" /> : <Badge tipo="exito" texto="Vigente" />}
              </View>
              {p.descripcion ? <Text style={styles.sub}>{p.descripcion}</Text> : null}
              <Text style={styles.precio}>
                {dinero(p.precio)}
                {p.precioAntes ? <Text style={styles.antes}>{`  ${dinero(p.precioAntes)}`}</Text> : null}
              </Text>
              {p.vigenciaHasta ? <Text style={styles.sub}>Vigente hasta {p.vigenciaHasta}</Text> : null}
              <View style={styles.fila}>
                <Button compacto variante="secundario" titulo="Editar" onPress={() => { setMensaje(undefined); editar(p); }} />
                <Button compacto variante="fantasma" titulo={p.activa ? 'Desactivar' : 'Activar'} onPress={() => cambiarPromocionActiva(p.id, !p.activa)} />
              </View>
            </Card>
          );
        })}
      </View>
    </Pantalla>
  );
}

function Formulario({ inicial, onCancelar, onGuardado }: { inicial: Form; onCancelar: () => void; onGuardado: (msg: string) => void }) {
  const db = useDb();
  const servicios = useAsync(() => obtenerCatalogo(), [db.revision]);
  const [f, setF] = useState<Form>(inicial);
  const [err, setErr] = useState<Errores<Campo>>({});
  const [errorApi, setErrorApi] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    setErrorApi(undefined);
    const e: Errores<Campo> = {
      titulo: f.titulo.trim() ? undefined : 'El título es obligatorio.',
      precio: validarPrecio(f.precio),
      antes: f.antes.trim() ? validarPrecio(f.antes) : undefined,
      vigencia: f.vigencia.trim() && !FECHA.test(f.vigencia.trim()) ? 'Formato AAAA-MM-DD.' : undefined,
    };
    setErr(e);
    if (hayErrores(e)) return;
    setCargando(true);
    try {
      await guardarPromocion({
        id: f.id, titulo: f.titulo, descripcion: f.descripcion, precio: Number(f.precio),
        precioAntes: f.antes.trim() ? Number(f.antes) : undefined, idServicio: f.idServicio || undefined, vigenciaHasta: f.vigencia.trim() || undefined,
      });
      onGuardado('Promoción guardada correctamente.');
    } catch (ex) {
      setErrorApi(ex instanceof ApiError ? ex.message : 'No se pudo guardar.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card>
      <Text style={styles.formTitulo}>{f.id ? 'Editar' : 'Nueva'} promoción</Text>
      {errorApi ? <Notice tipo="error">{errorApi}</Notice> : null}
      <Field etiqueta="Título" value={f.titulo} onChangeText={set('titulo')} error={err.titulo} maxLength={100} />
      <Field etiqueta="Descripción" multiline value={f.descripcion} onChangeText={set('descripcion')} />
      <Field etiqueta="Precio de la promoción (MXN)" keyboardType="decimal-pad" value={f.precio} onChangeText={set('precio')} error={err.precio} />
      <Field etiqueta="Precio anterior (opcional)" keyboardType="decimal-pad" value={f.antes} onChangeText={set('antes')} error={err.antes} />
      <Field etiqueta="Vigente hasta (opcional, AAAA-MM-DD)" value={f.vigencia} onChangeText={set('vigencia')} error={err.vigencia} />
      <Text style={styles.etiqueta}>Servicio relacionado (opcional)</Text>
      <View style={styles.chips}>
        <Chip texto="Ninguno" activo={!f.idServicio} onPress={() => set('idServicio')('')} />
        {(servicios.datos?.servicios ?? []).map((s) => <Chip key={s.id} texto={s.nombre} activo={f.idServicio === s.id} onPress={() => set('idServicio')(s.id)} />)}
      </View>
      <Button bloque titulo="Guardar" cargando={cargando} onPress={guardar} />
      <View style={{ height: 8 }} />
      <Button bloque variante="secundario" titulo="Cancelar" onPress={onCancelar} />
    </Card>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  titulo: { fontSize: 16, fontWeight: 'bold', color: colors.texto, flex: 1 },
  sub: { fontSize: 13, color: colors.textoSecundario },
  precio: { fontSize: 22, fontWeight: 'bold', color: colors.primario },
  antes: { fontSize: 14, color: colors.textoTenue, textDecorationLine: 'line-through', fontWeight: '400' },
  formTitulo: { fontSize: 18, fontWeight: 'bold', color: colors.texto, marginBottom: 12 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colors.textoEtiqueta, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
});
