"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Transaction } from "@/lib/types";
import { formatMoney } from "@/lib/format";

const INGRESO = "#2a78d6";
const EGRESO = "#e34948";
// Orden fijo de la paleta categórica validada; el color sigue a la entidad
// (índice estable de la categoría), nunca a su ranking por monto.
const CAT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const UNCATEGORIZED_COLOR = "#898781";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function Charts({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: string[];
}) {
  const daily = useMemo(() => {
    const map = new Map<string, { ingresos: number; egresos: number }>();
    for (const t of transactions) {
      const key = dayKey(t.occurred_at);
      const entry = map.get(key) ?? { ingresos: 0, egresos: 0 };
      if (t.direction === "ingreso") entry.ingresos += Number(t.amount);
      else entry.egresos += Number(t.amount);
      map.set(key, entry);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, v]) => ({
        date: date.slice(5), // MM-DD
        ingresos: Number(v.ingresos.toFixed(2)),
        egresos: Number(v.egresos.toFixed(2)),
      }));
  }, [transactions]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.direction !== "egreso") continue;
      const cat = t.category ?? "Sin categoría";
      map.set(cat, (map.get(cat) ?? 0) + Number(t.amount));
    }
    return [...map.entries()].map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));
  }, [transactions]);

  const colorFor = (name: string) => {
    if (name === "Sin categoría") return UNCATEGORIZED_COLOR;
    const idx = categories.filter((c) => c !== "Sin categoría").indexOf(name);
    return idx >= 0 ? CAT_COLORS[idx % CAT_COLORS.length] : UNCATEGORIZED_COLOR;
  };

  const tooltipStyle = {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--hairline)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--ink)",
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-sm font-medium text-[var(--ink-2)]">
          Ingresos vs egresos por día
        </h2>
        {daily.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--muted)]">
            Sin datos todavía — corre la ingesta o agrega un movimiento manual.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                axisLine={{ stroke: "var(--baseline)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => formatMoney(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke={INGRESO}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="egresos"
                name="Egresos"
                stroke={EGRESO}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-sm font-medium text-[var(--ink-2)]">
          Egresos por categoría
        </h2>
        {byCategory.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--muted)]">
            Sin egresos registrados todavía.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                stroke="var(--surface)"
                strokeWidth={2}
                label={({ name, value }) =>
                  `${name}: ${formatMoney(Number(value))}`
                }
                labelLine={{ stroke: "var(--baseline)" }}
              >
                {byCategory.map((entry) => (
                  <Cell key={entry.name} fill={colorFor(entry.name)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => formatMoney(Number(value))}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
