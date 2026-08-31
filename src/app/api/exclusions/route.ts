import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const COLS = "id,pattern,note,active,created_at";

// GET /api/exclusions — lista de patrones de contraparte a excluir
export async function GET() {
  const { data, error } = await sbAdmin()
    .from("exclusions")
    .select(COLS)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ exclusions: data ?? [] });
}

interface ExclusionBody {
  id?: string;
  pattern?: string;
  note?: string | null;
  active?: boolean;
}

// POST /api/exclusions — crear exclusión
export async function POST(req: NextRequest) {
  const b = (await req.json()) as ExclusionBody;
  const pattern = b.pattern?.trim();
  if (!pattern) {
    return NextResponse.json({ error: "El patrón es obligatorio" }, { status: 400 });
  }
  const { data, error } = await sbAdmin()
    .from("exclusions")
    .insert({ pattern, note: b.note?.trim() || null, active: b.active ?? true })
    .select(COLS)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, exclusion: data });
}

// PATCH /api/exclusions — editar patrón, nota o activación
export async function PATCH(req: NextRequest) {
  const b = (await req.json()) as ExclusionBody;
  if (!b.id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if (b.pattern !== undefined) {
    const p = b.pattern.trim();
    if (!p) return NextResponse.json({ error: "El patrón no puede estar vacío" }, { status: 400 });
    update.pattern = p;
  }
  if (b.note !== undefined) update.note = b.note?.trim() || null;
  if (b.active !== undefined) update.active = b.active;

  const { data, error } = await sbAdmin()
    .from("exclusions")
    .update(update)
    .eq("id", b.id)
    .select(COLS)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, exclusion: data });
}

// DELETE /api/exclusions?id=... — eliminar exclusión
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }
  const { error } = await sbAdmin().from("exclusions").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
