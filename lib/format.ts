/** Formato de moneda MXN: $1,690 (sin centavos si es entero, como en los carteles del spa). */
export function dinero(valor: number): string {
  const entero = Number.isInteger(valor);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: entero ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/** 150 → "2 h 30 min"; 60 → "1 h"; 45 → "45 min". */
export function duracion(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}
