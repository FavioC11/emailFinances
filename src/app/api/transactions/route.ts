import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&category=Comida
// Lee vía service role en el servidor: en el MVP (un solo usuario, sin login)
// las filas ingresadas por el cron no tienen owner_id, así que el cliente
// anon con RLS no las vería. Con login real, cambiar a sbAnon + sesión.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const db = sbAdmin();

  let query = db
    .from("transactions")
    .select(
      "id,source_key,direction,amount,currency,occurred_at,counterparty,category,operation_no,origin,created_at"
    )
    .order("occurred_at", { ascending: false })
    .limit(1000);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", `${to}T23:59:59`);
  if (category) query = query.eq("category", category);

  const [{ data: transactions, error }, { data: categories }] = await Promise.all([
    query,
    db.from("categories").select("name").order("name"),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    transactions: transactions ?? [],
    categories: (categories ?? []).map((c) => c.name),
  });
}

// POST /api/transactions — ingreso manual
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    direction?: "ingreso" | "egreso";
    amount?: number;
    occurred_at?: string;
    counterparty?: string;
    category?: string;
  };
  if (!body.direction || !body.amount || body.amount <= 0) {
    return NextResponse.json(
      { error: "direction y amount (> 0) son obligatorios" },
      { status: 400 }
    );
  }

  const { data, error } = await sbAdmin()
    .from("transactions")
    .insert({
      source_key: "manual",
      direction: body.direction,
      amount: body.amount,
      currency: "PEN",
      occurred_at: body.occurred_at ?? new Date().toISOString(),
      counterparty: body.counterparty ?? null,
      category: body.category ?? "Sin categoría",
      operation_no: `manual-${Date.now()}`,
      origin: "manual",
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}

// PATCH /api/transactions — editar categoría inline
export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { id?: string; category?: string };
  if (!body.id || !body.category) {
    return NextResponse.json({ error: "id y category son obligatorios" }, { status: 400 });
  }
  const { error } = await sbAdmin()
    .from("transactions")
    .update({ category: body.category })
    .eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
