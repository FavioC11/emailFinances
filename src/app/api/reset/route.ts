import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Vacía los DATOS de movimientos para empezar de cero: transactions,
// unrecognized y email_state. Al borrar email_state, la próxima ingesta
// re-descarga todo el historial de correos y lo reclasifica con la lógica
// vigente. NO toca configuración (sources, categories, exclusions).
//
// Sin secreto: mismo posture que /api/sync y el resto de la API, pensado para
// uso local de un solo usuario. Si algún día hay login/multiusuario, protégelo
// con la sesión igual que los demás endpoints.
//
// email_state usa source_key como PK (no tiene id); las otras dos tienen id
// uuid. El sentinel del filtro nunca existe, así que el .neq() borra todo.
const TABLES: Array<{ name: string; keyCol: string; sentinel: string }> = [
  { name: "transactions", keyCol: "id", sentinel: "00000000-0000-0000-0000-000000000000" },
  { name: "unrecognized", keyCol: "id", sentinel: "00000000-0000-0000-0000-000000000000" },
  { name: "email_state", keyCol: "source_key", sentinel: "__none__" },
];

export async function POST() {
  try {
    const db = sbAdmin();
    const deleted: Record<string, number> = {};
    for (const t of TABLES) {
      // count antes de borrar para reportar cuántas filas se eliminaron.
      const { count } = await db
        .from(t.name)
        .select("*", { count: "exact", head: true });
      const { error } = await db.from(t.name).delete().neq(t.keyCol, t.sentinel);
      if (error) throw new Error(`${t.name}: ${error.message}`);
      deleted[t.name] = count ?? 0;
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
