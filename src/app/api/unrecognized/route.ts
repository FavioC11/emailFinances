import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const COLS =
  "id,source_key,email_id,reason,counterparty,snippet,resolved,created_at";

// GET /api/unrecognized — bandeja de correos que el parser no supo leer.
// Por defecto solo los pendientes; ?all=1 incluye los ya resueltos.
export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.get("all") === "1";
  let query = sbAdmin()
    .from("unrecognized")
    .select(COLS)
    .order("created_at", { ascending: false });
  if (!all) query = query.eq("resolved", false);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ unrecognized: data ?? [] });
}

// PATCH /api/unrecognized — marcar como revisado (resolved).
export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { id?: string; resolved?: boolean };
  if (!body.id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }
  const { error } = await sbAdmin()
    .from("unrecognized")
    .update({ resolved: body.resolved ?? true })
    .eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
