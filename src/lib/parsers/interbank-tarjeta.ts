import { parseSlashDate } from "@/lib/dates";
import type { ParsedTransaction } from "./types";

// Consumo con la tarjeta física Interbank (crédito/débito) — este correo no
// trae número de operación; ingest.ts usa el id del correo como respaldo
// para la deduplicación.
export function parseInterbankTarjeta(text: string): ParsedTransaction {
  const amount = text.match(/Monto\s*:?\s*S\/\.?\s*([\d,]+\.\d{2})/i)?.[1];
  const counterparty = text.match(/Comercio\s*:?\s*(.+)/i)?.[1]?.trim() ?? null;
  const fecha = text.match(/Fecha\s*:?\s*(.+)/i)?.[1] ?? "";
  const hora = text.match(/Hora\s*:?\s*(.+)/i)?.[1] ?? "";
  const rawDate = fecha ? `${fecha} ${hora}` : null;
  return {
    amount: amount ? Number(amount.replace(/,/g, "")) : null,
    counterparty,
    operation_no: null,
    occurred_at: rawDate ? parseSlashDate(rawDate) : null,
    direction: "egreso",
    currency: "PEN",
  };
}
