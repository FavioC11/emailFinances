import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";
import { DEFAULT_CATEGORY } from "@/lib/categorize";

export const runtime = "nodejs";

// Normaliza el arreglo de keywords: trim, minúsculas, sin vacíos ni duplicados.
function cleanKeywords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const k = raw.trim().toLowerCase();
    if (k) seen.add(k);
  }
  return [...seen];
}

// GET /api/categories — lista con sus keywords
export async function GET() {
  const { data, error } = await sbAdmin()
    .from("categories")
    .select("id,name,keywords")
    .order("name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ categories: data ?? [] });
}

// POST /api/categories — crear categoría
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string; keywords?: unknown };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const { data, error } = await sbAdmin()
    .from("categories")
    .insert({ name, keywords: cleanKeywords(body.keywords) })
    .select("id,name,keywords")
    .single();
  if (error) {
    const msg = error.code === "23505" ? "Ya existe una categoría con ese nombre" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true, category: data });
}

// PATCH /api/categories — editar nombre y/o keywords
export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { id?: string; name?: string; keywords?: unknown };
  if (!body.id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }

  const update: { name?: string; keywords?: string[] } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    update.name = name;
  }
  if (body.keywords !== undefined) {
    update.keywords = cleanKeywords(body.keywords);
  }

  const { data, error } = await sbAdmin()
    .from("categories")
    .update(update)
    .eq("id", body.id)
    .select("id,name,keywords")
    .single();
  if (error) {
    const msg = error.code === "23505" ? "Ya existe una categoría con ese nombre" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true, category: data });
}

// DELETE /api/categories?id=... — eliminar categoría
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
  }

  const db = sbAdmin();
  const { data: cat } = await db.from("categories").select("name").eq("id", id).single();
  if (cat?.name === DEFAULT_CATEGORY) {
    return NextResponse.json(
      { error: `No se puede eliminar la categoría "${DEFAULT_CATEGORY}"` },
      { status: 400 }
    );
  }

  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Las transacciones que usaban esta categoría vuelven a la categoría por defecto.
  if (cat?.name) {
    await db
      .from("transactions")
      .update({ category: DEFAULT_CATEGORY })
      .eq("category", cat.name);
  }
  return NextResponse.json({ ok: true });
}
