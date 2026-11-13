import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Badge, Cargando, Notice, Vacio, ErrorCarga } from '@/components/ui/Feedback';
import { Card, Columnas, PageHeader } from '@/components/ui/Layout';
import { colors } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks/useSession';
import {
  ApiError,
  actualizarConfiguracion,
  cerrarCita,
  obtenerAgenda,
  obtenerExpediente,
  type CitaAgenda,
} from '@/lib/api';
import { claveDia, formatoFechaLarga, hhmm, sumarDias } from '@/lib/dates';
import { dinero } from '@/lib/format';
import { useDb } from '@/lib/store';
import type { EstadoCita } from '@/lib/types';

/**
 * INT-06 · Agenda de la administradora y expediente médico (CU-04; SAL-04, SAL-05;
 * ENT-09 cierre de cita). Historia de usuario 5: "visualizar la agenda de citas
 * organizadas del día".
 *  - Navegación por día (anterior / hoy / siguiente).
 *  - "Finalizar" y "No se presentó" solo existen sobre citas Confirmadas y piden
 *    confirmación breve (doble clic intencional). "No se presentó" solo procede
 *    cuando ya pasó la hora de inicio (lo valida la API; la UI muestra su mensaje).
 *  - El expediente médico se pide a la API solo bajo demanda y solo la admin puede
 *    verlo (RF-M01-03, RNB-05): no se carga con la lista de la agenda.
 */
const TIPO: Record<EstadoCita, 'exito' | 'info' | 'error' | 'aviso'> = {
  Confirmada: 'exito',
  Finalizada: 'info',
  NoShow: 'aviso',
  Cancelada: 'error',
};

export default function Agenda() {
  const router = useRouter();
  const db = useDb();
  const [dia, setDia] = useState(new Date());
  const clave = claveDia(dia);
  const { datos, cargando, error, recargar } = useAsync(() => obtenerAgenda(clave), [clave, db.revision]);

  const activas = (datos ?? []).filter((c) => c.estado === 'Confirmada').length;

  return (
    <Pantalla>
      <PageHeader
        sobretitulo="Administración"
        titulo="Agenda del día"
        descripcion={formatoFechaLarga(dia)}
        acciones={
          <>
            <Button compacto titulo="+ Agendar cita" onPress={() => router.push('/agendar-cita')} />
            <Button compacto variante="secundario" titulo="← Anterior" onPress={() => setDia(sumarDias(dia, -1))} />
            <Button compacto variante="secundario" titulo="Hoy" onPress={() => setDia(new Date())} />
            <Button compacto variante="secundario" titulo="Siguiente →" onPress={() => setDia(sumarDias(dia, 1))} />
          </>
        }
      />
      <Columnas gap={20}>
        <View style={{ flex: 2, alignSelf: 'stretch', gap: 12 }}>
          <Text style={styles.resumen}>
            {datos ? `${datos.length} cita(s) · ${activas} por atender` : ' '}
          </Text>
          {error ? <ErrorCarga mensaje={error} onReintentar={recargar} /> : null}
          {cargando && !datos ? <Cargando /> : null}
          {datos && !datos.length ? <Vacio titulo="Sin citas" detalle="No hay citas registradas para este día." /> : null}
          {(datos ?? []).map((c) => (
            <FilaCita key={c.id} cita={c} />
          ))}
        </View>
        <View style={{ flex: 1, alignSelf: 'stretch' }}>
          <Parametros />
        </View>
      </Columnas>
    </Pantalla>
  );
}

function FilaCita({ cita }: { cita: CitaAgenda }) {
  const [confirmando, setConfirmando] = useState<'Finalizada' | 'NoShow' | 'Cancelada' | null>(null);
  const [error, setError] = useState<string>();
  const [verExp, setVerExp] = useState(false);
  const [cargando, setCargando] = useState(false);
  const total = cita.servicios.reduce((a, s) => a + s.costo, 0);

  const cerrar = async () => {
    if (!confirmando) return;
    setCargando(true);
    setError(undefined);
    try {
      await cerrarCita(cita.id, confirmando);
      setConfirmando(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cerrar la cita.');
      setConfirmando(null);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.fila}>
        <Text style={styles.hora}>
          {hhmm(new Date(cita.inicio))} – {hhmm(new Date(cita.fin))}
        </Text>
        <Badge tipo={TIPO[cita.estado]} texto={cita.estado === 'NoShow' ? 'No se presentó' : cita.estado} />
      </View>
      <Text style={styles.cliente}>
        {cita.cliente.nombre} {cita.cliente.apellido}
        {cita.cliente.telefono ? ` · ${cita.cliente.telefono}` : ''}
      </Text>
      <Text style={styles.sub}>{cita.servicios.map((s) => s.nombre).join(' + ')} · {dinero(total)}</Text>
      {cita.motivoCancelacion ? <Text style={styles.sub}>Motivo de cancelación: {cita.motivoCancelacion}</Text> : null}
      {error ? <Notice tipo="error">{error}</Notice> : null}

      <View style={styles.acciones}>
        {cita.estado === 'Confirmada' && !confirmando ? (
          <>
            <Button compacto titulo="Finalizar" onPress={() => setConfirmando('Finalizada')} />
            <Button compacto variante="secundario" titulo="No se presentó" onPress={() => setConfirmando('NoShow')} />
            <Button compacto variante="fantasma" titulo="Cancelar cita" onPress={() => setConfirmando('Cancelada')} />
          </>
        ) : null}
        {confirmando ? (
          <>
            <Text style={styles.sub}>¿Marcar como {confirmando === 'Finalizada' ? 'finalizada' : confirmando === 'NoShow' ? 'no se presentó' : 'cancelada'}?</Text>
            <Button compacto titulo="Sí, confirmar" cargando={cargando} onPress={cerrar} />
            <Button compacto variante="secundario" titulo="No" onPress={() => setConfirmando(null)} />
          </>
        ) : null}
        {cita.idUsuario ? <Button compacto variante="fantasma" titulo={verExp ? 'Ocultar expediente' : 'Ver expediente médico'} onPress={() => setVerExp(!verExp)} /> : null}
      </View>
      {verExp && cita.idUsuario ? <Expediente idUsuario={cita.idUsuario} /> : null}
    </Card>
  );
}

/** SAL-05 · Expediente médico del cliente. Solo se solicita al abrirlo. */
function Expediente({ idUsuario }: { idUsuario: string }) {
  const { datos, error, cargando } = useAsync(() => obtenerExpediente(idUsuario), [idUsuario]);
  if (cargando) return <Cargando />;
  if (error) return <Notice tipo="error">{error}</Notice>;
  const h = datos?.historial;
  if (!h) return <Notice tipo="aviso">Este cliente aún no llena su cuestionario.</Notice>;
  return (
    <View style={styles.expediente}>
      <Text style={styles.expTitulo}>Expediente · {datos.cliente.nombre} {datos.cliente.apellido}</Text>
      <Text style={styles.sub}>Alergias: {h.alergias}</Text>
      <Text style={styles.sub}>Lesiones o dolores: {h.lesionesODolores}</Text>
      <Text style={styles.sub}>Padecimientos crónicos: {h.padecimientosCronicos}</Text>
      {h.observacionesAdicionales ? <Text style={styles.sub}>Observaciones: {h.observacionesAdicionales}</Text> : null}
      <Text style={[styles.sub, { opacity: 0.7 }]}>Llenado: {new Date(h.fechaLlenado).toLocaleDateString('es-MX')}</Text>
    </View>
  );
}

/**
 * Parámetros configurables por la administradora (documento de diseño 2.3):
 * margen mínimo de cancelación (RNB-08) y horario de atención (rango de horarios).
 * El umbral de stock mínimo se configura por producto en "Catálogo".
 */
function Parametros() {
  const { configuracion: c } = useSession();
  const [margen, setMargen] = useState(String(c.margenCancelacionHoras));
  const [apertura, setApertura] = useState(String(c.horaApertura));
  const [cierre, setCierre] = useState(String(c.horaCierre));
  const [msg, setMsg] = useState<{ tipo: 'exito' | 'error'; texto: string }>();

  const guardar = async () => {
    const m = Number(margen), a = Number(apertura), z = Number(cierre);
    if (![m, a, z].every(Number.isInteger) || m < 0 || a < 0 || z > 24 || a >= z) {
      return setMsg({ tipo: 'error', texto: 'Revisa los valores: enteros, y la apertura debe ser menor al cierre (0–24).' });
    }
    try {
      await actualizarConfiguracion({ margenCancelacionHoras: m, horaApertura: a, horaCierre: z });
      setMsg({ tipo: 'exito', texto: 'Parámetros guardados.' });
    } catch (e) {
      setMsg({ tipo: 'error', texto: e instanceof ApiError ? e.message : 'No se pudo guardar.' });
    }
  };

  return (
    <Card>
      <Text style={styles.expTitulo}>Parámetros de agenda</Text>
      <Field etiqueta="Anticipación mínima para cancelar (horas)" keyboardType="numeric" value={margen} onChangeText={setMargen} />
      <Field etiqueta="Hora de apertura (0–23)" keyboardType="numeric" value={apertura} onChangeText={setApertura} />
      <Field etiqueta="Hora de cierre (1–24)" keyboardType="numeric" value={cierre} onChangeText={setCierre} />
      {msg ? <Notice tipo={msg.tipo}>{msg.texto}</Notice> : null}
      <Button bloque compacto titulo="Guardar parámetros" onPress={guardar} />
    </Card>
  );
}

const styles = StyleSheet.create({
  resumen: { color: colors.textoSecundario, fontSize: 13 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hora: { fontSize: 18, fontWeight: 'bold', color: colors.primario },
  cliente: { fontSize: 15, fontWeight: '600', color: colors.texto },
  sub: { fontSize: 13, color: colors.textoSecundario },
  acciones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 },
  expediente: { backgroundColor: colors.primarioSuave, borderRadius: 12, padding: 12, gap: 4 },
  expTitulo: { fontSize: 14, fontWeight: 'bold', color: colors.texto, marginBottom: 8 },
});
