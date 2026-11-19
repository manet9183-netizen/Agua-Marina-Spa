# Agua Marina Spa · Reporte de avance, semanas 1 a 6

Proyecto en Azure DevOps: `L23010301/AguaMarinaSpa`. La app móvil es **solo para la administradora**: agendar citas, ver reportes, agregar productos, inventario y promociones. El tablero queda en **25 elementos**: 7 épicas y 18 historias, sin features ni tareas sueltas. Cada historia lleva un código corto en el título (HU-03 a HU-14); los IDs numéricos de Azure son automáticos y no se pueden cambiar. Lo que antes eran tareas ahora es una lista de verificación en la descripción de cada historia (✔ hecho · ⏳ en proceso · ☐ pendiente).

Estado: **9 historias cerradas, 7 activas y 2 nuevas.**

## Resumen

| Semana | Tema | Historias |
|---|---|---|
| 1 | Entorno y arquitectura | HU-01, HU-02 |
| 2 | Acceso y roles | HU-03, HU-04 |
| 3 | Catálogo de productos y servicios | HU-05 |
| 4 | Promociones y agendar citas | HU-06, HU-07 |
| 5 | Agenda, expediente, venta y seguridad | HU-08, HU-09, HU-10, HU-11 |
| 6 | Inventario, reportes y migración | HU-12, HU-13, HU-14 |

## Semana 1 · Entorno y arquitectura
- **HU-01 Entorno de la app móvil** (activa).
  - ✔ Proyecto Expo / React Native creado.
  - ✔ Estructura de carpetas: `app/`, `lib/`, `hooks/`, `components/`, `constants/`.
  - ✔ Navegación con pila y pestañas.
  - ✔ Cliente HTTP con `fetch` y `EXPO_PUBLIC_API_URL`, en lugar de axios.
  - ⏳ Falta ejecutarlo en un dispositivo o emulador Android; el bundle ya compila.
- **HU-02 API Node/Express con datos de ejemplo** (activa; se completa en las semanas 7 y 8).
  - ✔ Proyecto Express inicializado.
  - ✔ Endpoints definidos y formato de respuestas.
  - ⏳ Estructura por capas (controllers/services) y datos de ejemplo en memoria.
- Se define el modelo de datos: usuario, servicio, producto, cita, venta, movimiento y promoción.

## Semana 2 · Acceso y roles
- **HU-03 Login y cierre de sesión de la administradora** (cerrada). Pantalla de login con el diseño original, cierre de sesión y endpoints de login y logout.
- **HU-04 Control de acceso por rol y perfil** (activa).
  - ✔ Middleware de token y de rol.
  - ✔ Todas las pantallas exigen sesión de administradora.
  - ✔ Pruebas de accesos permitidos y denegados.
  - ⏳ Falta editar el perfil; hoy solo existe `GET /auth/me`.

## Semana 3 · Catálogo
- **HU-05 Gestión de catálogo: productos y servicios** (cerrada). Alta y edición, código de barras único y baja lógica.

## Semana 4 · Promociones y agendar citas
- **HU-06 Promociones** (cerrada). Alta y edición (título, descripción, precio y precio anterior), servicio relacionado, fecha de vigencia y activar o desactivar sin borrar.
- **HU-07 Agendar cita** (cerrada). La administradora agenda para una clienta con cuenta (por correo) o solo con nombre y teléfono. Horarios libres según la duración de los servicios, bloqueo de horario (una sola cabina) y 3 horarios alternativos si el elegido se ocupa.

## Semana 5 · Agenda, expediente, venta y seguridad
- **HU-08 Agenda del día** (cerrada). Agenda por día, cierre de cita (Finalizada, No se presentó, Cancelar), parámetros de horario y margen de cancelación.
- **HU-09 Expediente médico de la clienta** (cerrada). Se consulta desde la cita, solo con rol de administradora.
- **HU-11 Seguridad** (activa).
  - ✔ Cifrado AES-256 del expediente.
  - ✔ Validación de entradas.
  - ⏳ Falta verificar el cifrado de extremo a extremo entre la app y la API.
- **HU-10 Punto de venta** (cerrada). Registro de venta atómico; si falta existencia en una línea, se rechaza toda la venta.

## Semana 6 · Inventario, reportes y migración
- **HU-12 Inventario** (cerrada). Movimientos de entrada, salida y ajuste, descuento automático de stock con reversión ante error y alerta visual de stock mínimo.
- **HU-13 Dashboard de reportes** (cerrada). Cancelaciones con tasa y motivos, productos y servicios más vendidos, comparación contra el periodo anterior o el año pasado.
- **HU-14 Migración de la web a la app móvil** (activa).
  - ✔ Pantallas de administración migradas y login original.
  - ✔ Base local con AsyncStorage, gráficas con `react-native-svg` y pestañas.
  - ✔ `tsc`, `expo lint` y la compilación de Android pasan.
  - ⏳ Falta probar en un dispositivo o emulador.

## Pendiente para las semanas 7 y 8 (no se reporta)
- **HU-15 Escaneo con cámara y alertas push** (activa): falta la cámara y Firebase Cloud Messaging; la alerta visual ya existe.
- **HU-04:** editar el perfil.
- **HU-01, HU-02, HU-11:** probar en Android, terminar la estructura de la API y verificar el cifrado.
- **HU-16 Pruebas** (activa): hay 14 pruebas con `node:test`; faltan Jest y la colección Postman.
- **HU-17 Despliegue** (nueva): VPS, HTTPS y APK firmado.
- **HU-18 Pruebas de aceptación y manual de usuario** (nueva).
- **Otros:** modo oscuro y animaciones.

## Observaciones
- Se quitó del alcance el sitio público, el registro y el área de clientes. Las historias de cliente (catálogo, mis citas y cuestionario de salud) salen del tablero.
- Los endpoints están en `server/` del repositorio web y pasan 14 pruebas con el repositorio en memoria. Agendar para una clienta y las promociones están hoy solo en el modo local de la app; el servidor aún no tiene esos endpoints.
- El tablero original pedía MVVM, axios y Jest. Lo construido usa lib + hooks + pantallas, `fetch` y `node:test`.
- Los elementos eliminados están en la **Papelera** de Azure DevOps y se pueden restaurar.
