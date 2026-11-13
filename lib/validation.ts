/**
 * Validaciones de formularios. Reflejan las reglas de las tablas "Detalle de
 * campos" del documento de diseño (sección 8). Son validaciones de COMODIDAD
 * (respuesta inmediata en pantalla); la validación definitiva siempre la hace la
 * API (ver lib/api.ts), tal como indica el diseño.
 */

const SOLO_LETRAS = /^[\p{L}\s'’-]+$/u;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Errores<T extends string = string> = Partial<Record<T, string>>;

export function validarNombre(valor: string, etiqueta: string): string | undefined {
  const v = valor.trim();
  if (!v) return `${etiqueta} es obligatorio.`;
  if (v.length > 60) return `${etiqueta} admite máximo 60 caracteres.`;
  if (!SOLO_LETRAS.test(v)) return `${etiqueta} solo admite letras, espacios, guion y apóstrofo.`;
}

export function validarCorreo(valor: string): string | undefined {
  const v = valor.trim();
  if (!v) return 'El correo es obligatorio.';
  if (v.length > 120) return 'El correo admite máximo 120 caracteres.';
  if (!CORREO.test(v)) return 'Escribe un correo válido (ej. hola@ejemplo.com).';
}

export function validarTelefono(valor: string): string | undefined {
  const v = valor.trim();
  if (!v) return undefined; // opcional
  if (!/^\d{1,15}$/.test(v)) return 'El teléfono solo admite dígitos (máximo 15).';
}

/** Política propuesta en el diseño: mínimo 8 caracteres con letras y números. */
export function validarPassword(valor: string): string | undefined {
  if (!valor) return 'La contraseña es obligatoria.';
  if (valor.length < 8 || !/[A-Za-z]/.test(valor) || !/\d/.test(valor)) {
    return 'Mínimo 8 caracteres, con letras y números.';
  }
}

/** Campos del cuestionario: no vacíos ("Ninguna" es válido) y máx. 500. */
export function validarTextoObligatorio(valor: string, etiqueta: string, max = 500): string | undefined {
  const v = valor.trim();
  if (!v) return `${etiqueta}: si no aplica, escribe "Ninguna".`;
  if (v.length > max) return `${etiqueta} admite máximo ${max} caracteres.`;
}

export function validarPrecio(valor: string): string | undefined {
  if (valor.trim() === '') return 'El precio es obligatorio.';
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return 'El precio debe ser un número mayor o igual a 0.';
}

export function validarEntero(valor: string, etiqueta: string, min = 0): string | undefined {
  if (valor.trim() === '') return `${etiqueta} es obligatorio.`;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min) return `${etiqueta} debe ser un entero mayor o igual a ${min}.`;
}

export function hayErrores(errores: Errores): boolean {
  return Object.values(errores).some(Boolean);
}
