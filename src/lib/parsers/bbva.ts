import { parseSpanishDate } from "@/lib/dates";
import { matchMoney } from "./money";
import type { ParsedTransaction } from "./types";

export function parseBbvaServicio(text: string): ParsedTransaction {
  const money = matchMoney(text, ["Importe pagado"]);
  const counterparty =
    text.match(/Nombre de servicio\s*:?\s*(.+)/i)?.[1]?.trim() ?? null;
  const operation_no =
    text.match(/N[úu]mero de operaci[óo]n\s*:?\s*(\d+)/i)?.[1] ?? null;
  const rawDate = text.match(
    /Fecha y hora de la operaci[óo]n\s*:?\s*(.+)/i
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
