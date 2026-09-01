// Un formateador por moneda (cacheado). Antes se fijaba "PEN" y todo salía en
// S/ aunque el movimiento fuera en dólares; ahora el símbolo sigue a la moneda
// de cada movimiento.
const moneyFmts = new Map<string, Intl.NumberFormat>();
const moneyFmt = (currency: string) => {
  let fmt = moneyFmts.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat("es-PE", { style: "currency", currency });
    moneyFmts.set(currency, fmt);
  }
  return fmt;
};

export const formatMoney = (n: number, currency = "PEN") =>
  moneyFmt(currency).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });

// Día calendario en hora Lima como "YYYY-MM-DD". Supabase devuelve los
// timestamptz en UTC, así que un `.slice(0,10)` crudo agrupa por día UTC y
// hace saltar de mes los movimientos nocturnos (10:30 PM Lima → día siguiente).
// Este helper convierte a Lima ANTES de recortar, para que el filtrado y las
// agrupaciones coincidan con lo que muestra `formatDate`.
const limaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const limaDayKey = (iso: string) => limaDay.format(new Date(iso));

// Mes calendario en hora Lima como "YYYY-MM" (para el snapshot "mes en curso").
export const limaMonthKey = (iso: string) => limaDayKey(iso).slice(0, 7);

// "YYYY-MM" del mes actual en hora Lima (independiente del reloj del servidor).
export const currentLimaMonthKey = () => limaMonthKey(new Date().toISOString());
