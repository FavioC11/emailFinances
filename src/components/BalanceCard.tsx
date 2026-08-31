"use client";

import type { Transaction } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export default function BalanceCard({
  transactions,
  filterActive = false,
}: {
  transactions: Transaction[];
  filterActive?: boolean;
}) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Con filtro activo, las transacciones ya vienen filtradas: se resumen tal
  // cual. Sin filtro, se muestra el snapshot del mes en curso (comportamiento
  // por defecto).
  const scoped = filterActive
    ? transactions
    : transactions.filter((t) => t.occurred_at.startsWith(monthKey));

  const ingresos = scoped
    .filter((t) => t.direction === "ingreso")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const egresos = scoped
    .filter((t) => t.direction === "egreso")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = ingresos - egresos;

  const monthName = now.toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });
  const scopeLabel = filterActive ? "filtrado" : monthName;

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Balance · {scopeLabel}
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
          {filterActive ? "Ingresos · filtrado" : "Ingresos del mes"}
        </p>
        <p className="mt-2 text-3xl font-semibold">{formatMoney(ingresos)}</p>
      </div>
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          {filterActive ? "Egresos · filtrado" : "Egresos del mes"}
        </p>
        <p className="mt-2 text-3xl font-semibold">{formatMoney(egresos)}</p>
      </div>
    </section>
  );
}
