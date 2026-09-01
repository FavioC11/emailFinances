import type { Tipo } from "@/lib/types";

export interface ParsedTransaction {
  amount: number | null;
  counterparty: string | null;
  // Número de cuenta del destinatario, cuando el correo lo trae (transferencias)
  // — permite excluir transferencias entre cuentas propias del usuario.
  counterpartyAccount?: string | null;
  operation_no: string | null;
  occurred_at: string | null;
  direction: "ingreso" | "egreso";
  // Clasificación explícita cuando el correo permite distinguirla (p.ej. el
  // pago de tarjeta propia es "transferencia", no gasto). Si es null, ingest
  // la deriva de `direction` (egreso→gasto, ingreso→ingreso).
  tipo?: Tipo | null;
  currency: string;
  // Equivalente en soles cuando el movimiento es en otra moneda y el correo
  // ya trae la conversión (p.ej. consumo con tarjeta en US$ que muestra también
  // el cargo en S/). Null si es en soles o si el correo no lo trae.
  amount_pen?: number | null;
}

export type Parser = (text: string) => ParsedTransaction;
