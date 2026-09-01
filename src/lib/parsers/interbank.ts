import { parseSpanishDate } from "@/lib/dates";
import type { ParsedTransaction } from "./types";

// Interbank envía "Constancia de Pago Plin" cuando el usuario paga con Plin
// (a otra persona, a Yape, o a un tercero como una tarjeta) — siempre es egreso.
// OJO: hay 2 plantillas de correo. La nueva usa etiquetas sin ":" ("Monto y
// moneda", "Fecha y hora" explícito). La vieja usa etiquetas con ":", el orden
// invertido "Moneda y monto", y no tiene etiqueta "Fecha y hora" (la fecha va
// pegada justo debajo del título "Constancia de Pago Plin").
export function parseInterbankPlin(text: string): ParsedTransaction {
  const amount = text.match(
    /(?:Monto y moneda|Moneda y monto)\s*:?\s*S\/\s*([\d,]+\.\d{2})/i
  )?.[1];
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
    amount: amount ? Number(amount.replace(/,/g, "")) : null,
    counterparty,
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction: "egreso",
    currency: "PEN",
  };
}

// "Constancia de pago" (sin "Plin") — pago inmediato hacia una tarjeta de
// crédito Interbank desde una cuenta propia. Puede venir en soles o dólares.
export function parseInterbankPagoTarjeta(text: string): ParsedTransaction {
  const m = text.match(/Monto total\s*:?\s*(S\/\.?|US\$)\s*([\d,]+\.\d{2})/i);
  const operation_no =
    text.match(/C[óo]digo de operaci[óo]n\s*:?\s*(\d+)/i)?.[1] ?? null;
  const rawDate = text.match(
    /Fecha y hora\s*:?\s*(\d{1,2}\s+\w+\.?\s+\d{4}\s+\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i
  )?.[1];
  return {
    amount: m ? Number(m[2].replace(/,/g, "")) : null,
    counterparty: "Pago tarjeta de crédito Interbank",
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction: "egreso",
    currency: m?.[1]?.toUpperCase().startsWith("US") ? "USD" : "PEN",
  };
}

// "Constancia de transferencia" — transferencia a una cuenta de terceros o
// propia. OJO: hay una plantilla vieja (transferencias a cuenta propia) que
// usa "Cuenta destino" en vez de "Destinatario" y no tiene etiqueta "Fecha y
// hora" (la fecha va pegada debajo del título). Sin el fallback de "Cuenta
// destino", el regex terminaba enganchando la palabra "destinatario" del
// disclaimer legal del pie del correo ("Si usted no es el destinatario...").
export function parseInterbankTransferencia(text: string): ParsedTransaction {
  const m = text.match(/Moneda y monto\s*:?\s*(S\/\.?|US\$)\s*([\d,]+\.\d{2})/i);
  // El bloque "Destinatario"/"Cuenta destino" trae el nombre y, en la línea
  // siguiente, el número de cuenta — se capturan ambos para poder excluir
  // transferencias entre cuentas propias del usuario por número de cuenta.
  const destBlock = text.match(
    /(?:Destinatario|Cuenta destino)\s*:?\s*(.+?)\s*(?:Tipo de operaci[óo]n|Moneda y monto)/is
  )?.[1];
  const destLines = destBlock
    ? destBlock.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    : [];
  const counterparty = destLines[0] ?? null;
  const counterpartyAccount = destLines[1] ?? null;
  const operation_no =
    text.match(/C[óo]digo de operaci[óo]n\s*:?\s*(\d+)/i)?.[1] ?? null;
  const rawDate =
    text.match(
      /Fecha y hora\s*:?\s*(\d{1,2}\s+\w+\.?\s+\d{4}\s+\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i
    )?.[1] ??
    text.match(
      /Constancia de transferencia\s*(\d{1,2}\s+[a-záéíóúñ]+\.?\s+\d{4}\s+\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i
    )?.[1];
  return {
    amount: m ? Number(m[2].replace(/,/g, "")) : null,
    counterparty,
    counterpartyAccount,
    operation_no,
    occurred_at: rawDate ? parseSpanishDate(rawDate) : null,
    direction: "egreso",
    currency: m?.[1]?.toUpperCase().startsWith("US") ? "USD" : "PEN",
  };
}
