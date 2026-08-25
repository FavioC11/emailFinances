"use client";

import type { Transaction } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export default function BalanceCard({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTx = transactions.filter((t) => t.occurred_at.startsWith(monthKey));

  const ingresos = monthTx
    .filter((t) => t.direction === "ingreso")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const egresos = monthTx
    .filter((t) => t.direction === "egreso")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = ingresos - egresos;

  const monthName = now.toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Balance · {monthName}
        </p>
        <p
          className="mt-2 text-3xl font-semibold"
          style={{ color: balance >= 0 ? "var(--good-text)" : "var(--egreso)" }}
        >
          {formatMoney(balance)}
        </p>
      </div>
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Ingresos del mes
        </p>
        <p className="mt-2 text-3xl font-semibold">{formatMoney(ingresos)}</p>
      </div>
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Egresos del mes
        </p>
        <p className="mt-2 text-3xl font-semibold">{formatMoney(egresos)}</p>
      </div>
    </section>
  );
}
