"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction } from "@/lib/types";
import BalanceCard from "@/components/BalanceCard";
import Charts from "@/components/Charts";
import TxTable from "@/components/TxTable";
import ManualEntryForm from "@/components/ManualEntryForm";
import AskAI from "@/components/AskAI";
import CategoryManager from "@/components/CategoryManager";

type Tab = "dashboard" | "categorias";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Finanzas por Correo
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Yape y BCP leídos de tu correo, categorizados y listos para analizar.
        </p>
      </header>

      <nav className="mb-8 flex gap-1 border-b border-[var(--grid)]">
        {([
          { key: "dashboard", label: "Dashboard" },
          { key: "categorias", label: "Categorías" },
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
      ) : loading ? (
        <p className="text-sm text-[var(--muted)]">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <BalanceCard transactions={transactions} />
          <Charts transactions={transactions} categories={categories} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ManualEntryForm categories={categories} onSaved={refresh} />
            <AskAI />
          </div>
          <TxTable
            transactions={transactions}
            categories={categories}
            onChanged={refresh}
          />
        </div>
      )}
    </main>
  );
}
