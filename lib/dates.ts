/**
 * Utilidades de fecha/hora. Todo se maneja en HORA LOCAL del navegador (la clínica
 * y sus clientes están en la misma zona: Zamora, Michoacán) y se serializa en ISO.
 * Se centraliza aquí para no repetir cálculos de fechas en las pantallas.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-12" (clave de día, sin zona horaria). */
export function claveDia(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Construye una fecha local desde clave de día + "HH:MM". */
export function desdeClaveYHora(clave: string, hhmm: string): Date {
  const [y, m, d] = clave.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function sumarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

export function sumarMinutos(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000);
}

export function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function mismoDia(a: Date, b: Date): boolean {
  return claveDia(a) === claveDia(b);
}

const fmtFechaLarga = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const fmtFechaCorta = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export const formatoFechaLarga = (d: Date | string) => fmtFechaLarga.format(new Date(d));
export const formatoFechaCorta = (d: Date | string) => fmtFechaCorta.format(new Date(d));

/** "Jue 12 nov · 11:30 – 12:30" (formato de la figura 8.5 del diseño). */
export function formatoRango(inicioIso: string, finIso: string): string {
  const i = new Date(inicioIso);
  const f = new Date(finIso);
  return `${formatoFechaCorta(i)} · ${hhmm(i)} – ${hhmm(f)}`;
}

/** Días disponibles para el selector de fecha (hoy + N días). */
export function proximosDias(cantidad: number, desde = new Date()): Date[] {
  const base = inicioDelDia(desde);
  return Array.from({ length: cantidad }, (_, i) => sumarDias(base, i));
}
