import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Pantalla } from '@/components/Pantalla';
import { RutaProtegida } from '@/components/RutaProtegida';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Cargando, Notice } from '@/components/ui/Feedback';
import { Card } from '@/components/ui/Layout';
import { colors } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, agendarCitaAdmin, obtenerCatalogo, obtenerHorariosDisponibles } from '@/lib/api';
import { claveDia, desdeClaveYHora, formatoFechaCorta, formatoFechaLarga, proximosDias } from '@/lib/dates';
import { dinero, duracion } from '@/lib/format';
import { useDb } from '@/lib/store';

/**
 * Agendar cita (la hace la administradora para una clienta). Pasos: 1) clienta (cuenta por correo
 * o solo nombre) · 2) servicios · 3) fecha · 4) hora libre · 5) confirmar. La hora no se teclea:
 * se elige entre los horarios libres (una sola cabina). Si el horario se ocupa, la API devuelve
 * los 3 siguientes libres y se ofrecen como botones.
 */
const DIAS_VISIBLES = 21;

export default function AgendarCita() {
  return (
    <RutaProtegida rol="admin">
      <Formulario />
    </RutaProtegida>
  );
}

function Formulario() {
  const router = useRouter();
  const db = useDb();
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [fecha, setFecha] = useState(claveDia(new Date()));
  const [horaElegida, setHora] = useState<string | null>(null);
  const [alternativos, setAlternativos] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const catalogo = useAsync(() => obtenerCatalogo(), [db.revision]);
  const servicios = catalogo.datos?.servicios ?? [];
  const elegidos = servicios.filter((s) => ids.includes(s.id));
  const totalMin = elegidos.reduce((a, s) => a + s.duracionMin, 0);
  const totalPrecio = elegidos.reduce((a, s) => a + s.precio, 0);

  const horarios = useAsync(() => (ids.length ? obtenerHorariosDisponibles(fecha, ids) : Promise.resolve([] as string[])), [fecha, ids.join(','), db.revision]);
  const hora = horaElegida && horarios.datos?.includes(horaElegida) ? horaElegida : null;

  const limpiar = () => { setHora(null); setAlternativos([]); setError(undefined); };
  const alternar = (id: string) => { limpiar(); setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };

  const elegirAlternativo = (alt: string) => {
    const [a, b] = alt.includes(' ') ? alt.split(' ') : [fecha, alt];
    setFecha(a); setHora(b); setAlternativos([]); setError(undefined);
  };

  const confirmar = async () => {
    if (!hora || !ids.length) return;
    setEnviando(true);
    setError(undefined);
    try {
      await agendarCitaAdmin({ dia: fecha, hora, servicios: ids, correoCliente: correo, nombre, telefono });
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setAlternativos((e.detalle?.alternativos as string[]) ?? []);
        setHora(null);
        horarios.recargar();
      }
      setError(e instanceof ApiError ? e.message : 'No se pudo agendar la cita.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <View style={{ gap: 16 }}>
        <Card style={{ gap: 4 }}>
          <Text style={styles.paso}>1 · Clienta</Text>
          <Field etiqueta="Correo de su cuenta (opcional)" autoCapitalize="none" keyboardType="email-address" value={correo} onChangeText={setCorreo} placeholder="Buscar por correo" />
          {!correo.trim() ? (
            <>
              <Field etiqueta="o solo el nombre" value={nombre} onChangeText={setNombre} placeholder="Nombre de la clienta" />
              <Field etiqueta="Teléfono (opcional)" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
            </>
          ) : null}
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.paso}>2 · Servicio(s)</Text>
          {catalogo.cargando && !catalogo.datos ? <Cargando /> : null}
          <View style={styles.wrap}>
            {servicios.map((s) => (
              <Chip key={s.id} texto={`${s.nombre} · ${dinero(s.precio)}`} activo={ids.includes(s.id)} onPress={() => alternar(s.id)} />
            ))}
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.paso}>3 · Fecha</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {proximosDias(DIAS_VISIBLES).map((d) => (
              <Chip key={claveDia(d)} texto={formatoFechaCorta(d)} activo={fecha === claveDia(d)} onPress={() => { setFecha(claveDia(d)); limpiar(); }} />
            ))}
          </ScrollView>
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.paso}>4 · Hora</Text>
          {!ids.length ? <Text style={styles.ayuda}>Primero elige al menos un servicio.</Text> : null}
          {ids.length && horarios.cargando && !horarios.datos ? <Cargando filas={1} /> : null}
          {ids.length && horarios.datos && !horarios.datos.length ? <Notice tipo="aviso">No hay horarios libres para esa fecha. Prueba con otro día.</Notice> : null}
          <View style={styles.wrap}>
            {(ids.length ? horarios.datos ?? [] : []).map((h) => (
              <Chip key={h} texto={h} activo={hora === h} onPress={() => { setHora(h); setError(undefined); setAlternativos([]); }} />
            ))}
          </View>
          {error ? <Notice tipo="error">{error}</Notice> : null}
          {alternativos.length ? (
            <View style={{ gap: 8 }}>
              <Notice tipo="aviso">Ese horario ya fue ocupado. Estos están libres:</Notice>
              <View style={styles.wrap}>
                {alternativos.map((a) => (
                  <Chip key={a} texto={a.includes(' ') ? `${formatoFechaCorta(desdeClaveYHora(a.split(' ')[0], '00:00'))} ${a.split(' ')[1]}` : a} onPress={() => elegirAlternativo(a)} />
                ))}
              </View>
            </View>
          ) : null}
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.paso}>5 · Confirmar</Text>
          {elegidos.length ? (
            <>
              {elegidos.map((s) => <Text key={s.id} style={styles.linea}>• {s.nombre}</Text>)}
              <Text style={styles.linea}>Fecha: {formatoFechaLarga(desdeClaveYHora(fecha, '00:00'))}</Text>
              <Text style={styles.linea}>Hora: {hora ?? '—'}</Text>
              <Text style={styles.linea}>Duración total: {duracion(totalMin)}</Text>
              <Text style={styles.total}>{dinero(totalPrecio)}</Text>
              <Text style={styles.ayuda}>El pago se realiza en el establecimiento.</Text>
            </>
          ) : <Text style={styles.ayuda}>Aquí verás el resumen de la cita.</Text>}
          <Button bloque titulo="Confirmar cita" deshabilitado={!hora || !ids.length} cargando={enviando} onPress={confirmar} />
        </Card>
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  paso: { fontSize: 15, fontWeight: 'bold', color: colors.texto },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ayuda: { fontSize: 12, color: colors.textoSecundario },
  linea: { fontSize: 14, color: colors.textoEtiqueta },
  total: { fontSize: 26, fontWeight: 'bold', color: colors.primario, marginVertical: 6 },
});
