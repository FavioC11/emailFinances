import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

export const runtime = "nodejs";

// Disparo de ingesta desde el dashboard (botón "Actualizar desde correo").
// Sin secreto: mismo posture que /api/transactions y /api/categories, pensado
// para uso local de un solo usuario. Si algún día hay login/multiusuario,
// protéjelo con la sesión igual que el resto de la API.
export async function POST() {
  try {
    return NextResponse.json(await runIngest());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
