import { parseSpanishDate } from "@/lib/dates";
import { matchMoney } from "./money";
import type { ParsedTransaction } from "./types";

// Interbank envía "Constancia de Pago Plin" cuando el usuario paga con Plin
// (a otra persona, a Yape, o a un tercero como una tarjeta) — siempre es egreso.
// OJO: hay 2 plantillas de correo. La nueva usa etiquetas sin ":" ("Monto y
// moneda", "Fecha y hora" explícito). La vieja usa etiquetas con ":", el orden
// invertido "Moneda y monto", y no tiene etiqueta "Fecha y hora" (la fecha va
// pegada justo debajo del título "Constancia de Pago Plin").
export function parseInterbankPlin(text: string): ParsedTransaction {
  const money = matchMoney(text, ["Monto y moneda", "Moneda y monto"]);
  const counterparty =
    text.match(/Destinatario\s*:?\s*(.+?)\s*Destino\s*:?/is)?.[1]?.trim() ?? null;
  const operation_no =
    text.match(/C[óo]digo de operaci[óo]n\s*:?\s*(\d+)/i)?.[1] ?? null;
  const rawDate =
    text.match(
      /Fecha y hora\s*:?\s*(\d{1,2}\s+\w+\.?\s+\d{4}\s+\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i
    )?.[1] ??
    text.match(
      /(\d{1,2}\s+[a-záéíóúñ]+\.?\s+\d{4}\s+\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i
    )?.[1];
  return {
    amount: money?.amount ?? null,
    counterparty,
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction: "egreso",
    currency: money?.currency ?? "PEN",
  };
}
