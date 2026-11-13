import { HASH_SENUELO } from './hash';
import { claveDia, desdeClaveYHora, sumarDias, sumarMinutos } from './dates';
import type { Cita, DbState, Producto, Promocion, Servicio, Usuario, Venta } from './types';

/**
 * Datos iniciales ("seed") de la base de datos mock.
 *
 * - Servicios: tomados de los carteles reales del spa (promociones y limpieza
 *   facial). Precios = los publicados. Las DURACIONES son una propuesta
 *   (los carteles no las indican; salvo "Promoción Papá": 2 h 30 min).
 * - Productos: el gel Organika de la foto y dos productos de ejemplo del
 *   documento de diseño (figura 8.7). Stock y mínimos son de demostración.
 * - Cuentas demo: permiten probar ambos roles sin backend. ELIMINAR al conectar la API.
 */

export const CUENTA_DEMO_ADMIN = { correo: 'admin@aguamarina.mx', password: 'Admin1234' };
export const CUENTA_DEMO_CLIENTE = { correo: 'cliente@ejemplo.com', password: 'Cliente123' };

export const VERSION_DB = 3;

// Hashes SHA-256+sal precalculados (ver lib/hash.ts) de las contraseñas demo (la contraseña NO se guarda en el código
// que corre en el navegador; las constantes de arriba solo sirven para rellenar el formulario demo).
const HASH_ADMIN = 'sha256$demo-salt-admin!$c6e5a6460320dab58a84ea84e3086968a942431f148c33353682a74ab36dd700';
const HASH_CLIENTE = 'sha256$demo-salt-client$c198bff6f342f1dc3f23e478b63f0a3c960dd94f3d0bb7cb0125c9240f6d253c';

const servicios: Servicio[] = [
  {
    id: 'srv-limpieza',
    nombre: 'Limpieza facial profunda',
    descripcion: 'Limpieza profunda con vapor para una piel renovada, hidratada y luminosa.',
    categoria: 'Facial',
    precio: 650,
    duracionMin: 90,
    activo: true,
    imagen: 'limpieza',
  },
  {
    id: 'srv-lifting',
    nombre: 'Facial lifting con mascarilla de oro',
    descripcion:
      'Protocolo de lifting con mascarilla de oro: luminosidad, firmeza visible y apariencia rejuvenecida, sin procedimientos invasivos.',
    categoria: 'Facial',
    precio: 1100,
    duracionMin: 90,
    activo: true,
    imagen: 'lifting',
  },
  {
    id: 'srv-papa',
    nombre: 'Promoción Papá',
    descripcion:
      'Limpieza facial profunda + masaje antiestrés + exfoliación y estimulación capilar con alta frecuencia. Contamos con certificado de regalo.',
    categoria: 'Paquetes',
    precio: 840,
    duracionMin: 150,
    activo: true,
    imagen: 'papa',
  },
  {
    id: 'srv-morpheus',
    nombre: 'Morpheus facial o corporal',
    descripcion: 'Tratamiento Morpheus para rejuvenecimiento y remodelación, facial o corporal.',
    categoria: 'Estética',
    precio: 1690,
    duracionMin: 60,
    activo: true,
    imagen: 'promociones',
  },
  {
    id: 'srv-gluteos',
    nombre: 'Aumento de glúteos con ácido hialurónico',
    descripcion: 'Aumento de glúteos con ácido hialurónico.',
    categoria: 'Estética',
    precio: 13900,
    duracionMin: 90,
    activo: true,
    imagen: 'promociones',
  },
  {
    id: 'srv-hifu',
    nombre: 'Hifu facial, corporal o vaginal',
    descripcion: 'Ultrasonido focalizado de alta intensidad (HIFU): facial, corporal o vaginal.',
    categoria: 'Estética',
    precio: 890,
    duracionMin: 60,
    activo: true,
    imagen: 'promociones',
  },
  {
    id: 'srv-escleroterapia',
    nombre: 'Escleroterapia',
    descripcion: 'Tratamiento para várices y arañas vasculares.',
    categoria: 'Estética',
    precio: 790,
    duracionMin: 45,
    activo: true,
    imagen: 'promociones',
  },
  {
    id: 'srv-botox',
    nombre: 'Botox (entreceja, patas de gallo o frente)',
    descripcion: 'Aplicación de toxina botulínica en entrecejo, patas de gallo o frente.',
    categoria: 'Estética',
    precio: 3900,
    duracionMin: 30,
    activo: true,
    imagen: 'promociones',
  },
];

const productos: Producto[] = [
  {
    id: 'prd-organika',
    nombre: 'Organika Ritual Contour · Placer Menta (220 g)',
    descripcion: 'Gel reafirmante corporal. Reservado a profesionales. Todo tipo de piel.',
    categoria: 'Cuidado corporal',
    precio: 480,
    stock: 8,
    stockMinimo: 3,
    codigoBarras: '7501000000011',
    activo: true,
    imagen: 'organika',
  },
  {
    id: 'prd-crema',
    nombre: 'Crema hidratante 50 ml',
    descripcion: 'Crema hidratante facial de uso diario.',
    categoria: 'Cuidado facial',
    precio: 180,
    stock: 12,
    stockMinimo: 3,
    codigoBarras: '7501234567890',
    activo: true,
  },
  {
    id: 'prd-mascarilla',
    nombre: 'Mascarilla de arcilla',
    descripcion: 'Mascarilla purificante de arcilla.',
    categoria: 'Cuidado facial',
    precio: 95,
    stock: 3,
    stockMinimo: 3,
    codigoBarras: '7501234567891',
    activo: true,
  },
];

const NOMBRES_DEMO: [string, string][] = [
  ['Mariana', 'Ortega'], ['Luis', 'Aguilar'], ['Daniela', 'Vargas'], ['Karla', 'Mendoza'],
  ['Sofía', 'Barajas'], ['Paola', 'Chávez'], ['Regina', 'Ibarra'], ['Fernanda', 'Soto'],
];
const MOTIVOS = ['Cambio de planes', 'Enfermedad', 'Problema de trabajo', 'Reprogramaré', 'Imprevisto familiar', 'Falta de transporte'];

/** Generador pseudoaleatorio determinista (mulberry32): el mismo historial en cada instalación. */
function prng(semilla: number) {
  return () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * HISTORIAL DE DEMOSTRACIÓN (24 meses hacia atrás) para que los dashboards de
 * Reportes tengan qué comparar: tendencia al alza, picos en mayo y diciembre y
 * domingos sin actividad. Son datos FICTICIOS; se borran al conectar la base real.
 */
function generarHistorial(servicios: Servicio[], productos: Producto[], clientes: string[]) {
  const r = prng(2026);
  const ventas: Venta[] = [];
  const citas: Cita[] = [];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const pesoSrv = [5, 3, 2, 2, 0.1, 2, 1.5, 1.5]; // popularidad relativa (alineada a `servicios`)
  const elegir = <T,>(lista: T[], pesos?: number[]): T => {
    const p = pesos ?? lista.map(() => 1);
    let x = r() * p.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lista.length; i++) { x -= p[i]; if (x <= 0) return lista[i]; }
    return lista[lista.length - 1];
  };
  for (let d = 730; d >= 1; d--) {
    const dia = sumarDias(hoy, -d);
    if (dia.getDay() === 0) continue; // domingo cerrado
    const mes = dia.getMonth();
    const tendencia = 0.55 + ((730 - d) / 730) * 0.9; // crece con el tiempo
    const temporada = mes === 4 || mes === 11 ? 1.4 : mes === 0 || mes === 7 ? 0.8 : 1;
    const demanda = tendencia * temporada * (dia.getDay() === 6 ? 1.3 : 1);
    const nCitas = Math.round(r() * 2.2 * demanda);
    for (let k = 0; k < nCitas; k++) {
      const srv = elegir(servicios, pesoSrv);
      const inicio = new Date(dia); inicio.setHours(10 + Math.floor(r() * 8), r() < 0.5 ? 0 : 30);
      const u = r();
      citas.push({
        id: `cit-h${d}-${k}`, idUsuario: elegir(clientes), inicio: inicio.toISOString(),
        fin: sumarMinutos(inicio, srv.duracionMin).toISOString(), creadaEn: sumarDias(inicio, -3).toISOString(),
        servicios: [{ idServicio: srv.id, nombre: srv.nombre, duracionMin: srv.duracionMin, costo: srv.precio }],
        estado: u < 0.8 ? 'Finalizada' : u < 0.93 ? 'Cancelada' : 'NoShow',
        ...(u >= 0.8 && u < 0.93 ? { motivoCancelacion: elegir(MOTIVOS), canceladaEn: sumarDias(inicio, -1).toISOString() } : {}),
      });
    }
    if (r() < 0.55 * demanda) {
      const p = elegir(productos, [3, 4, 2]);
      const cant = 1 + Math.floor(r() * 2);
      ventas.push({
        id: `vta-h${d}`, fecha: new Date(dia.getTime() + 15 * 3_600_000).toISOString(), idUsuario: undefined, nombreCliente: 'Mostrador',
        metodoPago: elegir(['Efectivo', 'Terminal bancaria', 'Transferencia'] as Venta['metodoPago'][], [4, 4, 2]),
        lineas: [{ tipo: 'producto', idItem: p.id, nombre: p.nombre, cantidad: cant, precioUnitario: p.precio }],
        total: cant * p.precio,
      });
    }
  }
  return { ventas, citas };
}

/** Promociones de los carteles del spa (precios publicados). */
const promociones: Promocion[] = [
  { id: 'prm-papa', titulo: 'Promoción Papá', descripcion: 'Limpieza facial profunda, masaje antiestrés y exfoliación con estimulación capilar. 2 h 30 min. Certificado de regalo disponible.', precio: 840, precioAntes: 1050, idServicio: 'srv-papa', activa: true },
  { id: 'prm-especiales', titulo: 'Promociones especiales', descripcion: 'Morpheus, Hifu, escleroterapia, botox y más, desde $790.', precio: 790, activa: true },
];

export function crearSeed(): DbState {
  const clientesDemo = NOMBRES_DEMO.map((n, i): Usuario => ({
    id: `usr-h${i}`, nombre: n[0], apellido: n[1], correo: `historico${i}@ejemplo.com`,
    passwordHash: HASH_SENUELO, // no puede iniciar sesión: solo sirve para el historial
    rol: 'cliente', activo: true,
    historialMedico: { alergias: 'Ninguna', lesionesODolores: 'Ninguna', padecimientosCronicos: 'Ninguna', fechaLlenado: new Date().toISOString() },
  }));
  const historial = generarHistorial(servicios, productos, clientesDemo.map((c) => c.id));
  const usuarios: Usuario[] = [
    {
      id: 'usr-admin',
      nombre: 'Dulce Sofía',
      apellido: 'Pedroza Verduzco',
      correo: CUENTA_DEMO_ADMIN.correo,
      passwordHash: HASH_ADMIN,
      rol: 'admin',
      activo: true,
    },
    {
      id: 'usr-demo',
      nombre: 'Ana',
      apellido: 'Demostración',
      correo: CUENTA_DEMO_CLIENTE.correo,
      telefono: '3511000000',
      passwordHash: HASH_CLIENTE,
      rol: 'cliente',
      activo: true,
      historialMedico: {
        alergias: 'Ninguna',
        lesionesODolores: 'Ninguna',
        padecimientosCronicos: 'Ninguna',
        fechaLlenado: new Date().toISOString(),
      },
    },
  ];

  usuarios.push(...clientesDemo);

  // Citas de ejemplo (relativas a "hoy") para que la agenda no inicie vacía.
  const hoy = new Date();
  const mk = (id: string, dias: number, hora: string, srv: Servicio): Cita => {
    const inicio = desdeClaveYHora(claveDia(sumarDias(hoy, dias)), hora);
    return {
      id,
      idUsuario: 'usr-demo',
      servicios: [
        { idServicio: srv.id, nombre: srv.nombre, duracionMin: srv.duracionMin, costo: srv.precio },
      ],
      inicio: inicio.toISOString(),
      fin: sumarMinutos(inicio, srv.duracionMin).toISOString(),
      estado: 'Confirmada',
      creadaEn: new Date().toISOString(),
    };
  };

  return {
    version: VERSION_DB,
    usuarios,
    servicios,
    productos,
    citas: [mk('cit-1', 1, '11:00', servicios[0]), mk('cit-2', 3, '16:00', servicios[1]), ...historial.citas],
    ventas: historial.ventas,
    movimientos: productos.map((p, i) => ({
      id: `mov-seed-${i}`,
      idProducto: p.id,
      tipo: 'entrada',
      cantidad: p.stock,
      fecha: new Date().toISOString(),
      motivo: 'Existencia inicial',
    })),
    contactos: [],
    promociones,
    configuracion: {
      horaApertura: 10,
      horaCierre: 19,
      pasoMin: 30,
      margenCancelacionHoras: 24,
      diasVentana: 60,
    },
    sesion: null,
    hidratado: false,
    revision: 0,
  };
}

/**
 * Estado inicial en MODO SERVIDOR: sin datos de ejemplo (todo se pide a la API).
 * Solo conserva la configuración por defecto hasta que se cargue la real.
 */
export function crearVacio(): DbState {
  const base = crearSeed();
  return { ...base, usuarios: [], servicios: [], productos: [], citas: [], ventas: [], movimientos: [], contactos: [], promociones: [] };
}
