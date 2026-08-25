export interface Transaction {
  id: string;
  source_key: string;
  direction: "ingreso" | "egreso";
  amount: number;
  currency: string;
  occurred_at: string;
  counterparty: string | null;
  category: string | null;
  operation_no: string | null;
  origin: "auto" | "manual";
  created_at: string;
}
