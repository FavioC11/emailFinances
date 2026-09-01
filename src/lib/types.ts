export type Tipo = "gasto" | "ingreso" | "transferencia" | "reembolso";

export interface Transaction {
  id: string;
  source_key: string;
  direction: "ingreso" | "egreso";
  tipo: Tipo;
  amount: number;
  currency: string;
  amount_pen: number | null;
  occurred_at: string;
  counterparty: string | null;
  category: string | null;
  operation_no: string | null;
  vinculado_a: string | null;
  origin: "auto" | "manual";
  created_at: string;
}
