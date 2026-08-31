"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import type { CategoryOption } from "@/lib/categories";
import BalanceCard from "@/components/BalanceCard";
import Charts from "@/components/Charts";
import TxTable from "@/components/TxTable";
import Filters, { type TxFilter } from "@/components/Filters";
import ManualEntryForm from "@/components/ManualEntryForm";
import AskAI from "@/components/AskAI";
import CategoryManager from "@/components/CategoryManager";
import SourcesManager from "@/components/SourcesManager";
import ExclusionsManager from "@/components/ExclusionsManager";

const EMPTY_FILTER: TxFilter = { from: "", to: "", category: "" };

type Tab = "dashboard" | "categorias" | "fuentes" | "exclusiones";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<TxFilter>(EMPTY_FILTER);

  const filterActive = Boolean(filter.from || filter.to || filter.category);

  // Filtro compartido por tarjetas, gráficas y tabla (fecha + categoría).
  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const day = t.occurred_at.slice(0, 10);
        if (filter.from && day < filter.from) return false;
        if (filter.to && day > filter.to) return false;
        if (
          filter.category &&
          (t.category ?? "Sin categoría") !== filter.category
        )
          return false;
        return true;
      }),
    [transactions, filter]
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setTransactions(data.transactions);
      setCategories(data.categories);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const errs = Object.values(
        data.sources as Record<string, { error?: string }>
      )
        .map((s) => s.error)
        .filter(Boolean);
      setSyncMsg(
        `Listo: ${data.inserted} nuevos, ${data.skipped} omitidos.` +
          (errs.length ? ` ⚠️ ${errs.join(" · ")}` : "")
      );
      await refresh();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Finanzas por Correo
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Yape y BCP leídos de tu correo, categorizados y listos para analizar.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={sync}
            disabled={syncing}
            className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--surface)] disabled:opacity-50"
          >
            {syncing ? "Actualizando…" : "Actualizar desde correo"}
          </button>
          {syncMsg && (
            <span className="max-w-xs text-right text-xs text-[var(--ink-2)]">
              {syncMsg}
            </span>
          )}
        </div>
      </header>

      <nav className="mb-8 flex gap-1 border-b border-[var(--grid)]">
        {([
          { key: "dashboard", label: "Dashboard" },
          { key: "categorias", label: "Categorías" },
          { key: "fuentes", label: "Fuentes" },
          { key: "exclusiones", label: "Exclusiones" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-[var(--ink)] text-[var(--ink)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink-2)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-6 rounded-lg border border-[var(--egreso)] bg-[var(--surface)] px-4 py-3 text-sm">
          <strong>Error:</strong> {error} — revisa que Supabase esté corriendo y
          que <code>.env.local</code> tenga las credenciales.
        </div>
      )}

      {tab === "categorias" ? (
        <CategoryManager onChanged={refresh} />
      ) : tab === "fuentes" ? (
        <SourcesManager />
      ) : tab === "exclusiones" ? (
        <ExclusionsManager />
      ) : loading ? (
        <p className="text-sm text-[var(--muted)]">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <BalanceCard transactions={filtered} filterActive={filterActive} />
          <Filters
            value={filter}
            onChange={setFilter}
            categories={categories}
            count={filtered.length}
          />
          <Charts transactions={filtered} categories={categories} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ManualEntryForm categories={categories} onSaved={refresh} />
            <AskAI />
          </div>
          <TxTable
            transactions={filtered}
            categories={categories}
            onChanged={refresh}
          />
        </div>
      )}
    </main>
  );
}
