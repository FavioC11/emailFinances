"use client";

import { useMemo } from "react";
import { groupCategories, type CategoryOption } from "@/lib/categories";

export interface TxFilter {
  from: string;
  to: string;
  category: string;
}

// Barra de filtros global: fecha y categoría. Afecta a gráficas y tabla.
export default function Filters({
  value,
  onChange,
  categories,
  count,
}: {
  value: TxFilter;
  onChange: (next: TxFilter) => void;
  categories: CategoryOption[];
  count: number;
}) {
  const grouped = useMemo(() => groupCategories(categories), [categories]);
  const active = value.from || value.to || value.category;

  const inputCls =
    "rounded-lg border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-sm";

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-4">
      <span className="mr-auto text-sm font-medium text-[var(--ink-2)]">
        Filtros — {count} movimiento{count === 1 ? "" : "s"}
      </span>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Desde
        <input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Hasta
        <input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Categoría
        <select
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
          className={inputCls}
        >
          <option value="">Todas</option>
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
      </label>
      {active && (
        <button
          onClick={() => onChange({ from: "", to: "", category: "" })}
          className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm text-[var(--ink-2)]"
        >
          Limpiar
        </button>
      )}
    </section>
  );
}
