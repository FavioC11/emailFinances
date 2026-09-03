"use client";

import type { Transaction } from "@/lib/types";
import { formatMoney, limaMonthKey, currentLimaMonthKey } from "@/lib/format";

export default function BalanceCard({
  transactions,
  filterActive = false,
}: {
  transactions: Transaction[];
  filterActive?: boolean;
}) {
  const now = new Date();
  // Mes en curso en hora Lima (no en la del reloj del servidor/navegador).
  const monthKey = currentLimaMonthKey();
  // Con filtro activo, las transacciones ya vienen filtradas: se resumen tal
  // cual. Sin filtro, se muestra el snapshot del mes en curso (comportamiento
  // por defecto). El mes se compara en hora Lima para no incluir/excluir por
  // error los movimientos nocturnos que en UTC caen en otro mes.
  const scoped = filterActive
    ? transactions
    : transactions.filter((t) => limaMonthKey(t.occurred_at) === monthKey);

  // Totales POR MONEDA: nunca se suman soles y dólares en un mismo número.
  // Y por TIPO: las transferencias no suman (plata que solo se mueve) y los
  // reembolsos NETEAN los egresos en vez de contar como ingreso nuevo.
  const byCurrency = new Map<string, { ingresos: number; egresos: number }>();
  for (const t of scoped) {
    const cur = t.currency || "PEN";
    const e = byCurrency.get(cur) ?? { ingresos: 0, egresos: 0 };
    if (t.tipo === "transferencia") {
      // no suma a ningún total
    } else if (t.tipo === "reembolso") {
      e.egresos -= Number(t.amount); // netea el gasto que cubre
    } else if (t.tipo === "ingreso") {
      e.ingresos += Number(t.amount);
    } else {
      // 'gasto'
      e.egresos += Number(t.amount);
    }
    byCurrency.set(cur, e);
  }
  // Soles primero; el resto alfabético. Si no hay nada, muestra PEN en cero.
  const currencies = [...byCurrency.keys()].sort((a, b) =>
    a === "PEN" ? -1 : b === "PEN" ? 1 : a.localeCompare(b)
  );
  if (currencies.length === 0) currencies.push("PEN");

  const monthName = now.toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });
  const scopeLabel = filterActive ? "filtrado" : monthName;

  return (
    <div className="flex flex-col gap-4">
      {currencies.map((cur) => {
        const { ingresos, egresos } = byCurrency.get(cur) ?? {
          ingresos: 0,
          egresos: 0,
        };
        const balance = ingresos - egresos;
        // Solo se rotula la moneda cuando hay más de una, para no ensuciar el
        // caso común (todo en soles).
        const curTag = currencies.length > 1 ? ` · ${cur}` : "";
        return (
          <section key={cur} className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Balance · {scopeLabel}
                {curTag}
              </p>
              <p
                className="mt-2 text-3xl font-semibold"
                style={{
                  color: balance >= 0 ? "var(--good-text)" : "var(--egreso)",
                }}
              >
                {formatMoney(balance, cur)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {filterActive ? "Ingresos · filtrado" : "Ingresos del mes"}
                {curTag}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatMoney(ingresos, cur)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {filterActive ? "Egresos · filtrado" : "Egresos del mes"}
                {curTag}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatMoney(egresos, cur)}
              </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
