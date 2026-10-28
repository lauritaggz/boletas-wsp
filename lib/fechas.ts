const TZ = "America/Santiago";

/** Fecha de hoy en Chile como { y, m, d, iso } (m de 1 a 12). */
export function hoyChile() {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()); // "2026-10-25"
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, iso };
}

export function ultimoDiaDelMes(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** ¿Le toca cierre hoy? dia_cierre null = último día del mes; 31 en febrero = último día. */
export function tocaCierre(diaCierre: number | null) {
  const { y, m, d } = hoyChile();
  const ultimo = ultimoDiaDelMes(y, m);
  const objetivo = diaCierre == null ? ultimo : Math.min(diaCierre, ultimo);
  return d === objetivo;
}

export const clp = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export function nombreMes(m: number, y: number) {
  const s = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
