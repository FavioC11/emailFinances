"use client";

import { useState } from "react";
import { groupCategories, type CategoryOption } from "@/lib/categories";
import type { Tipo } from "@/lib/types";

// La dirección (flujo de plata) se deriva del tipo elegido.
const DIRECTION_OF: Record<Tipo, "ingreso" | "egreso"> = {
  gasto: "egreso",
  ingreso: "ingreso",
  transferencia: "egreso", // caso común: pago a tu propia tarjeta
  reembolso: "ingreso", // te devuelven plata
};

export default function ManualEntryForm({
  categories,
  onSaved,
}: {
  categories: CategoryOption[];
  onSaved: () => void;
}) {
  const grouped = groupCategories(categories);
  const [tipo, setTipo] = useState<Tipo>("gasto");
  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [category, setCategory] = useState("Sin categoría");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          direction: DIRECTION_OF[tipo],
          tipo,
          currency,
          amount: Number(amount),
          occurred_at: occurredAt ? new Date(occurredAt).toISOString() : undefined,
          counterparty: counterparty || undefined,
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAmount("");
      setCounterparty("");
      setMessage("Movimiento guardado ✓");
      onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-[var(--hairline)] bg-[var(--page)] px-3 py-2 text-sm";

  return (
    <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
      <h2 className="mb-4 text-sm font-medium text-[var(--ink-2)]">
        Ingreso manual
      </h2>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
            className={inputCls}
          >
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
            <option value="transferencia">Transferencia (no suma)</option>
            <option value="reembolso">Reembolso (netea un gasto)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Moneda
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "PEN" | "USD")}
            className={inputCls}
          >
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dólares (US$)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Monto ({currency === "USD" ? "US$" : "S/"})
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
            placeholder="0.00"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Fecha y hora (vacío = ahora)
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Categoría
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
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
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)] sm:col-span-2">
          Detalle / contraparte
          <input
            type="text"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            className={inputCls}
            placeholder="Ej. Almuerzo con amigos"
          />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--surface)] disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          {message && <span className="text-xs text-[var(--ink-2)]">{message}</span>}
        </div>
      </form>
    </section>
  );
}
