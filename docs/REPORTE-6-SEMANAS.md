# Agua Marina Spa · Reporte de avance, semanas 1 a 6

Proyecto en Azure DevOps: `L23010301/AguaMarinaSpa`. La app móvil es **solo para la administradora**: agendar citas, ver reportes, agregar productos, inventario y promociones. El tablero queda en **25 elementos**: 7 épicas y 18 historias, sin features ni tareas sueltas. Cada historia lleva un código corto en el título (1.1 a 7.7); los IDs numéricos de Azure son automáticos y no se pueden cambiar. Lo que antes eran tareas ahora es una lista de verificación en la descripción de cada historia (✔ hecho · ⏳ en proceso · ☐ pendiente).

Estado: **9 historias cerradas, 7 activas y 2 nuevas.**

## Resumen

| Semana | Tema | Historias |
|---|---|---|
| 1 | Entorno y arquitectura | 7.1, 7.2 |
| 2 | Acceso y roles | 1.1, 1.2 |
| 3 | Catálogo de productos y servicios | 3.1 |
| 4 | Promociones y agendar citas | 3.2, 4.1 |
| 5 | Agenda, expediente, venta y seguridad | 4.2, 2.1, 5.1, 7.3 |
| 6 | Inventario, reportes y migración | 5.2, 6.1, 7.7 |

## Semana 1 · Entorno y arquitectura
- **7.1 Entorno de la app móvil** (activa).
  - ✔ Proyecto Expo / React Native creado.
  - ✔ Estructura de carpetas: `app/`, `lib/`, `hooks/`, `components/`, `constants/`.
  - ✔ Navegación con pila y pestañas.
  - ✔ Cliente HTTP con `fetch` y `EXPO_PUBLIC_API_URL`, en lugar de axios.
  - ⏳ Falta ejecutarlo en un dispositivo o emulador Android; el bundle ya compila.
- **7.2 API Node/Express y base de datos MySQL** (activa; se completa en las semanas 7 y 8).
  - ✔ Proyecto Express inicializado.
  - ✔ Script DDL con llaves e índices.
  - ⏳ Capas controllers/services, `mysql2` en vez de Sequelize y datos de prueba en MySQL.
- Se define el modelo de datos: usuario, servicio, producto, cita, venta, movimiento y promoción.

## Semana 2 · Acceso y roles
- **1.1 Login y cierre de sesión de la administradora** (cerrada). Pantalla de login con el diseño original, cierre de sesión y endpoints de login y logout.
- **1.2 Control de acceso por rol y perfil** (activa).
  - ✔ Middleware de token y de rol.
  - ✔ Todas las pantallas exigen sesión de administradora.
  - ✔ Pruebas de accesos permitidos y denegados.
  - ⏳ Falta editar el perfil; hoy solo existe `GET /auth/me`.

## Semana 3 · Catálogo
- **3.1 Gestión de catálogo: productos y servicios** (cerrada). Alta y edición, código de barras único y baja lógica.

## Semana 4 · Promociones y agendar citas
- **3.2 Promociones** (cerrada). Alta y edición (título, descripción, precio y precio anterior), servicio relacionado, fecha de vigencia y activar o desactivar sin borrar.
- **4.1 Agendar cita** (cerrada). La administradora agenda para una clienta con cuenta (por correo) o solo con nombre y teléfono. Horarios libres según la duración de los servicios, bloqueo de horario (una sola cabina) y 3 horarios alternativos si el elegido se ocupa.

## Semana 5 · Agenda, expediente, venta y seguridad
- **4.2 Agenda del día** (cerrada). Agenda por día, cierre de cita (Finalizada, No se presentó, Cancelar), parámetros de horario y margen de cancelación.
- **2.1 Expediente médico de la clienta** (cerrada). Se consulta desde la cita, solo con rol de administradora.
- **7.3 Seguridad** (activa).
  - ✔ Cifrado AES-256 del expediente.
  - ✔ Validación de entradas.
  - ⏳ Falta verificar el cifrado en una base MySQL real.
- **5.1 Punto de venta** (cerrada). Registro de venta atómico; si falta existencia en una línea, se rechaza toda la venta.

## Semana 6 · Inventario, reportes y migración
- **5.2 Inventario** (cerrada). Movimientos de entrada, salida y ajuste, descuento automático de stock con reversión ante error y alerta visual de stock mínimo.
- **6.1 Dashboard de reportes** (cerrada). Cancelaciones con tasa y motivos, productos y servicios más vendidos, comparación contra el periodo anterior o el año pasado.
- **7.7 Migración de la web a la app móvil** (activa).
  - ✔ Pantallas de administración migradas y login original.
  - ✔ Base local con AsyncStorage, gráficas con `react-native-svg` y pestañas.
  - ✔ `tsc`, `expo lint` y la compilación de Android pasan.
  - ⏳ Falta probar en un dispositivo o emulador.

## Pendiente para las semanas 7 y 8 (no se reporta)
- **5.3 Escaneo con cámara y alertas push** (activa): falta la cámara y Firebase Cloud Messaging; la alerta visual ya existe.
- **1.2:** editar el perfil.
- **7.1, 7.2, 7.3:** probar en Android, cerrar la capa MySQL y verificar el cifrado.
- **7.4 Pruebas** (activa): hay 14 pruebas con `node:test`; faltan Jest y la colección Postman.
- **7.5 Despliegue** (nueva): VPS, HTTPS y APK firmado.
- **7.6 Pruebas de aceptación y manual de usuario** (nueva).
- **Otros:** modo oscuro y animaciones.

## Observaciones
- Se quitó del alcance el sitio público, el registro y el área de clientes. Las historias de cliente (catálogo, mis citas y cuestionario de salud) salen del tablero.
- Los endpoints están en `server/` del repositorio web y pasan 14 pruebas con el repositorio en memoria. Agendar para una clienta y las promociones están hoy solo en el modo local de la app; el servidor aún no tiene esos endpoints.
- El tablero original pedía MVVM con Sequelize, axios y Jest. Lo construido usa lib + hooks + pantallas, `mysql2`, `fetch` y `node:test`.
- Los elementos eliminados están en la **Papelera** de Azure DevOps y se pueden restaurar.
