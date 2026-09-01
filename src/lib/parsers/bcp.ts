import { parseSpanishDate } from "@/lib/dates";
import { matchMoney, matchPen } from "./money";
import type { ParsedTransaction } from "./types";

export function parseBcp(text: string): ParsedTransaction {
  const money = matchMoney(text, [
    "Total de la operaci[óo]n",
    "Total del consumo",
    "Monto total",
    "(?:un\\s+)?consumo de",
    "operaci[óo]n de",
    "", // fallback: primer monto (S/ o US$) del correo
  ]);
  // Si el consumo es en dólares, el correo de BCP suele traer también el cargo
  // en soles: se captura para tener la conversión sin pedir tipo de cambio.
  const amount_pen =
    money && money.currency !== "PEN" ? matchPen(text) : null;
  const counterparty =
    text.match(/Empresa\s*:?\s*(.+?)\s*(?:Canal|N[úu]mero)/is)?.[1]?.trim()
    ?? text.match(/Empresa\s*:?\s*(.+)/i)?.[1]?.trim()
    ?? null;
  const operation_no =
    text.match(/N[úu]mero de operaci[óo]n\s*:?\s*(\d+)/i)?.[1] ?? null;
  const rawDate = text.match(/Fecha y hora\s*:?\s*(.+)/i)?.[1];
  return {
    amount: money?.amount ?? null,
    counterparty,
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction: "egreso",
    currency: money?.currency ?? "PEN",
    amount_pen,
  };
}
