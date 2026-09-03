"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/format";

export default function TxTable({
  transactions,
  categories,
  onChanged,
}: {
  transactions: Transaction[];
  categories: string[];
  onChanged: () => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const day = t.occurred_at.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (category && (t.category ?? "Sin categoría") !== category) return false;
        return true;
      }),
    [transactions, from, to, category]
  );

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

  const deleteTx = async (id: string) => {
    if (!confirm("¿Eliminar este gasto registrado manualmente?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        alert(error || "No se pudo eliminar el movimiento.");
        return;
      }
      onChanged();
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls =
    "rounded-lg border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-sm";

  return (
    <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <h2 className="mr-auto text-sm font-medium text-[var(--ink-2)]">
          Movimientos ({filtered.length})
        </h2>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Desde
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Hasta
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--grid)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Detalle</th>
              <th className="py-2 pr-4">Categoría</th>
              <th className="py-2 pr-4">Origen</th>
              <th className="py-2 pr-4 text-right">Monto</th>
              <th className="py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  No hay movimientos con esos filtros.
                </td>
              </tr>
            )}
            {filtered.map((t) => (
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
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4 text-xs text-[var(--muted)]">
                  {t.origin === "manual" ? "Manual" : "Correo"}
                </td>
                <td
                  className="whitespace-nowrap py-2 pr-4 text-right font-medium tabular-nums"
                  style={{
                    color: t.direction === "ingreso" ? "var(--good-text)" : "var(--ink)",
                  }}
                >
                  {t.direction === "ingreso" ? "+" : "−"}
                  {formatMoney(Number(t.amount))}
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  {t.origin === "manual" && (
                    <button
                      type="button"
                      onClick={() => deleteTx(t.id)}
                      disabled={deletingId === t.id}
                      className="rounded-md border border-[var(--hairline)] px-2 py-1 text-xs text-[var(--egreso)] transition-colors hover:bg-[var(--egreso)]/10 disabled:opacity-50"
                      title="Eliminar gasto manual"
                    >
                      {deletingId === t.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
