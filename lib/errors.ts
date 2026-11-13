/**
 * Error de "API" (mock o real). `status` conserva el código HTTP del diseño
 * (400 validación, 401 sin sesión, 403 sin permiso, 404, 409 conflicto, 429 rate limit)
 * para que el paso de mock → servidor real no cambie el manejo de errores en pantallas.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Datos extra útiles para la UI (horarios alternativos, campo con error…). */
    public detalle?: { campo?: string; alternativos?: string[]; [k: string]: unknown },
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
