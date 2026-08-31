import { parseSpanishDate } from "@/lib/dates";
import type { ParsedTransaction } from "./types";

export function parseBcp(text: string): ParsedTransaction {
  const amount =
    text.match(/Total de la operaci[óo]n\s*:?\s*S\/\s*([\d,]+\.\d{2})/i)?.[1]
    ?? text.match(/Total del consumo\s*:?\s*S\/\s*([\d,]+\.\d{2})/i)?.[1]
    ?? text.match(/Monto total\s*:?\s*S\/\s*([\d,]+\.\d{2})/i)?.[1]
    ?? text.match(/(?:un\s+)?consumo de\s*S\/\s*([\d,]+\.\d{2})/i)?.[1]
    ?? text.match(/operaci[óo]n de\s*S\/\s*([\d,]+\.\d{2})/i)?.[1]
    ?? text.match(/S\/\s*([\d,]+\.\d{2})/)?.[1]; // fallback: primer monto S/ del correo
  const counterparty =
    text.match(/Empresa\s*:?\s*(.+?)\s*(?:Canal|N[úu]mero)/is)?.[1]?.trim()
    ?? text.match(/Empresa\s*:?\s*(.+)/i)?.[1]?.trim()
    ?? null;
  const operation_no =
    text.match(/N[úu]mero de operaci[óo]n\s*:?\s*(\d+)/i)?.[1] ?? null;
  const rawDate = text.match(/Fecha y hora\s*:?\s*(.+)/i)?.[1];
  return {
    amount: amount ? Number(amount.replace(/,/g, "")) : null,
    counterparty,
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction: "egreso",
    currency: "PEN",
  };
}
