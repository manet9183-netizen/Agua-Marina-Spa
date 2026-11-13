/**
 * Modelo de datos. Refleja el diccionario de datos del documento de diseño
 * (sección 10.3): Usuario, Servicio, Producto, Cita, Venta, MovimientoInventario.
 *
 * Se escribe en español para que coincida con los documentos y con las futuras
 * columnas de MySQL / respuestas de la API REST: cuando exista el backend, estos
 * tipos son el "contrato" que la API debe devolver.
 */

export type Rol = 'cliente' | 'admin';

/** Cuestionario de salud (ENT-03). En el backend real se cifra con AES-256 (RNF-03). */
export interface HistorialMedico {
  alergias: string;
  lesionesODolores: string;
  padecimientosCronicos: string;
  observacionesAdicionales?: string;
  fechaLlenado: string; // ISO
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  /** Hash PBKDF2 con sal (ver lib/hash.ts). El backend real usa bcrypt. Nunca la contraseña en claro. */
  passwordHash: string;
  rol: Rol;
  activo: boolean;
  historialMedico?: HistorialMedico;
}

/** Versión pública del usuario: nunca se expone passwordHash ni el historial. */
export type UsuarioPublico = Omit<Usuario, 'passwordHash' | 'historialMedico'> & {
  tieneCuestionario: boolean;
};

/** Claves de imágenes disponibles (ver lib/imagenes.ts). */
export type ImagenKey = 'limpieza' | 'lifting' | 'organika' | 'promociones' | 'papa' | 'logo';

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  duracionMin: number;
  /** Baja lógica: un servicio con historial no se borra, se desactiva. */
  activo: boolean;
  imagen?: ImagenKey;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  codigoBarras?: string;
  activo: boolean;
  imagen?: ImagenKey;
}

export type EstadoCita = 'Confirmada' | 'Finalizada' | 'NoShow' | 'Cancelada';

/** Se guardan nombre/duración/costo "del momento": cambiar el catálogo no altera citas pasadas. */
export interface ServicioDeCita {
  idServicio: string;
  nombre: string;
  duracionMin: number;
  costo: number;
}

export interface Cita {
  id: string;
  idUsuario: string;
  servicios: ServicioDeCita[];
  inicio: string; // ISO
  fin: string; // ISO
  estado: EstadoCita;
  motivoCancelacion?: string;
  canceladaEn?: string;
  creadaEn: string;
  /** Cita agendada por la administradora para una persona SIN cuenta (idUsuario queda vacío). */
  nombreCliente?: string;
  telefonoCliente?: string;
}

/** Promoción que publica la administradora (ej. "Promoción Papá"). Baja lógica con `activa`. */
export interface Promocion {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  precioAntes?: number;
  /** Servicio del catálogo al que aplica (opcional). */
  idServicio?: string;
  /** Último día de vigencia, AAAA-MM-DD (opcional). */
  vigenciaHasta?: string;
  activa: boolean;
}

export type MetodoPago = 'Efectivo' | 'Terminal bancaria' | 'Transferencia';

export interface LineaVenta {
  tipo: 'producto' | 'servicio';
  idItem: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Venta {
  id: string;
  fecha: string;
  idUsuario?: string;
  nombreCliente?: string;
  metodoPago: MetodoPago;
  lineas: LineaVenta[];
  total: number;
}

export interface MovimientoInventario {
  id: string;
  idProducto: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  fecha: string;
  motivo: string;
}

/** Parámetros que la administradora puede configurar (documento de diseño 2.3). */
export interface Configuracion {
  horaApertura: number; // 0-23
  horaCierre: number;
  pasoMin: number; // granularidad de horarios
  margenCancelacionHoras: number; // RNB-08
  diasVentana: number; // cuántos días a futuro se puede agendar
}

export interface Sesion {
  idUsuario: string;
  /** Caducidad 24 h (decisión AD-003 del documento de diseño). */
  expira: string;
}

export interface Contacto {
  id: string;
  nombre: string;
  correo: string;
  mensaje: string;
  fecha: string;
}

/** Estado completo de la "base de datos" mock. */
export interface DbState {
  version: number;
  usuarios: Usuario[];
  servicios: Servicio[];
  productos: Producto[];
  citas: Cita[];
  ventas: Venta[];
  movimientos: MovimientoInventario[];
  contactos: Contacto[];
  promociones: Promocion[];
  configuracion: Configuracion;
  sesion: Sesion | null;
  /** No se persiste: indica que ya se leyó AsyncStorage. */
  hidratado: boolean;
  /**
   * Contador que sube con CADA cambio de datos (mock) o de invalidación (servidor).
   * Las pantallas lo usan como dependencia para volver a pedir sus datos.
   */
  revision: number;
}
