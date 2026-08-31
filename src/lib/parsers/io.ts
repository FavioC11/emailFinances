import { parseSpanishDate } from "@/lib/dates";
import type { ParsedTransaction } from "./types";

export function parseIoServicio(text: string): ParsedTransaction {
  const amount = text.match(/Monto pagado\s*:?\s*S\/\s*([\d,]+\.\d{2})/i)?.[1];
  const counterparty = text.match(/Empresa\s*:?\s*(.+)/i)?.[1]?.trim() ?? null;
  const operation_no =
    text.match(/C[óo]digo de operaci[óo]n\s*:?\s*(\d+)/i)?.[1] ?? null;
  const fecha = text.match(/Fecha\s*:?\s*(.+)/i)?.[1] ?? "";
  const hora = text.match(/Hora\s*:?\s*(.+)/i)?.[1] ?? "";
  const rawDate = fecha ? `${fecha} ${hora}` : null;
  return {
    amount: amount ? Number(amount.replace(/,/g, "")) : null,
    counterparty,
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction: "egreso",
    currency: "PEN",
  };
}
