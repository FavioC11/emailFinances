"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime, formatMoney } from "@/lib/format";

interface Row {
  id: string;
  direction: "ingreso" | "egreso";
  amount: number;
  currency: string;
  occurred_at: string;
  counterparty: string | null;
}
interface Pair {
  egreso: Row;
  ingreso: Row;
  days: number;
}

// Panel "posibles duplicados": pares con mismo monto, dirección opuesta y pocos
// días de diferencia. El usuario los resuelve con un clic — marcarlos como
// transferencia (no suman) o como reembolso (netea el gasto).
export default function DuplicatesPanel({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/duplicates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPairs(data.pairs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
  };

  // Ambos lados son "plata que solo se mueve": se marcan transferencia.
  const markTransfer = async (p: Pair) => {
    setBusy(p.egreso.id);
    try {
      await patch(p.egreso.id, { tipo: "transferencia" });
      await patch(p.ingreso.id, { tipo: "transferencia" });
      await load();
      onChanged?.();
    } finally {
      setBusy(null);
    }
  };

  // El ingreso cubre el gasto: se vuelve reembolso atado a ese gasto.
  const markRefund = async (p: Pair) => {
    setBusy(p.egreso.id);
    try {
      await patch(p.ingreso.id, { tipo: "reembolso", vinculado_a: p.egreso.id });
      await load();
      onChanged?.();
    } finally {
      setBusy(null);
    }
  };

  const cardCls =
    "rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5";

  return (
    <section className={cardCls}>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="mr-auto text-sm font-medium text-[var(--ink-2)]">
          Posibles duplicados ({pairs.length})
        </h2>
        <button
          onClick={load}
          className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm text-[var(--ink-2)]"
        >
          Recargar
        </button>
      </div>

      <p className="mb-4 text-xs text-[var(--muted)]">
        Pares con el mismo monto, dirección opuesta y pocos días de diferencia —
        la firma de plata que solo se mueve (pago a tu tarjeta, transferencia
        entre tus cuentas) o de un reembolso. Clasifícalos para que dejen de
        inflar tus totales.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--egreso)] px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Buscando…</p>
      ) : pairs.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          No hay pares candidatos. Todo está clasificado. ✓
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pairs.map((p) => (
            <li
              key={`${p.egreso.id}-${p.ingreso.id}`}
              className="rounded-lg border border-[var(--hairline)] p-3"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <PairSide label="Sale (egreso)" row={p.egreso} sign="−" />
                <PairSide label="Entra (ingreso)" row={p.ingreso} sign="+" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="mr-auto text-xs text-[var(--muted)]">
                  {p.days === 0 ? "mismo día" : `${p.days} día(s) de diferencia`}
                </span>
                <button
                  disabled={busy === p.egreso.id}
                  onClick={() => markTransfer(p)}
                  className="rounded-lg bg-[var(--ink)] px-3 py-1.5 text-xs font-medium text-[var(--surface)] disabled:opacity-50"
                >
                  Es transferencia
                </button>
                <button
                  disabled={busy === p.egreso.id}
                  onClick={() => markRefund(p)}
                  className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-xs text-[var(--ink-2)] disabled:opacity-50"
                >
                  Es reembolso
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PairSide({
  label,
  row,
  sign,
}: {
  label: string;
  row: Row;
  sign: string;
}) {
  return (
    <div className="rounded-md bg-[var(--surface-2,transparent)] p-2 text-sm">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-medium tabular-nums">
        {sign}
        {formatMoney(Number(row.amount), row.currency)}
      </p>
      <p className="text-xs text-[var(--ink-2)]">
        {row.counterparty ?? "—"}
      </p>
      <p className="text-xs text-[var(--muted)]">
        {formatDateTime(row.occurred_at)}
      </p>
    </div>
  );
}
