/**
 * "API" MOCK: implementa en el navegador la lógica que, según el documento de
 * diseño, vivirá en el servidor Node.js/MySQL (sección 9, Diseño Procedimental).
 *
 * ── POR QUÉ UNA CAPA ASÍ ─────────────────────────────────────────────────────
 * 1. Las pantallas NUNCA tocan el store directamente: solo llaman funciones de
 *    este archivo. Cuando exista el backend, cada función se reemplaza por un
 *    `fetch` al endpoint equivalente y las pantallas no cambian.
 * 2. Todas devuelven Promesas (con una pequeña latencia simulada) igual que lo
 *    haría `fetch`, para que el manejo de "cargando"/errores ya esté bien hecho.
 * 3. Las reglas de negocio (RNB-xx) se validan AQUÍ, no en la pantalla, porque el
 *    diseño dice que "la validación definitiva siempre la hace la API".
 * 4. TRANSACCIONALIDAD (ALG-06, ALG-10): cada operación trabaja sobre una copia
 *    (`structuredClone`) y solo hace `setEstado` al final. Si algo lanza un error
 *    antes, no se guarda nada → equivale al ROLLBACK de una transacción SQL.
 *
 * Los códigos HTTP del diseño se conservan en `ApiError.status`
 * (400 validación, 401 sin sesión, 403 sin permiso, 409 conflicto).
 */
import {
  claveDia,
  desdeClaveYHora,
  hhmm,
  inicioDelDia,
  mismoDia,
  sumarDias,
  sumarMinutos,
} from './dates';
import { ApiError } from './errors';
import { modoRemoto } from './config';
import { http } from './http';
import { HASH_SENUELO, hashPassword, verificarPassword } from './hash';
import { getEstado, invalidar, setEstado } from './store';
import type {
  Cita,
  Configuracion,
  DbState,
  HistorialMedico,
  LineaVenta,
  MetodoPago,
  MovimientoInventario,
  Producto,
  Promocion,
  Rol,
  Servicio,
  Usuario,
  UsuarioPublico,
  Venta,
} from './types';

// ─────────────────────────── Infraestructura ───────────────────────────

export { ApiError };

/** Latencia simulada del mock. `EXPO_PUBLIC_LATENCIA_MS=3000` sirve para probar cómo se ve una conexión lenta. */
const LATENCIA_MS = Number(process.env.EXPO_PUBLIC_LATENCIA_MS ?? 150);
const SESION_HORAS = 24;

/** Tras una mutación en el servidor, avisa a las pantallas para que vuelvan a pedir sus datos. */
const mutar = <T,>(p: Promise<T>) => p.then((r) => { invalidar(); return r; });

/** Simula la ida y vuelta de red y aísla cada operación en un try/catch uniforme. */
async function llamar<T>(fn: () => T | Promise<T>): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCIA_MS));
  return await fn();
}

const nuevoId = (prefijo: string) =>
  `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// JSON en vez de structuredClone: Hermes no lo garantiza y todo el estado es serializable (fechas en ISO).
const copiar = (): DbState => JSON.parse(JSON.stringify(getEstado())) as DbState;

function aPublico(u: Usuario): UsuarioPublico {
  const { passwordHash: _p, historialMedico, ...resto } = u;
  return { ...resto, tieneCuestionario: Boolean(historialMedico) };
}

// ─────────────── ALG-02: verificación de sesión y control por rol ───────────────

/** Devuelve el usuario de la sesión vigente, o lanza 401 / 403 (RBAC, RNB-05). */
function exigirSesion(s: DbState, rol?: Rol): Usuario {
  if (!s.sesion || new Date(s.sesion.expira) < new Date()) {
    throw new ApiError(401, 'Tu sesión caducó. Inicia sesión de nuevo.');
  }
  const u = s.usuarios.find((x) => x.id === s.sesion!.idUsuario && x.activo);
  if (!u) throw new ApiError(401, 'Tu sesión no es válida. Inicia sesión de nuevo.');
  if (rol && u.rol !== rol) throw new ApiError(403, 'No tienes permiso para esta acción.');
  return u;
}

/** Usuario de la sesión (sincrónico, para que la UI decida qué mostrar). */
export function usuarioActual(s: DbState): UsuarioPublico | null {
  if (!s.sesion || new Date(s.sesion.expira) < new Date()) return null;
  const u = s.usuarios.find((x) => x.id === s.sesion!.idUsuario && x.activo);
  return u ? aPublico(u) : null;
}


/** Modo servidor: guarda el usuario devuelto por la API en el store para que la UI sepa quién es. */
async function sesionRemota(u: UsuarioPublico) {
  const config = await http<Configuracion>('/configuracion').catch(() => getEstado().configuracion);
  const s = copiar();
  s.configuracion = config;
  s.usuarios = [{ ...u, passwordHash: '', historialMedico: u.tieneCuestionario ? { alergias: '', lesionesODolores: '', padecimientosCronicos: '', fechaLlenado: '' } : undefined }];
  s.sesion = { idUsuario: u.id, expira: new Date(Date.now() + SESION_HORAS * 3_600_000).toISOString() };
  setEstado(s);
  return u;
}

// ─────────────────────────── ALG-01 / ALG-03: usuarios ───────────────────────────

/**
 * ALG-01 · Inicio de sesión. Usuario inexistente, inactivo, contraseña incorrecta
 * o rol equivocado devuelven EL MISMO mensaje, para no revelar qué cuentas existen
 * (documento de diseño, INT-01 "Estados y mensajes").
 */
/** Intentos fallidos por correo (en memoria): tras 5 fallos en 15 min, bloqueo temporal (rate limit). */
const FALLOS = new Map<string, { n: number; desde: number }>();
const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60_000;

export function iniciarSesion(correo: string, password: string, rol: Rol) {
  if (modoRemoto) return http<{ usuario: UsuarioPublico }>('/auth/login', { metodo: 'POST', cuerpo: { correo, password, rol } }).then((r) => sesionRemota(r.usuario));
  return llamar(async () => {
    const clave = correo.trim().toLowerCase();
    const f = FALLOS.get(clave);
    if (f && Date.now() - f.desde < VENTANA_MS && f.n >= MAX_FALLOS) {
      const min = Math.ceil((VENTANA_MS - (Date.now() - f.desde)) / 60_000);
      throw new ApiError(429, `Demasiados intentos. Intenta de nuevo en ${min} min.`);
    }
    const u = getEstado().usuarios.find((x) => x.correo.toLowerCase() === clave);
    // Se verifica SIEMPRE un hash (aunque el usuario no exista) para igualar tiempos de respuesta.
    const hashOk = await verificarPassword(password, u?.passwordHash ?? HASH_SENUELO);
    if (!u || !u.activo || !hashOk || u.rol !== rol) {
      const previo = f && Date.now() - f.desde < VENTANA_MS ? f : { n: 0, desde: Date.now() };
      FALLOS.set(clave, { n: previo.n + 1, desde: previo.desde });
      throw new ApiError(401, 'Correo, contraseña o tipo de cuenta incorrectos.');
    }
    FALLOS.delete(clave);
    const s = copiar();
    s.sesion = { idUsuario: u.id, expira: new Date(Date.now() + SESION_HORAS * 3_600_000).toISOString() };
    setEstado(s);
    return aPublico(u);
  });
}

export function cerrarSesion() {
  if (modoRemoto) void http('/auth/logout', { metodo: 'POST' }).catch(() => undefined);
  const s = copiar();
  s.sesion = null;
  setEstado(s);
}

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  password: string;
  historial: Omit<HistorialMedico, 'fechaLlenado'>;
}

/**
 * ALG-03 · Registro de cuenta + expediente en UNA sola operación (CU-01).
 * Correo repetido → 409. El historial se "cifraría" con AES-256 en el servidor
 * real (RNF-03); aquí solo se guarda en el mock y NUNCA se devuelve por la API
 * pública salvo a la administradora (ver `obtenerExpediente`).
 */
export function registrarCuenta(datos: DatosRegistro) {
  if (modoRemoto) return http<{ usuario: UsuarioPublico }>('/auth/register', { metodo: 'POST', cuerpo: datos }).then((r) => sesionRemota(r.usuario));
  return llamar(async () => {
    const passwordHash = await hashPassword(datos.password);
    const s = copiar();
    const correo = datos.correo.trim().toLowerCase();
    if (s.usuarios.some((u) => u.correo.toLowerCase() === correo)) {
      throw new ApiError(409, 'Este correo ya tiene una cuenta.', { campo: 'correo' });
    }
    const nuevo: Usuario = {
      id: nuevoId('usr'),
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      correo,
      telefono: datos.telefono?.trim() || undefined,
      passwordHash,
      rol: 'cliente', // el rol nunca viene del formulario: evita auto-asignarse admin
      activo: true,
      historialMedico: { ...datos.historial, fechaLlenado: new Date().toISOString() },
    };
    s.usuarios.push(nuevo);
    setEstado(s);
    return aPublico(nuevo);
  });
}

/** SAL-05 · Expediente médico: SOLO la administradora titular (RF-M01-03, RNB-05). */
export function obtenerExpediente(idUsuario: string) {
  if (modoRemoto) return http<{ cliente: UsuarioPublico; historial: HistorialMedico | null }>(`/citas/expediente/${encodeURIComponent(idUsuario)}`);
  return llamar(() => {
    const s = getEstado();
    exigirSesion(s, 'admin');
    const u = s.usuarios.find((x) => x.id === idUsuario);
    if (!u) throw new ApiError(404, 'Cliente no encontrado.');
    return { cliente: aPublico(u), historial: u.historialMedico ?? null };
  });
}

// ─────────────────────────── Catálogo (M02) ───────────────────────────

export interface CatalogoPublico {
  servicios: Servicio[];
  productos: (Producto & { agotado: boolean })[];
}

/**
 * SAL-01 · Catálogo interactivo (RF-M02-01, RF-M02-03). Las bajas lógicas no se
 * muestran; un producto con stock 0 se MARCA como agotado (no se oculta).
 * Esta función es pública: el catálogo se puede ver sin iniciar sesión.
 */
export function obtenerCatalogo(incluirInactivos = false) {
  if (modoRemoto) return http<CatalogoPublico>(incluirInactivos ? '/catalogo?todos=1' : '/catalogo');
  return llamar<CatalogoPublico>(() => {
    const s = getEstado();
    return {
      servicios: s.servicios.filter((x) => incluirInactivos || x.activo),
      productos: s.productos
        .filter((x) => incluirInactivos || x.activo)
        .map((p) => ({ ...p, agotado: p.stock <= 0 })),
    };
  });
}

export interface DatosServicio {
  tipo: 'servicio';
  id?: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  duracionMin: number;
}
export interface DatosProducto {
  tipo: 'producto';
  id?: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  stock: number; // solo se usa al crear (existencia inicial)
  stockMinimo: number;
  codigoBarras?: string;
}

/** ALG-04 · Alta y edición de servicio o producto (solo administradora, CU-09). */
export function guardarElementoCatalogo(datos: DatosServicio | DatosProducto) {
  if (modoRemoto) return mutar(http<void>(datos.tipo === 'servicio' ? '/catalogo/servicios' : '/catalogo/productos', { metodo: 'POST', cuerpo: datos }));
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    if (!datos.nombre.trim()) throw new ApiError(400, 'El nombre es obligatorio.', { campo: 'nombre' });
    if (!datos.categoria.trim()) throw new ApiError(400, 'La categoría es obligatoria.', { campo: 'categoria' });
    if (!(datos.precio >= 0)) throw new ApiError(400, 'El precio no puede ser negativo.', { campo: 'precio' });

    if (datos.tipo === 'servicio') {
      if (!Number.isInteger(datos.duracionMin) || datos.duracionMin <= 0) {
        throw new ApiError(400, 'La duración debe ser mayor a 0 minutos.', { campo: 'duracionMin' });
      }
      const existente = datos.id ? s.servicios.find((x) => x.id === datos.id) : undefined;
      if (existente) {
        Object.assign(existente, {
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion.trim(),
          categoria: datos.categoria.trim(),
          precio: datos.precio,
          duracionMin: datos.duracionMin,
        });
      } else {
        s.servicios.push({
          id: nuevoId('srv'),
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion.trim(),
          categoria: datos.categoria.trim(),
          precio: datos.precio,
          duracionMin: datos.duracionMin,
          activo: true,
        });
      }
    } else {
      if (datos.stock < 0 || datos.stockMinimo < 0) {
        throw new ApiError(400, 'Existencias y mínimo deben ser mayores o iguales a 0.', { campo: 'stock' });
      }
      const codigo = datos.codigoBarras?.trim() || undefined;
      if (codigo && s.productos.some((p) => p.codigoBarras === codigo && p.id !== datos.id)) {
        throw new ApiError(400, 'Ese código de barras ya existe en otro producto.', { campo: 'codigoBarras' });
      }
      const existente = datos.id ? s.productos.find((x) => x.id === datos.id) : undefined;
      if (existente) {
        // En edición NO se toca el stock: el stock solo cambia con movimientos (ALG-11).
        Object.assign(existente, {
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion.trim(),
          categoria: datos.categoria.trim(),
          precio: datos.precio,
          stockMinimo: datos.stockMinimo,
          codigoBarras: codigo,
        });
      } else {
        const nuevo: Producto = {
          id: nuevoId('prd'),
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion.trim(),
          categoria: datos.categoria.trim(),
          precio: datos.precio,
          stock: datos.stock,
          stockMinimo: datos.stockMinimo,
          codigoBarras: codigo,
          activo: true,
        };
        s.productos.push(nuevo);
        s.movimientos.push(movimiento(nuevo.id, 'entrada', datos.stock, 'Existencia inicial'));
      }
    }
    setEstado(s);
  });
}

/** Baja lógica / reactivación (RF-M02-02): nunca se borra un elemento con historial. */
export function cambiarActivo(tipo: 'servicio' | 'producto', id: string, activo: boolean) {
  if (modoRemoto) return mutar(http<void>(`/catalogo/${tipo}/${encodeURIComponent(id)}/activo`, { metodo: 'PATCH', cuerpo: { activo } }));
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    const lista: { id: string; activo: boolean }[] = tipo === 'servicio' ? s.servicios : s.productos;
    const el = lista.find((x) => x.id === id);
    if (!el) throw new ApiError(404, 'Elemento no encontrado.');
    el.activo = activo;
    setEstado(s);
  });
}

// ─────────────────────────── Agenda (M03) ───────────────────────────

const citasOcupan = (s: DbState) => s.citas.filter((c) => c.estado === 'Confirmada');

/** ¿El intervalo [ini, fin) se traslapa con alguna cita confirmada? (una sola cabina). */
function hayTraslape(s: DbState, ini: Date, fin: Date, ignorarId?: string): boolean {
  return citasOcupan(s).some(
    (c) => c.id !== ignorarId && new Date(c.inicio) < fin && new Date(c.fin) > ini,
  );
}

/** Horarios (HH:MM) libres de un día para una duración dada. Lógica pura de ALG-05. */
function horariosLibresDia(s: DbState, dia: Date, duracionMin: number, ahora: Date): string[] {
  const { horaApertura, horaCierre, pasoMin } = s.configuracion;
  const clave = claveDia(dia);
  const cierre = desdeClaveYHora(clave, `${String(horaCierre).padStart(2, '0')}:00`);
  const libres: string[] = [];
  for (
    let t = desdeClaveYHora(clave, `${String(horaApertura).padStart(2, '0')}:00`);
    sumarMinutos(t, duracionMin) <= cierre;
    t = sumarMinutos(t, pasoMin)
  ) {
    if (t <= ahora) continue; // no se agenda en el pasado
    if (!hayTraslape(s, t, sumarMinutos(t, duracionMin))) libres.push(hhmm(t));
  }
  return libres;
}

/** ALG-07 · Los 3 próximos horarios libres a partir de un instante (RF-M03-03). */
function siguientesLibres(s: DbState, desde: Date, duracionMin: number, cuantos = 3): string[] {
  const ahora = new Date();
  const res: string[] = [];
  for (let d = 0; d <= s.configuracion.diasVentana && res.length < cuantos; d++) {
    const dia = sumarDias(inicioDelDia(desde), d);
    for (const h of horariosLibresDia(s, dia, duracionMin, ahora)) {
      const inicio = desdeClaveYHora(claveDia(dia), h);
      if (inicio <= desde) continue;
      res.push(d === 0 ? h : `${claveDia(dia)} ${h}`);
      if (res.length === cuantos) break;
    }
  }
  return res;
}

function duracionDe(s: DbState, idsServicio: string[]) {
  const elegidos = idsServicio.map((id) => s.servicios.find((x) => x.id === id && x.activo));
  if (!idsServicio.length || elegidos.some((x) => !x)) {
    throw new ApiError(400, 'Elige al menos un servicio activo.', { campo: 'servicios' });
  }
  const lista = elegidos as Servicio[];
  return { lista, total: lista.reduce((a, x) => a + x.duracionMin, 0) };
}

/** ALG-05 · Horarios disponibles para una fecha y servicios (SAL-02, RNF-01: <2 s). */
export function obtenerHorariosDisponibles(claveDiaStr: string, idsServicio: string[]) {
  if (modoRemoto) return http<{ horarios: string[] }>(`/citas/horarios?dia=${encodeURIComponent(claveDiaStr)}&servicios=${encodeURIComponent(idsServicio.join(','))}`).then((r) => r.horarios);
  return llamar(() => {
    const s = getEstado();
    exigirSesion(s);
    const { total } = duracionDe(s, idsServicio);
    const dia = desdeClaveYHora(claveDiaStr, '00:00');
    return horariosLibresDia(s, dia, total, new Date());
  });
}

/**
 * ALG-06 · Reserva con bloqueo de horario (CU-02/CU-04).
 * Reglas: sesión (401) · cuestionario completo (RNB-01 → 403) · horario aún libre
 * (RNB-02 → 409 con los 3 siguientes horarios libres, ALG-07).
 */
export function agendarCita(claveDiaStr: string, hora: string, idsServicio: string[]) {
  if (modoRemoto) return http<{ cita: Cita }>('/citas', { metodo: 'POST', cuerpo: { dia: claveDiaStr, hora, servicios: idsServicio } }).then((r) => r.cita);
  return llamar(() => {
    const s = copiar();
    const usuario = exigirSesion(s, 'cliente');
    if (!usuario.historialMedico) {
      throw new ApiError(403, 'Completa tu cuestionario de salud antes de agendar.', {
        campo: 'cuestionario',
      });
    }
    const { lista, total } = duracionDe(s, idsServicio);
    const inicio = desdeClaveYHora(claveDiaStr, hora);
    const fin = sumarMinutos(inicio, total);
    if (inicio <= new Date()) throw new ApiError(400, 'Elige una fecha y hora futuras.', { campo: 'hora' });

    if (hayTraslape(s, inicio, fin)) {
      throw new ApiError(409, 'Ese horario ya está ocupado.', {
        alternativos: siguientesLibres(s, inicio, total),
      });
    }
    const cita: Cita = {
      id: nuevoId('cit'),
      idUsuario: usuario.id,
      servicios: lista.map((x) => ({
        idServicio: x.id,
        nombre: x.nombre,
        duracionMin: x.duracionMin,
        costo: x.precio,
      })),
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      estado: 'Confirmada',
      creadaEn: new Date().toISOString(),
    };
    s.citas.push(cita);
    setEstado(s);
    return cita;
  });
}

/** SAL-03 · Mis citas (solo las del usuario en sesión), de la más próxima a la más lejana. */
export function obtenerMisCitas() {
  if (modoRemoto) return http<{ citas: Cita[] }>('/citas/mias').then((r) => r.citas);
  return llamar(() => {
    const s = getEstado();
    const u = exigirSesion(s, 'cliente');
    return s.citas
      .filter((c) => c.idUsuario === u.id)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  });
}

/** ¿Aún se puede cancelar? Lo usan la UI (bloquea el botón) y la API (RNB-08). */
export function puedeCancelar(cita: Cita, config: Configuracion, ahora = new Date()): boolean {
  return (
    cita.estado === 'Confirmada' &&
    new Date(cita.inicio).getTime() - ahora.getTime() >= config.margenCancelacionHoras * 3_600_000
  );
}

/**
 * ALG-08 · Cancelación por la clienta (CU-08). Motivo obligatorio (alimenta el
 * reporte RF-M05-01); la cita NO se borra, cambia de estado (RNB-06). El servidor
 * vuelve a comprobar el margen aunque la UI ya lo haya bloqueado (RNB-08).
 */
export function cancelarCita(idCita: string, motivo: string) {
  if (modoRemoto) return http<void>(`/citas/${encodeURIComponent(idCita)}/cancelar`, { metodo: 'POST', cuerpo: { motivo } });
  return llamar(() => {
    const s = copiar();
    const u = exigirSesion(s, 'cliente');
    const cita = s.citas.find((c) => c.id === idCita && c.idUsuario === u.id);
    if (!cita) throw new ApiError(404, 'Cita no encontrada.');
    if (cita.estado !== 'Confirmada') throw new ApiError(409, 'Solo se puede cancelar una cita confirmada.');
    const m = motivo.trim();
    if (!m || m.length > 255) {
      throw new ApiError(400, 'Escribe el motivo (máximo 255 caracteres).', { campo: 'motivo' });
    }
    if (!puedeCancelar(cita, s.configuracion)) {
      throw new ApiError(409, 'Ya no es posible cancelar con esta anticipación; comunícate con la clínica.');
    }
    cita.estado = 'Cancelada';
    cita.motivoCancelacion = m;
    cita.canceladaEn = new Date().toISOString();
    setEstado(s);
  });
}

export interface CitaAgenda extends Cita {
  cliente: UsuarioPublico;
}

/** SAL-04 · Agenda de la administradora para un día (CU-04). */
export function obtenerAgenda(claveDiaStr: string) {
  if (modoRemoto) return http<{ citas: CitaAgenda[] }>(`/citas/agenda?dia=${encodeURIComponent(claveDiaStr)}`).then((r) => r.citas);
  return llamar<CitaAgenda[]>(() => {
    const s = getEstado();
    exigirSesion(s, 'admin');
    const dia = desdeClaveYHora(claveDiaStr, '00:00');
    return s.citas
      .filter((c) => mismoDia(new Date(c.inicio), dia))
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .map((c) => {
        const u = s.usuarios.find((x) => x.id === c.idUsuario);
        // Persona sin cuenta (agendada por la administradora): se muestra con el nombre capturado.
        const cliente: UsuarioPublico = u
          ? aPublico(u)
          : { id: '', nombre: c.nombreCliente ?? 'Cliente', apellido: '', correo: '', telefono: c.telefonoCliente, rol: 'cliente', activo: true, tieneCuestionario: false };
        return { ...c, cliente };
      });
  });
}

/**
 * ALG-09 · Cierre de cita: Finalizada o NoShow (ENT-09). Solo desde Confirmada;
 * "No se presentó" solo cuando ya pasó la hora de inicio.
 */
export function cerrarCita(idCita: string, resultado: 'Finalizada' | 'NoShow' | 'Cancelada') {
  if (modoRemoto) return mutar(http<void>(`/citas/${encodeURIComponent(idCita)}/cerrar`, { metodo: 'POST', cuerpo: { resultado } }));
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    const cita = s.citas.find((c) => c.id === idCita);
    if (!cita) throw new ApiError(404, 'Cita no encontrada.');
    if (cita.estado !== 'Confirmada') throw new ApiError(409, 'Solo se pueden cerrar citas confirmadas.');
    if (resultado === 'NoShow' && new Date(cita.inicio) > new Date()) {
      throw new ApiError(409, 'No se puede marcar "No se presentó" antes de la hora de inicio.');
    }
    cita.estado = resultado;
    if (resultado === 'Cancelada') {
      cita.motivoCancelacion = 'Cancelada por la administradora';
      cita.canceladaEn = new Date().toISOString();
    }
    setEstado(s);
  });
}

export interface DatosCitaAdmin {
  dia: string;
  hora: string;
  servicios: string[];
  /** Correo de una cuenta existente (opcional). Si se omite, se usa `nombre` (+ `telefono`). */
  correoCliente?: string;
  nombre?: string;
  telefono?: string;
}

/**
 * La administradora agenda una cita para una clienta (con o sin cuenta). Mismas reglas de
 * horario que ALG-06: no en el pasado y sin traslape (una sola cabina → 409 con alternativas).
 * No exige cuestionario: ese requisito aplica cuando la clienta reserva por sí misma.
 */
export function agendarCitaAdmin(d: DatosCitaAdmin) {
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    const { lista, total } = duracionDe(s, d.servicios);
    const correo = d.correoCliente?.trim().toLowerCase();
    const cliente = correo ? s.usuarios.find((u) => u.correo.toLowerCase() === correo && u.rol === 'cliente') : undefined;
    if (correo && !cliente) throw new ApiError(404, 'No existe una cuenta con ese correo. Déjalo vacío y escribe el nombre.', { campo: 'correo' });
    const nombre = d.nombre?.trim();
    if (!cliente && !nombre) throw new ApiError(400, 'Escribe el nombre de la clienta o su correo.', { campo: 'nombre' });
    const inicio = desdeClaveYHora(d.dia, d.hora);
    const fin = sumarMinutos(inicio, total);
    if (inicio <= new Date()) throw new ApiError(400, 'Elige una fecha y hora futuras.', { campo: 'hora' });
    if (hayTraslape(s, inicio, fin)) {
      throw new ApiError(409, 'Ese horario ya está ocupado.', { alternativos: siguientesLibres(s, inicio, total) });
    }
    const cita: Cita = {
      id: nuevoId('cit'),
      idUsuario: cliente?.id ?? '',
      nombreCliente: cliente ? undefined : nombre,
      telefonoCliente: cliente ? undefined : d.telefono?.trim() || undefined,
      servicios: lista.map((x) => ({ idServicio: x.id, nombre: x.nombre, duracionMin: x.duracionMin, costo: x.precio })),
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      estado: 'Confirmada',
      creadaEn: new Date().toISOString(),
    };
    s.citas.push(cita);
    setEstado(s);
    return cita;
  });
}

// ─────────────────────────── Promociones ───────────────────────────

/** Promociones (solo administradora). */
export function obtenerPromociones() {
  return llamar<Promocion[]>(() => {
    const s = getEstado();
    exigirSesion(s, 'admin');
    return [...s.promociones];
  });
}

export interface DatosPromocion {
  id?: string;
  titulo: string;
  descripcion: string;
  precio: number;
  precioAntes?: number;
  idServicio?: string;
  vigenciaHasta?: string;
}

/** Alta y edición de promoción. */
export function guardarPromocion(d: DatosPromocion) {
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    if (!d.titulo.trim()) throw new ApiError(400, 'El título es obligatorio.', { campo: 'titulo' });
    if (!(d.precio >= 0)) throw new ApiError(400, 'El precio no puede ser negativo.', { campo: 'precio' });
    if (d.precioAntes !== undefined && !(d.precioAntes >= d.precio)) throw new ApiError(400, 'El precio anterior debe ser mayor o igual al precio de la promoción.', { campo: 'precioAntes' });
    if (d.vigenciaHasta && !/^\d{4}-\d{2}-\d{2}$/.test(d.vigenciaHasta)) throw new ApiError(400, 'La vigencia debe tener formato AAAA-MM-DD.', { campo: 'vigenciaHasta' });
    const campos = { titulo: d.titulo.trim(), descripcion: d.descripcion.trim(), precio: d.precio, precioAntes: d.precioAntes, idServicio: d.idServicio || undefined, vigenciaHasta: d.vigenciaHasta || undefined };
    const existente = d.id ? s.promociones.find((x) => x.id === d.id) : undefined;
    if (existente) Object.assign(existente, campos);
    else s.promociones.push({ id: nuevoId('prm'), activa: true, ...campos });
    setEstado(s);
  });
}

export function cambiarPromocionActiva(id: string, activa: boolean) {
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    const p = s.promociones.find((x) => x.id === id);
    if (!p) throw new ApiError(404, 'Promoción no encontrada.');
    p.activa = activa;
    setEstado(s);
  });
}

// ─────────────────────────── Ventas e inventario (M04) ───────────────────────────

function movimiento(
  idProducto: string,
  tipo: MovimientoInventario['tipo'],
  cantidad: number,
  motivo: string,
): MovimientoInventario {
  return { id: nuevoId('mov'), idProducto, tipo, cantidad, fecha: new Date().toISOString(), motivo };
}

export interface EntradaLineaVenta {
  tipo: 'producto' | 'servicio';
  idItem: string;
  cantidad: number;
}
export interface DatosVenta {
  lineas: EntradaLineaVenta[];
  metodoPago: MetodoPago;
  correoCliente?: string;
  nombreCliente?: string;
}

/**
 * ALG-10 · Registro de venta con descuento de inventario (CU-05).
 * ATÓMICO: si UNA línea no tiene existencias se rechaza TODA la venta (409) y no
 * se guarda nada (RNB-03, RNB-07, RF-M04-04). El total lo calcula la API con los
 * precios vigentes; el que ve la persona en pantalla es solo informativo.
 * Devuelve las alertas de stock mínimo generadas (ALG-13).
 */
export function registrarVenta(datos: DatosVenta) {
  if (modoRemoto) return mutar(http<{ venta: Venta; alertas: Producto[] }>('/ventas', { metodo: 'POST', cuerpo: datos }));
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    if (!datos.lineas.length) throw new ApiError(400, 'Agrega al menos un artículo a la venta.');

    const lineas: LineaVenta[] = [];
    for (const l of datos.lineas) {
      if (!Number.isInteger(l.cantidad) || l.cantidad <= 0) {
        throw new ApiError(400, 'La cantidad debe ser un entero mayor a 0.');
      }
      if (l.tipo === 'producto') {
        const p = s.productos.find((x) => x.id === l.idItem && x.activo);
        if (!p) throw new ApiError(404, 'Producto no encontrado.');
        if (p.stock <= 0 || l.cantidad > p.stock) {
          throw new ApiError(409, `Sin existencias suficientes de "${p.nombre}" (disponibles: ${p.stock}).`, {
            idProducto: p.id,
          });
        }
        p.stock -= l.cantidad;
        s.movimientos.push(movimiento(p.id, 'salida', l.cantidad, 'Venta'));
        lineas.push({ tipo: 'producto', idItem: p.id, nombre: p.nombre, cantidad: l.cantidad, precioUnitario: p.precio });
      } else {
        const sv = s.servicios.find((x) => x.id === l.idItem && x.activo);
        if (!sv) throw new ApiError(404, 'Servicio no encontrado.');
        lineas.push({ tipo: 'servicio', idItem: sv.id, nombre: sv.nombre, cantidad: l.cantidad, precioUnitario: sv.precio });
      }
    }

    const correo = datos.correoCliente?.trim().toLowerCase();
    const cliente = correo ? s.usuarios.find((u) => u.correo.toLowerCase() === correo) : undefined;
    if (correo && !cliente) {
      throw new ApiError(404, 'No existe una cuenta con ese correo. Déjalo vacío y escribe solo el nombre.');
    }

    const venta: Venta = {
      id: nuevoId('vta'),
      fecha: new Date().toISOString(),
      idUsuario: cliente?.id,
      nombreCliente: cliente ? undefined : datos.nombreCliente?.trim() || undefined,
      metodoPago: datos.metodoPago,
      lineas,
      total: lineas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0),
    };
    s.ventas.push(venta);
    setEstado(s);

    const alertas = lineas
      .filter((l) => l.tipo === 'producto')
      .map((l) => s.productos.find((p) => p.id === l.idItem)!)
      .filter((p) => p.stock <= p.stockMinimo);
    return { venta, alertas };
  });
}

/** SAL-07 · Inventario con alertas (productos en o bajo su mínimo, RNB-04). */
export function obtenerInventario() {
  if (modoRemoto) return http<{ productos: (Producto & { enAlerta: boolean })[]; movimientos: MovimientoInventario[] }>('/inventario');
  return llamar(() => {
    const s = getEstado();
    exigirSesion(s, 'admin');
    const productos = s.productos.map((p) => ({ ...p, enAlerta: p.stock <= p.stockMinimo }));
    const movimientos = [...s.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30);
    return { productos, movimientos };
  });
}

/**
 * ALG-11 · Movimiento de inventario (ENT-08). Ningún movimiento puede dejar el
 * stock en negativo. "ajuste" fija la existencia a la cantidad indicada (conteo físico).
 */
export function registrarMovimiento(
  idProducto: string,
  tipo: MovimientoInventario['tipo'],
  cantidad: number,
  motivo: string,
) {
  if (modoRemoto) return mutar(http<{ producto: Producto; enAlerta: boolean }>('/inventario/movimientos', { metodo: 'POST', cuerpo: { idProducto, tipo, cantidad, motivo } }));
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    const p = s.productos.find((x) => x.id === idProducto);
    if (!p) throw new ApiError(404, 'Producto no encontrado.');
    if (!Number.isInteger(cantidad) || cantidad < 0 || (tipo !== 'ajuste' && cantidad === 0)) {
      throw new ApiError(400, 'La cantidad debe ser un entero válido.', { campo: 'cantidad' });
    }
    const nuevo = tipo === 'entrada' ? p.stock + cantidad : tipo === 'salida' ? p.stock - cantidad : cantidad;
    if (nuevo < 0) throw new ApiError(409, 'El movimiento dejaría el stock en negativo.', { campo: 'cantidad' });
    p.stock = nuevo;
    s.movimientos.push(movimiento(p.id, tipo, cantidad, motivo.trim() || 'Sin motivo'));
    setEstado(s);
    return { producto: p, enAlerta: p.stock <= p.stockMinimo };
  });
}

export function actualizarConfiguracion(cfg: Partial<Configuracion>) {
  if (modoRemoto) return http<void>('/configuracion', { metodo: 'PUT', cuerpo: cfg }).then(() => { const s = copiar(); s.configuracion = { ...s.configuracion, ...cfg }; setEstado(s); });
  return llamar(() => {
    const s = copiar();
    exigirSesion(s, 'admin');
    s.configuracion = { ...s.configuracion, ...cfg };
    setEstado(s);
  });
}

// ─────────────────────────── Contacto (público) ───────────────────────────

const ENVIOS: number[] = [];

/** Quita caracteres de control y colapsa espacios. React ya escapa al mostrar (anti-XSS); esto evita basura/inyección de saltos. */
const limpiar = (t: string) => t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]{2,}/g, ' ').trim();

/**
 * Formulario de contacto de la home. Defensas: campo trampa (honeypot) que solo
 * llenan los bots → se responde "ok" sin guardar; validación de longitud/formato;
 * límite de 3 envíos por minuto por navegador (el servidor real aplica rate limit por IP).
 */
export function enviarContacto(datos: { nombre: string; correo: string; mensaje: string; trampa?: string }) {
  if (modoRemoto) return http<void>('/contacto', { metodo: 'POST', cuerpo: datos });
  return llamar(() => {
    if (datos.trampa) return; // bot
    const nombre = limpiar(datos.nombre);
    const correo = datos.correo.trim().toLowerCase();
    const mensaje = limpiar(datos.mensaje);
    if (!nombre || nombre.length > 80) throw new ApiError(400, 'Nombre inválido.', { campo: 'nombre' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 120) throw new ApiError(400, 'Correo inválido.', { campo: 'correo' });
    if (mensaje.length < 10 || mensaje.length > 1000) throw new ApiError(400, 'El mensaje debe tener entre 10 y 1000 caracteres.', { campo: 'mensaje' });
    const ahora = Date.now();
    while (ENVIOS.length && ahora - ENVIOS[0] > 60_000) ENVIOS.shift();
    if (ENVIOS.length >= 3) throw new ApiError(429, 'Demasiados mensajes seguidos.');
    ENVIOS.push(ahora);
    const s = copiar();
    s.contactos.push({ id: nuevoId('ctc'), nombre, correo, mensaje, fecha: new Date().toISOString() });
    setEstado(s);
  });
}

// ─────────────────────────── Dashboard (M05 ampliado) ───────────────────────────

export type Comparacion = 'anterior' | 'anio' | 'ninguna';

export interface MetricasPeriodo {
  ingresos: number;
  ingresosServicios: number;
  ingresosProductos: number;
  citas: number;
  finalizadas: number;
  canceladas: number;
  noShow: number;
  tasaCancelacion: number;
  ticketPromedio: number;
  clientesUnicos: number;
}

export interface PuntoSerie { etiqueta: string; actual: number; comparado: number }

export interface Dashboard {
  rango: { desde: string; hasta: string; comparadoDesde?: string; comparadoHasta?: string };
  actual: MetricasPeriodo;
  comparado: MetricasPeriodo | null;
  /** Ingresos por cubeta (día/semana/mes según la longitud del periodo), actual vs comparado. */
  serie: PuntoSerie[];
  granularidad: 'día' | 'semana' | 'mes';
  /** Últimos 12 meses terminando en `hasta` (siempre mensual), para ver tendencia. */
  ultimos12: { mes: string; servicios: number; productos: number }[];
  porCategoria: { categoria: string; ingresos: number }[];
  topServicios: { nombre: string; cantidad: number; ingresos: number }[];
  topProductos: { nombre: string; cantidad: number; ingresos: number }[];
  citasPorDiaSemana: { dia: string; actual: number; comparado: number }[];
  motivosCancelacion: { motivo: string; cantidad: number }[];
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function calcularPeriodo(s: DbState, ini: Date, fin: Date) {
  const dentro = (iso: string) => { const d = new Date(iso); return d >= ini && d < fin; };
  const citas = s.citas.filter((c) => dentro(c.inicio));
  const fin_ = citas.filter((c) => c.estado === 'Finalizada');
  const ventas = s.ventas.filter((v) => dentro(v.fecha));
  const catDe = (l: LineaVenta) => (l.tipo === 'producto' ? s.productos.find((p) => p.id === l.idItem)?.categoria : s.servicios.find((x) => x.id === l.idItem)?.categoria) ?? 'Otros';

  const ingresosServ = fin_.reduce((a, c) => a + c.servicios.reduce((b, x) => b + x.costo, 0), 0)
    + ventas.reduce((a, v) => a + v.lineas.filter((l) => l.tipo === 'servicio').reduce((b, l) => b + l.cantidad * l.precioUnitario, 0), 0);
  const ingresosProd = ventas.reduce((a, v) => a + v.lineas.filter((l) => l.tipo === 'producto').reduce((b, l) => b + l.cantidad * l.precioUnitario, 0), 0);
  const ingresos = ingresosServ + ingresosProd;
  const operaciones = fin_.length + ventas.length;
  const canceladas = citas.filter((c) => c.estado === 'Cancelada').length;
  const metricas: MetricasPeriodo = {
    ingresos, ingresosServicios: ingresosServ, ingresosProductos: ingresosProd,
    citas: citas.length, finalizadas: fin_.length, canceladas,
    noShow: citas.filter((c) => c.estado === 'NoShow').length,
    tasaCancelacion: citas.length ? canceladas / citas.length : 0,
    ticketPromedio: operaciones ? ingresos / operaciones : 0,
    clientesUnicos: new Set(citas.map((c) => c.idUsuario)).size,
  };
  return { metricas, citas, fin_, ventas, catDe };
}

/** Ingresos (servicios finalizados + ventas) por instante, para armar series. */
function movimientosIngreso(s: DbState, ini: Date, fin: Date): { fecha: Date; monto: number; tipo: 'servicio' | 'producto' }[] {
  const dentro = (d: Date) => d >= ini && d < fin;
  const out: { fecha: Date; monto: number; tipo: 'servicio' | 'producto' }[] = [];
  s.citas.forEach((c) => { const d = new Date(c.inicio); if (c.estado === 'Finalizada' && dentro(d)) out.push({ fecha: d, monto: c.servicios.reduce((a, x) => a + x.costo, 0), tipo: 'servicio' }); });
  s.ventas.forEach((v) => { const d = new Date(v.fecha); if (dentro(d)) v.lineas.forEach((l) => out.push({ fecha: d, monto: l.cantidad * l.precioUnitario, tipo: l.tipo })); });
  return out;
}

/**
 * Dashboard de negocio (CU-07 ampliado): KPIs del periodo, comparación contra el
 * periodo anterior o contra el mismo periodo del año pasado, serie de ingresos,
 * tendencia de 12 meses, mezcla por categoría, más vendidos, demanda por día y
 * motivos de cancelación. Solo lectura; solo administradora.
 */
export function generarDashboard(desdeClave: string, hastaClave: string, comparar: Comparacion) {
  if (modoRemoto) return http<Dashboard>(`/reportes/dashboard?desde=${encodeURIComponent(desdeClave)}&hasta=${encodeURIComponent(hastaClave)}&comparar=${comparar}`);
  return llamar<Dashboard>(() => {
    const s = getEstado();
    exigirSesion(s, 'admin');
    if (desdeClave > hastaClave) throw new ApiError(400, 'La fecha de inicio no puede ser posterior a la de fin.', { campo: 'desde' });
    const ini = desdeClaveYHora(desdeClave, '00:00');
    const fin = sumarDias(desdeClaveYHora(hastaClave, '00:00'), 1);
    const dias = Math.round((fin.getTime() - ini.getTime()) / 86_400_000);

    let cIni: Date | null = null; let cFin: Date | null = null;
    if (comparar === 'anterior') { cFin = ini; cIni = sumarDias(ini, -dias); }
    if (comparar === 'anio') { cIni = new Date(ini); cIni.setFullYear(cIni.getFullYear() - 1); cFin = new Date(fin); cFin.setFullYear(cFin.getFullYear() - 1); }

    const A = calcularPeriodo(s, ini, fin);
    const C = cIni && cFin ? calcularPeriodo(s, cIni, cFin) : null;

    // Serie con cubetas alineadas por posición (día 1 vs día 1 del comparado, etc.)
    const granularidad: Dashboard['granularidad'] = dias <= 45 ? 'día' : dias <= 200 ? 'semana' : 'mes';
    const cubeta = (d: Date, base: Date) => granularidad === 'día' ? Math.floor((d.getTime() - base.getTime()) / 86_400_000)
      : granularidad === 'semana' ? Math.floor((d.getTime() - base.getTime()) / (7 * 86_400_000))
      : (d.getFullYear() - base.getFullYear()) * 12 + d.getMonth() - base.getMonth();
    const n = granularidad === 'día' ? dias : granularidad === 'semana' ? Math.ceil(dias / 7) : cubeta(sumarDias(fin, -1), ini) + 1;
    const act = Array<number>(n).fill(0); const cmp = Array<number>(n).fill(0);
    movimientosIngreso(s, ini, fin).forEach((m) => { const k = cubeta(m.fecha, ini); if (k >= 0 && k < n) act[k] += m.monto; });
    if (cIni && cFin) movimientosIngreso(s, cIni, cFin).forEach((m) => { const k = cubeta(m.fecha, cIni!); if (k >= 0 && k < n) cmp[k] += m.monto; });
    const etiqueta = (k: number) => {
      if (granularidad === 'mes') { const d = new Date(ini.getFullYear(), ini.getMonth() + k, 1); return `${MESES_CORTOS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; }
      const d = sumarDias(ini, granularidad === 'día' ? k : k * 7); return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
    };
    const serie: PuntoSerie[] = act.map((v, k) => ({ etiqueta: etiqueta(k), actual: v, comparado: cmp[k] }));

    // Últimos 12 meses (terminando en el mes de `hasta`)
    const finMes = desdeClaveYHora(hastaClave, '00:00');
    const ultimos12 = Array.from({ length: 12 }, (_, i) => {
      const m0 = new Date(finMes.getFullYear(), finMes.getMonth() - (11 - i), 1);
      const m1 = new Date(m0.getFullYear(), m0.getMonth() + 1, 1);
      const mv = movimientosIngreso(s, m0, m1);
      return { mes: `${MESES_CORTOS[m0.getMonth()]} ${String(m0.getFullYear()).slice(2)}`, servicios: mv.filter((x) => x.tipo === 'servicio').reduce((a, x) => a + x.monto, 0), productos: mv.filter((x) => x.tipo === 'producto').reduce((a, x) => a + x.monto, 0) };
    });

    // Mezcla por categoría, tops
    const cat = new Map<string, number>(); const srv = new Map<string, { cantidad: number; ingresos: number }>(); const prd = new Map<string, { cantidad: number; ingresos: number }>();
    A.fin_.forEach((c) => c.servicios.forEach((x) => {
      const categoria = s.servicios.find((q) => q.id === x.idServicio)?.categoria ?? 'Otros';
      cat.set(categoria, (cat.get(categoria) ?? 0) + x.costo);
      const t = srv.get(x.nombre) ?? { cantidad: 0, ingresos: 0 }; t.cantidad += 1; t.ingresos += x.costo; srv.set(x.nombre, t);
    }));
    A.ventas.forEach((v) => v.lineas.forEach((l) => {
      cat.set(A.catDe(l), (cat.get(A.catDe(l)) ?? 0) + l.cantidad * l.precioUnitario);
      if (l.tipo === 'producto') { const t = prd.get(l.nombre) ?? { cantidad: 0, ingresos: 0 }; t.cantidad += l.cantidad; t.ingresos += l.cantidad * l.precioUnitario; prd.set(l.nombre, t); }
    }));
    const top = (m: Map<string, { cantidad: number; ingresos: number }>) => [...m.entries()].map(([nombre, v]) => ({ nombre, ...v })).sort((a, b) => b.ingresos - a.ingresos).slice(0, 5);

    const porDia = (cs: Cita[]) => { const r = Array<number>(7).fill(0); cs.forEach((c) => { r[new Date(c.inicio).getDay()] += 1; }); return r; };
    const dA = porDia(A.citas); const dC = C ? porDia(C.citas) : Array<number>(7).fill(0);
    const motivos = new Map<string, number>();
    A.citas.filter((c) => c.estado === 'Cancelada').forEach((c) => motivos.set(c.motivoCancelacion ?? 'Sin motivo', (motivos.get(c.motivoCancelacion ?? 'Sin motivo') ?? 0) + 1));

    return {
      rango: { desde: desdeClave, hasta: hastaClave, comparadoDesde: cIni ? claveDia(cIni) : undefined, comparadoHasta: cFin ? claveDia(sumarDias(cFin, -1)) : undefined },
      actual: A.metricas, comparado: C?.metricas ?? null, serie, granularidad, ultimos12,
      porCategoria: [...cat.entries()].map(([categoria, ingresos]) => ({ categoria, ingresos })).sort((a, b) => b.ingresos - a.ingresos),
      topServicios: top(srv), topProductos: top(prd),
      citasPorDiaSemana: [1, 2, 3, 4, 5, 6, 0].map((d) => ({ dia: DIAS[d], actual: dA[d], comparado: dC[d] })),
      motivosCancelacion: [...motivos.entries()].map(([motivo, cantidad]) => ({ motivo, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
    };
  });
}
