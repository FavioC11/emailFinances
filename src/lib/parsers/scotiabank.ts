import { parseSlashDate } from "@/lib/dates";
import type { ParsedTransaction } from "./types";

// Scotiabank envía "Transferencia Plin" (enviada) y "Recepción Transferencia
// Plin" (recibida) desde el mismo remitente — la dirección se detecta por el
// texto, igual que yape.ts. La variante enviada no trae año en su fecha corta
// ("27 ago., 12:33 am"), así que se deja occurred_at en null y el ingest usa
// la fecha de recepción del correo como respaldo.
export function parseScotiabankPlin(text: string): ParsedTransaction {
  // El asunto dice "Recepción Transferencia Plin", pero el parser solo ve el
  // cuerpo del correo — ahí la pista es "recibido", no "Recepción".
  const isRecepcion = /recibido/i.test(text);
  const amount = isRecepcion
    ? text.match(/Monto recibido\s*:?\s*S\/\s*([\d,]+\.\d{2})/i)?.[1]
    : text.match(/Monto enviado\s*:?\s*S\/\s*([\d,]+\.\d{2})/i)?.[1];
  const counterparty = isRecepcion
    ? null
    : text.match(/Enviado a\s*:?\s*(.+)/i)?.[1]?.trim() ?? null;
  const operation_no =
    text.match(/N[úu]mero de operaci[óo]n\s*:?\s*([\d.]+)/i)?.[1] ?? null;
  const rawDate = text.match(
    /Fecha y hora\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4}[^\n]*)/i
  )?.[1];
  return {
    amount: amount ? Number(amount.replace(/,/g, "")) : null,
    counterparty,
    operation_no,
    occurred_at: rawDate ? parseSlashDate(rawDate) : null,
    direction: isRecepcion ? "ingreso" : "egreso",
    currency: "PEN",
  };
}

// Pago con QR — tampoco trae número de operación ni año en la fecha corta.
export function parseScotiabankQR(text: string): ParsedTransaction {
  const amount = text.match(/Monto\s*:?\s*S\/\s*([\d,]+\.\d{2})/i)?.[1];
  const counterparty = text.match(/Pagaste a\s*:?\s*(.+)/i)?.[1]?.trim() ?? null;
  return {
    amount: amount ? Number(amount.replace(/,/g, "")) : null,
    counterparty,
    operation_no: null,
    occurred_at: null,
    direction: "egreso",
    currency: "PEN",
  };
}
