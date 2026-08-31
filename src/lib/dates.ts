// Fechas en español ("17 de agosto de 2025 - 10:29 PM", "17 ago 2025 - 10:29 p. m.")
// → ISO 8601 con offset fijo de America/Lima (UTC-05:00, sin horario de verano).

const MONTHS: Record<string, string> = {
  enero: "01", ene: "01",
  febrero: "02", feb: "02",
  marzo: "03", mar: "03",
  abril: "04", abr: "04",
  mayo: "05", may: "05",
  junio: "06", jun: "06",
  julio: "07", jul: "07",
  agosto: "08", ago: "08",
  septiembre: "09", setiembre: "09", sep: "09", set: "09",
  octubre: "10", oct: "10",
  noviembre: "11", nov: "11",
  diciembre: "12", dic: "12",
};

const pad = (n: number) => String(n).padStart(2, "0");

// Busca hh:mm[:ss] + am/pm (si hay) en `s`, mirando solo lo que viene DESPUÉS
// de la hora para no confundir la "p" de "septiembre" con "p.m.".
function extractTime(s: string): { hour: number; minute: number; second: number } {
  let hour = 0;
  let minute = 0;
  let second = 0;
  const tm = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (tm) {
    hour = Number(tm[1]);
    minute = Number(tm[2]);
    second = tm[3] ? Number(tm[3]) : 0;

    const tail = s.slice((tm.index ?? 0) + tm[0].length);
    const isPm = /^\s*p\.?\s*m\.?/i.test(tail) || /^\s*pm\b/i.test(tail);
    const isAm = /^\s*a\.?\s*m\.?/i.test(tail) || /^\s*am\b/i.test(tail);
    if (isPm && hour < 12) hour += 12;
    if (isAm && hour === 12) hour = 0;
  }
  return { hour, minute, second };
}

export function parseSpanishDate(raw: string): string | null {
  const s = raw.toLowerCase().replace(/\s+/g, " ").trim();

  const dm = s.match(
    /(\d{1,2})\s*(?:del?\s+)?([a-záéíóúñ]+)\.?\s*,?\s*(?:del?\s+)?(\d{4})/
  );
  if (!dm) return null;
  const day = Number(dm[1]);
  const month = MONTHS[dm[2].replace(/\./g, "")];
  const year = Number(dm[3]);
  if (!month || day < 1 || day > 31) return null;

  const { hour, minute, second } = extractTime(s);
  return `${year}-${month}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}-05:00`;
}

// Fechas numéricas ("28/08/2026", "27/08/2026 a las 00:33:07") de bancos que
// no usan el nombre del mes en español.
export function parseSlashDate(raw: string): string | null {
  const s = raw.toLowerCase().trim();
  const dm = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!dm) return null;
  const day = Number(dm[1]);
  const month = Number(dm[2]);
  const year = Number(dm[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const { hour, minute, second } = extractTime(s);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}-05:00`;
}
