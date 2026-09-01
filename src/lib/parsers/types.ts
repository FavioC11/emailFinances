export interface ParsedTransaction {
  amount: number | null;
  counterparty: string | null;
  // Número de cuenta del destinatario, cuando el correo lo trae (transferencias)
  // — permite excluir transferencias entre cuentas propias del usuario.
  counterpartyAccount?: string | null;
  operation_no: string | null;
  occurred_at: string | null;
  direction: "ingreso" | "egreso";
  currency: string;
}

export type Parser = (text: string) => ParsedTransaction;
