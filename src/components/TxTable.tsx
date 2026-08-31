"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { groupCategories, type CategoryOption } from "@/lib/categories";
import { formatDateTime, formatMoney } from "@/lib/format";

export default function TxTable({
  transactions,
  categories,
  onChanged,
}: {
  transactions: Transaction[];
  categories: CategoryOption[];
  onChanged: () => void;
}) {
  const grouped = useMemo(() => groupCategories(categories), [categories]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const updateCategory = async (id: string, newCategory: string) => {
    setSavingId(id);
    try {
      await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, category: newCategory }),
      });
      onChanged();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <h2 className="mr-auto text-sm font-medium text-[var(--ink-2)]">
          Movimientos ({transactions.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--grid)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Detalle</th>
              <th className="py-2 pr-4">Categoría</th>
              <th className="py-2 pr-4">Origen</th>
              <th className="py-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  No hay movimientos con esos filtros.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-[var(--grid)] last:border-0">
                <td className="whitespace-nowrap py-2 pr-4 text-[var(--ink-2)]">
                  {formatDateTime(t.occurred_at)}
                </td>
                <td className="py-2 pr-4">
                  {t.counterparty ?? <span className="text-[var(--muted)]">—</span>}
                  <span className="ml-2 text-xs text-[var(--muted)]">{t.source_key}</span>
                </td>
                <td className="py-2 pr-4">
                  <select
                    value={t.category ?? "Sin categoría"}
                    disabled={savingId === t.id}
                    onChange={(e) => updateCategory(t.id, e.target.value)}
                    className="rounded-md border border-[var(--hairline)] bg-transparent px-2 py-1 text-xs"
                  >
                    {grouped.map((g) => (
                      <optgroup key={g.grupo} label={g.grupo}>
                        {g.items.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4 text-xs text-[var(--muted)]">
                  {t.origin === "manual" ? "Manual" : "Correo"}
                </td>
                <td
                  className="whitespace-nowrap py-2 text-right font-medium tabular-nums"
                  style={{
                    color: t.direction === "ingreso" ? "var(--good-text)" : "var(--ink)",
                  }}
                >
                  {t.direction === "ingreso" ? "+" : "−"}
                  {formatMoney(Number(t.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
