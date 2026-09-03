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
      "id,source_key,direction,tipo,amount,currency,amount_pen,occurred_at,counterparty,category,operation_no,vinculado_a,origin,created_at"
    )
    .order("occurred_at", { ascending: false })
    .limit(1000);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  // Límites anclados a America/Lima (UTC-05:00). Sin el offset, Postgres
  // interpreta el "YYYY-MM-DD" como medianoche UTC y recorta los movimientos
  // nocturnos hacia el día/mes equivocado.
  if (from) query = query.gte("occurred_at", `${from}T00:00:00-05:00`);
  if (to) query = query.lte("occurred_at", `${to}T23:59:59-05:00`);
  if (category) query = query.eq("category", category);

  const [{ data: transactions, error }, { data: categories }] = await Promise.all([
    query,
    // Ordenadas por `orden` (prioridad de match) y luego por nombre; el front
    // las agrupa por `grupo` en los dropdowns.
    db.from("categories").select("name,grupo").order("orden").order("name"),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    transactions: transactions ?? [],
    categories: categories ?? [],
  });
}

// POST /api/transactions — ingreso manual
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    direction?: "ingreso" | "egreso";
    tipo?: string;
    amount?: number;
    currency?: string;
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
  // Solo se aceptan las monedas que la app maneja hoy.
  const currency = body.currency === "USD" ? "USD" : "PEN";
  // tipo válido; si no viene, se deriva de la dirección (egreso→gasto).
  const TIPOS = ["gasto", "ingreso", "transferencia", "reembolso"];
  const tipo = body.tipo && TIPOS.includes(body.tipo)
    ? body.tipo
    : body.direction === "ingreso"
    ? "ingreso"
    : "gasto";

  const { data, error } = await sbAdmin()
    .from("transactions")
    .insert({
      source_key: "manual",
      direction: body.direction,
      tipo,
      amount: body.amount,
      currency,
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

// PATCH /api/transactions — editar categoría, tipo o vínculo (reembolso→gasto)
export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string;
    category?: string;
    tipo?: string;
    // null desvincula; string ata el reembolso a un gasto.
    vinculado_a?: string | null;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.category !== undefined) update.category = body.category;
  if (body.tipo !== undefined) {
    const TIPOS = ["gasto", "ingreso", "transferencia", "reembolso"];
    if (!TIPOS.includes(body.tipo)) {
      return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
    }
    update.tipo = body.tipo;
    // Si deja de ser reembolso, se limpia el vínculo para no dejar basura.
    if (body.tipo !== "reembolso" && body.vinculado_a === undefined) {
      update.vinculado_a = null;
    }
  }
  if (body.vinculado_a !== undefined) update.vinculado_a = body.vinculado_a;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  }

  const { error } = await sbAdmin()
    .from("transactions")
    .update(update)
    .eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/transactions — eliminar un gasto registrado manualmente
export async function DELETE(req: NextRequest) {
  const body = (await req.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }
  // Solo se permiten borrar movimientos de origen manual; los que vienen del
  // correo son la fuente de verdad y no deben eliminarse desde la UI.
  const { error, count } = await sbAdmin()
    .from("transactions")
    .delete({ count: "exact" })
    .eq("id", body.id)
    .eq("origin", "manual");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json(
      { error: "No se encontró un movimiento manual con ese id" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
