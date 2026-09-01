"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { groupCategories, type CategoryOption } from "@/lib/categories";
import { formatDateTime, formatMoney } from "@/lib/format";

type SortKey = "fecha" | "detalle" | "categoria" | "origen" | "monto";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "fecha", label: "Fecha" },
  { key: "detalle", label: "Detalle" },
  { key: "categoria", label: "Categoría" },
  { key: "origen", label: "Origen" },
  { key: "monto", label: "Monto", align: "right" },
];

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
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "fecha",
    dir: "desc",
  });

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

  // Valor comparable por columna. El monto se ordena con signo (ingreso +,
  // egreso −) para que coincida con lo que se ve en la tabla.
  const sortValue = (t: Transaction, key: SortKey): string | number => {
    switch (key) {
      case "fecha":
        return t.occurred_at;
      case "detalle":
        return (t.counterparty ?? "").toLowerCase();
      case "categoria":
        return (t.category ?? "Sin categoría").toLowerCase();
      case "origen":
        return t.origin;
      case "monto":
        return (t.direction === "ingreso" ? 1 : -1) * Number(t.amount);
    }
  };

  const sorted = useMemo(() => {
    const arr = [...transactions];
    arr.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "es");
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [transactions, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : // fecha y monto arrancan descendente (lo más reciente / más grande
          // arriba); el texto arranca ascendente (A→Z).
          { key, dir: key === "fecha" || key === "monto" ? "desc" : "asc" }
    );
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
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={
                      active
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`py-2 ${col.align === "right" ? "text-right" : "pr-4"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-[var(--ink-2)] ${
                        col.align === "right" ? "flex-row-reverse" : ""
                      } ${active ? "text-[var(--ink-2)]" : ""}`}
                      title={`Ordenar por ${col.label.toLowerCase()}`}
                    >
                      {col.label}
                      <span aria-hidden="true" className="text-[0.65rem] leading-none">
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
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
            {sorted.map((t) => (
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
