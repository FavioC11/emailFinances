import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Ventana para considerar dos movimientos como el mismo dinero moviéndose.
const MAX_DAYS = 3;
const MAX_MS = MAX_DAYS * 24 * 60 * 60 * 1000;

interface Row {
  id: string;
  direction: "ingreso" | "egreso";
  tipo: string;
  amount: number;
  currency: string;
  occurred_at: string;
  counterparty: string | null;
}

// GET /api/duplicates — pares candidatos a transferencia o reembolso: mismo
// monto y moneda, dirección OPUESTA (uno sale, otro entra) y a pocos días de
// distancia. Son la firma de "plata que solo se mueve" (pago a tu tarjeta) o de
// un reembolso. Solo se emparejan movimientos aún clasificados como gasto/ingreso
// (los ya marcados como transferencia/reembolso se ignoran).
export async function GET() {
  const { data, error } = await sbAdmin()
    .from("transactions")
    .select("id,direction,tipo,amount,currency,occurred_at,counterparty")
    .in("tipo", ["gasto", "ingreso"])
    .order("occurred_at", { ascending: false })
    .limit(1000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  // Agrupa por monto+moneda para no comparar todo contra todo.
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = `${r.currency}|${Number(r.amount).toFixed(2)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  const used = new Set<string>();
  const pairs: { egreso: Row; ingreso: Row; days: number }[] = [];
  for (const group of groups.values()) {
    const egresos = group.filter((r) => r.direction === "egreso");
    const ingresos = group.filter((r) => r.direction === "ingreso");
    for (const e of egresos) {
      if (used.has(e.id)) continue;
      // El ingreso más cercano en el tiempo, dentro de la ventana.
      let best: Row | null = null;
      let bestMs = Infinity;
      for (const i of ingresos) {
        if (used.has(i.id)) continue;
        const ms = Math.abs(
          new Date(e.occurred_at).getTime() - new Date(i.occurred_at).getTime()
        );
        if (ms <= MAX_MS && ms < bestMs) {
          best = i;
          bestMs = ms;
        }
      }
      if (best) {
        used.add(e.id);
        used.add(best.id);
        pairs.push({
          egreso: e,
          ingreso: best,
          days: Math.round(bestMs / (24 * 60 * 60 * 1000)),
        });
      }
    }
  }

  // Más recientes primero.
  pairs.sort(
    (a, b) =>
      new Date(b.egreso.occurred_at).getTime() -
      new Date(a.egreso.occurred_at).getTime()
  );

  return NextResponse.json({ pairs });
}
