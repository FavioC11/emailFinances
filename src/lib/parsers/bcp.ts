import { parseSpanishDate } from "@/lib/dates";
import type { ParsedTransaction } from "./types";

export function parseBcp(text: string): ParsedTransaction {
  const amount =
    text.match(/Total de la operaci[óo]n\s*S\/\s*([\d,]+\.\d{2})/i)?.[1]
    ?? text.match(/operaci[óo]n de\s*S\/\s*([\d,]+\.\d{2})/i)?.[1];
  const counterparty =
    text.match(/Empresa\s*(.+?)\s*(?:Canal|N[úu]mero)/is)?.[1]?.trim() ?? null;
  const operation_no =
    text.match(/N[úu]mero de operaci[óo]n\s*(\d+)/i)?.[1] ?? null;
  const rawDate =
    text.match(/Fecha y hora\s*(\d{1,2} de \w+ de \d{4}\s*-\s*[\d:]+\s*[AP]\.?\s*M\.?)/i)?.[1];
  return {
    amount: amount ? Number(amount.replace(/,/g, "")) : null,
    counterparty,
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction: "egreso",
    currency: "PEN",
  };
}
