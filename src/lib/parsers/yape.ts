import { parseSpanishDate } from "@/lib/dates";
import type { ParsedTransaction } from "./types";

export function parseYape(text: string): ParsedTransaction {
  const amount = text.match(/Monto de yapeo\s*S\/\s*([\d,]+\.\d{2})/i)?.[1]
    ?? text.match(/S\/\s*([\d,]+\.\d{2})/)?.[1];
  const counterparty =
    text.match(/Nombre del Beneficiario\s*(.+?)\s*N[ºo°]/is)?.[1]?.trim() ?? null;
  const operation_no =
    text.match(/N[ºo°]\s*de operaci[óo]n\s*(\d+)/i)?.[1] ?? null;
  const rawDate =
    text.match(/Fecha y Hora de la operaci[óo]n\s*(.+?)\s{2,}/i)?.[1]
    ?? text.match(/(\d{1,2}\s+\w+\s+\d{4}\s*-\s*[\d:]+\s*[ap]\.?\s*m\.?)/i)?.[1];
  const direction = /Acabas de yapear/i.test(text) ? "egreso" : "ingreso";
  return {
    amount: amount ? Number(amount.replace(/,/g, "")) : null,
    counterparty,
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction,
    currency: "PEN",
  };
}
