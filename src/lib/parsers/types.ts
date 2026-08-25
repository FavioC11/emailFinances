export interface ParsedTransaction {
  amount: number | null;
  counterparty: string | null;
  operation_no: string | null;
  occurred_at: string | null;
  direction: "ingreso" | "egreso";
  currency: string;
}

export type Parser = (text: string) => ParsedTransaction;
