"use client";

import { useCallback, useEffect, useState } from "react";

interface Exclusion {
  id: string;
  pattern: string;
  note: string | null;
  active: boolean;
}

const inputCls =
  "w-full rounded-lg border border-[var(--hairline)] bg-[var(--page)] px-3 py-2 text-sm";

export default function ExclusionsManager() {
  const [items, setItems] = useState<Exclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [pattern, setPattern] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/exclusions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setItems(data.exclusions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/exclusions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pattern: pattern.trim(), note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPattern("");
      setNote("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const patch = async (id: string, changes: Partial<Exclusion>) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/exclusions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (x: Exclusion) => {
    if (!confirm(`¿Eliminar la exclusión "${x.pattern}"?`)) return;
    setBusyId(x.id);
    setError(null);
    try {
      const res = await fetch(`/api/exclusions?id=${encodeURIComponent(x.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-[var(--egreso)] bg-[var(--surface)] px-4 py-3 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <h2 className="mb-1 text-sm font-medium text-[var(--ink-2)]">Excluir movimientos</h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Si el nombre de la <em>contraparte</em> de un movimiento contiene alguno de
          estos textos, no se registra. Útil para pagos que no son gasto real (p. ej.
          un gateway como <strong>ZiPago</strong> que solo mueve la tarjeta y el dinero
          vuelve). La coincidencia es parcial y no distingue mayúsculas.
        </p>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Texto a excluir
            <input
              required
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className={inputCls}
              placeholder="ej. zipago"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Nota (opcional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
              placeholder="por qué lo excluyes"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--surface)] disabled:opacity-50 sm:w-auto"
            >
              {creating ? "Agregando…" : "Agregar"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-sm font-medium text-[var(--ink-2)]">
          Exclusiones ({items.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--grid)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="py-2 pr-4">Texto</th>
                  <th className="py-2 pr-4">Nota</th>
                  <th className="py-2 pr-4">Activa</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((x) => {
                  const busy = busyId === x.id;
                  return (
                    <tr key={x.id} className="border-b border-[var(--grid)] align-top last:border-0">
                      <td className="py-2 pr-4 font-medium">{x.pattern}</td>
                      <td className="py-2 pr-4 text-xs text-[var(--ink-2)]">{x.note ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => patch(x.id, { active: !x.active })}
                          disabled={busy}
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            x.active
                              ? "bg-[var(--egreso)]/15 text-[var(--egreso)]"
                              : "border border-[var(--hairline)] text-[var(--muted)]"
                          } disabled:opacity-40`}
                        >
                          {x.active ? "Excluyendo" : "Inactiva"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap py-2 text-right">
                        <button
                          onClick={() => remove(x)}
                          disabled={busy}
                          className="rounded-md border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--egreso)] disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                      No hay exclusiones. Todo movimiento con monto se registra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
