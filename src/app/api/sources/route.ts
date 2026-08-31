import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const PLATFORMS = ["gmail", "outlook"] as const;
const DIRECTIONS = ["ingreso", "egreso"] as const;

const COLS = "id,key,name,platform,from_address,body_match,direction,parser_key,active";

// GET /api/sources — lista todas las fuentes configuradas
export async function GET() {
  const { data, error } = await sbAdmin()
    .from("sources")
    .select(COLS)
    .order("key");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sources: data ?? [] });
}

interface SourceBody {
  id?: string;
  key?: string;
  name?: string;
  platform?: string;
  from_address?: string;
  body_match?: string | null;
  direction?: string;
  parser_key?: string;
  active?: boolean;
}

function validate(b: SourceBody, partial: boolean): string | null {
  if (!partial || b.platform !== undefined) {
    if (!b.platform || !PLATFORMS.includes(b.platform as (typeof PLATFORMS)[number]))
      return "Buzón inválido (usa 'gmail' u 'outlook')";
  }
  if (!partial || b.direction !== undefined) {
    if (!b.direction || !DIRECTIONS.includes(b.direction as (typeof DIRECTIONS)[number]))
      return "Dirección inválida (usa 'ingreso' o 'egreso')";
  }
  return null;
}

// POST /api/sources — crear fuente
export async function POST(req: NextRequest) {
  const b = (await req.json()) as SourceBody;
  const key = b.key?.trim();
  const name = b.name?.trim();
  const from_address = b.from_address?.trim();
  const parser_key = b.parser_key?.trim();
  if (!key || !name || !from_address || !parser_key) {
    return NextResponse.json(
      { error: "key, name, from_address y parser_key son obligatorios" },
      { status: 400 }
    );
  }
  const invalid = validate(b, false);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const { data, error } = await sbAdmin()
    .from("sources")
    .insert({
      key,
      name,
      platform: b.platform,
      from_address,
      body_match: b.body_match?.trim() || null,
      direction: b.direction,
      parser_key,
      active: b.active ?? true,
    })
    .select(COLS)
    .single();
  if (error) {
    const msg = error.code === "23505" ? "Ya existe una fuente con esa clave (key)" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true, source: data });
}

// PATCH /api/sources — editar una fuente (buzón, remitente, activo, etc.)
export async function PATCH(req: NextRequest) {
  const b = (await req.json()) as SourceBody;
  if (!b.id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }
  const invalid = validate(b, true);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (b.name !== undefined) update.name = b.name.trim();
  if (b.platform !== undefined) update.platform = b.platform;
  if (b.from_address !== undefined) update.from_address = b.from_address.trim();
  if (b.body_match !== undefined) update.body_match = b.body_match?.trim() || null;
  if (b.direction !== undefined) update.direction = b.direction;
  if (b.parser_key !== undefined) update.parser_key = b.parser_key.trim();
  if (b.active !== undefined) update.active = b.active;

  const { data, error } = await sbAdmin()
    .from("sources")
    .update(update)
    .eq("id", b.id)
    .select(COLS)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, source: data });
}

// DELETE /api/sources?id=... — eliminar fuente (y su estado de sondeo)
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }
  const db = sbAdmin();
  const { data: src } = await db.from("sources").select("key").eq("id", id).single();
  const { error } = await db.from("sources").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Limpia el estado de sondeo incremental de esa fuente (las transacciones ya
  // registradas se conservan).
  if (src?.key) {
    await db.from("email_state").delete().eq("source_key", src.key);
  }
  return NextResponse.json({ ok: true });
}
