export interface ParsedTransaction {
  amount: number | null;
  counterparty: string | null;
  operation_no: string | null;
  occurred_at: string | null;
  direction: "ingreso" | "egreso";
  currency: string;
  // Equivalente en soles cuando el movimiento es en otra moneda y el correo
  // ya trae la conversión (p.ej. consumo con tarjeta en US$ que muestra también
  // el cargo en S/). Null si es en soles o si el correo no lo trae.
  amount_pen?: number | null;
}

export type Parser = (text: string) => ParsedTransaction;
